'use strict';

const fs = require('node:fs/promises');
const fsConstants = require('node:fs').constants;
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const {
  findAlphaBounds,
  inspectImage,
  prepareWatermark,
  stripMetadataFromFile,
} = require('../engine/image-engine');
const {
  PRINT_REGION_ASPECT_WIDTH,
  PRINT_REGION_ASPECT_HEIGHT,
  SingleMockupRegionError,
  getRegionFromDocument,
  templateDescriptor,
  validateNormalizedPrintRegion,
} = require('./single-mockup-regions');
const {
  mapWithConcurrency,
  createConcurrencyLimiter,
  memoizeBounded,
} = require('./bounded-work');

const SINGLE_MOCKUP_TEMPLATE_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
]);
const TEMPLATE_EXTENSION_SET = new Set(SINGLE_MOCKUP_TEMPLATE_EXTENSIONS);
const SUPPORTED_SHARP_FORMATS = new Set(['png', 'jpeg', 'webp', 'tiff']);
const MAX_OUTPUT_REVISIONS = 10000;
const DEFAULT_SINGLE_MOCKUP_PREFIX = 'single';
const DEFAULT_OUTPUT_CONCURRENCY = 2;
const DEFAULT_TRANSFORM_CONCURRENCY = 4;
const DEFAULT_METADATA_CONCURRENCY = 2;
const MAX_DESIGN_CACHE_ENTRIES = 64;
const REMOVED_METADATA_GROUPS = Object.freeze([
  'Comment',
  'EXIF',
  'XMP',
  'EXIF thumbnail',
  'IPTC',
  'ICC profile',
]);

class SingleMockupError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SingleMockupError';
    this.code = code;
    Object.assign(this, details);
  }
}

class SingleMockupCancelledError extends SingleMockupError {
  constructor() {
    super('Đã huỷ thao tác tạo mockup đơn.', 'CANCELLED');
    this.name = 'SingleMockupCancelledError';
  }
}

function throwIfCancelled(isCancelled) {
  if (typeof isCancelled === 'function' && isCancelled()) {
    throw new SingleMockupCancelledError();
  }
}

function normalizeConcurrency(value, fallback, optionName, maximum = 8) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > maximum) {
    throw new SingleMockupError(
      `${optionName} phải là số nguyên từ 1 đến ${maximum}.`,
      'INVALID_SINGLE_MOCKUP_CONCURRENCY',
      { optionName },
    );
  }
  return number;
}

function fileSystemKey(filePath) {
  const resolved = path.resolve(String(filePath));
  return process.platform === 'win32'
    ? resolved.toLocaleLowerCase('en-US')
    : resolved;
}

function createRenderingCaches(transformConcurrency = DEFAULT_TRANSFORM_CONCURRENCY) {
  return {
    visibility: new Map(),
    designs: new Map(),
    watermarks: new Map(),
    runTransform: createConcurrencyLimiter(transformConcurrency),
  };
}

function normalizeDirectory(directoryPath, optionName) {
  if (typeof directoryPath !== 'string' || directoryPath.trim().length === 0) {
    throw new SingleMockupError(`Thiếu ${optionName}.`, 'MISSING_DIRECTORY', { optionName });
  }
  return path.resolve(directoryPath);
}

function templateNameIncludesMarker(fileName, marker) {
  if (marker === undefined || marker === null || String(marker).trim() === '') return true;
  const normalizedMarker = String(marker).normalize('NFC').trim().toLocaleLowerCase('en-US');
  const stem = path.basename(String(fileName), path.extname(String(fileName)))
    .normalize('NFC')
    .toLocaleLowerCase('en-US');
  return stem.includes(normalizedMarker);
}

async function listSingleMockupTemplates(inputDirectory, options = {}) {
  const { ignoreInvalid = false, warnings = [], templateMarker = null } = options;
  if (!Array.isArray(warnings)) {
    throw new TypeError('warnings phải là một mảng.');
  }
  const resolvedDirectory = normalizeDirectory(inputDirectory, 'inputDirectory');
  let entries;
  try {
    entries = await fs.readdir(resolvedDirectory, { withFileTypes: true });
  } catch (error) {
    throw new SingleMockupError(
      `Không thể đọc thư mục Input: ${error.message}`,
      'READ_INPUT_DIRECTORY_FAILED',
      { inputDirectory: resolvedDirectory, cause: error },
    );
  }

  const candidates = entries
    .filter((entry) => entry.isFile() &&
      TEMPLATE_EXTENSION_SET.has(path.extname(entry.name).toLowerCase()) &&
      templateNameIncludesMarker(entry.name, templateMarker))
    .sort((left, right) =>
      left.name.localeCompare(right.name, 'vi', { numeric: true, sensitivity: 'base' }),
    );

  const templates = [];
  const seenKeys = new Set();
  for (const entry of candidates) {
    const filePath = path.join(resolvedDirectory, entry.name);
    let metadata;
    let stat;
    try {
      [metadata, stat] = await Promise.all([inspectImage(filePath), fs.stat(filePath)]);
    } catch (error) {
      if (ignoreInvalid) {
        warnings.push({
          name: entry.name,
          path: filePath,
          code: 'INVALID_SINGLE_MOCKUP_TEMPLATE',
          message: `Không thể đọc ảnh mockup “${entry.name}”: ${error.message}`,
        });
        continue;
      }
      throw new SingleMockupError(
        `Không thể đọc ảnh mockup “${entry.name}”: ${error.message}`,
        'INVALID_SINGLE_MOCKUP_TEMPLATE',
        { filePath, cause: error },
      );
    }
    if (!SUPPORTED_SHARP_FORMATS.has(metadata.format)) {
      if (ignoreInvalid) {
        warnings.push({
          name: entry.name,
          path: filePath,
          code: 'UNSUPPORTED_SINGLE_MOCKUP_TEMPLATE',
          message: `Ảnh mockup “${entry.name}” không thuộc định dạng PNG, JPG, WEBP hoặc TIFF.`,
        });
        continue;
      }
      throw new SingleMockupError(
        `Ảnh mockup “${entry.name}” không thuộc định dạng PNG, JPG, WEBP hoặc TIFF.`,
        'UNSUPPORTED_SINGLE_MOCKUP_TEMPLATE',
        { filePath, format: metadata.format },
      );
    }
    // Sharp reports the stored pixel matrix in width/height and the dimensions
    // after applying EXIF Orientation in autoOrient. The editor and renderer
    // must use the same, visually-correct coordinate system.
    const orientedWidth = metadata.autoOrient?.width || metadata.width;
    const orientedHeight = metadata.autoOrient?.height || metadata.height;
    const descriptor = templateDescriptor({
      name: entry.name,
      path: filePath,
      width: orientedWidth,
      height: orientedHeight,
    });
    if (seenKeys.has(descriptor.key)) {
      throw new SingleMockupError(
        `Có nhiều ảnh mockup trùng tên “${entry.name}”.`,
        'DUPLICATE_SINGLE_MOCKUP_TEMPLATE',
        { filePath },
      );
    }
    seenKeys.add(descriptor.key);
    templates.push({
      path: filePath,
      name: entry.name,
      size: stat.size,
      width: orientedWidth,
      height: orientedHeight,
      format: metadata.format,
      density: metadata.density || null,
    });
  }
  return templates;
}

function uniqueSourcePaths(sourcePaths) {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
    throw new SingleMockupError(
      'Cần chọn ít nhất một file PNG để tạo mockup đơn.',
      'NO_SINGLE_MOCKUP_SOURCES',
    );
  }
  const unique = [];
  const seen = new Set();
  for (const sourcePath of sourcePaths) {
    if (typeof sourcePath !== 'string' || sourcePath.trim().length === 0) {
      throw new SingleMockupError('Danh sách PNG nguồn không hợp lệ.', 'INVALID_SOURCE_PATH');
    }
    const resolvedPath = path.resolve(sourcePath);
    if (path.extname(resolvedPath).toLowerCase() !== '.png') {
      throw new SingleMockupError(
        `“${path.basename(resolvedPath)}” không phải file PNG.`,
        'SINGLE_MOCKUP_SOURCE_NOT_PNG',
        { filePath: resolvedPath },
      );
    }
    const key = process.platform === 'win32'
      ? resolvedPath.toLocaleLowerCase('en-US')
      : resolvedPath;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(resolvedPath);
    }
  }
  return unique;
}

function randomIndex(maxExclusive, random) {
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new SingleMockupError(
      'Bộ sinh số ngẫu nhiên phải trả về giá trị từ 0 (bao gồm) đến 1 (không bao gồm).',
      'INVALID_RANDOM_VALUE',
    );
  }
  return Math.floor(value * maxExclusive);
}

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1, random);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function selectRandomSourcePngs(sourcePaths, count, random = Math.random) {
  const selectionCount = Number(count);
  if (!Number.isInteger(selectionCount) || selectionCount < 0) {
    throw new SingleMockupError(
      'Số PNG cần chọn phải là số nguyên không âm.',
      'INVALID_SOURCE_SELECTION_COUNT',
    );
  }
  if (typeof random !== 'function') {
    throw new TypeError('random phải là một hàm.');
  }
  if (selectionCount === 0) return [];
  const unique = uniqueSourcePaths(sourcePaths);

  const selected = [];
  while (selected.length < selectionCount) {
    const cycle = shuffle(unique, random);
    if (
      unique.length > 1 && selected.length > 0 &&
      selected[selected.length - 1] === cycle[0]
    ) {
      [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    }
    selected.push(...cycle.slice(0, selectionCount - selected.length));
  }
  return selected;
}

async function validateSourcePngPaths(sourcePaths, isCancelled) {
  const unique = uniqueSourcePaths(sourcePaths);
  for (const sourcePath of unique) {
    throwIfCancelled(isCancelled);
    let metadata;
    try {
      metadata = await inspectImage(sourcePath);
    } catch (error) {
      throw new SingleMockupError(
        `Không thể đọc PNG nguồn “${path.basename(sourcePath)}”: ${error.message}`,
        'INVALID_SINGLE_MOCKUP_SOURCE',
        { filePath: sourcePath, cause: error },
      );
    }
    if (metadata.format !== 'png') {
      throw new SingleMockupError(
        `“${path.basename(sourcePath)}” không phải PNG hợp lệ.`,
        'SINGLE_MOCKUP_SOURCE_NOT_PNG',
        { filePath: sourcePath, format: metadata.format },
      );
    }
    throwIfCancelled(isCancelled);
  }
  return unique;
}

function calculatePixelPrintRegion(region, template) {
  const normalized = validateNormalizedPrintRegion(region, template);
  const rawLeft = normalized.x * template.width;
  const rawTop = normalized.y * template.height;
  const rawWidth = normalized.width * template.width;
  const rawHeight = normalized.height * template.height;
  const unit = Math.floor(Math.min(
    rawWidth / PRINT_REGION_ASPECT_WIDTH,
    rawHeight / PRINT_REGION_ASPECT_HEIGHT,
  ) + 1e-9);
  if (unit < 1) {
    throw new SingleMockupRegionError(
      'Vùng in quá nhỏ; kích thước tối thiểu là 7x8 pixel.',
      'PRINT_REGION_TOO_SMALL',
    );
  }

  const width = unit * PRINT_REGION_ASPECT_WIDTH;
  const height = unit * PRINT_REGION_ASPECT_HEIGHT;
  const left = Math.max(0, Math.min(
    template.width - width,
    Math.round(rawLeft + (rawWidth - width) / 2),
  ));
  const top = Math.max(0, Math.min(
    template.height - height,
    Math.round(rawTop + (rawHeight - height) / 2),
  ));
  return { left, top, width, height };
}

function readRegionCandidate(regions, template) {
  if (!regions) return null;
  if (regions.schemaVersion !== undefined && regions.templates) {
    return getRegionFromDocument(regions, template);
  }
  if (regions instanceof Map) {
    return regions.get(template.path) || regions.get(template.name) ||
      regions.get(template.name.toLocaleLowerCase('en-US')) || null;
  }
  if (typeof regions === 'object' && !Array.isArray(regions)) {
    const candidate = regions[template.path] || regions[template.name] ||
      regions[template.name.toLocaleLowerCase('en-US')] || null;
    return candidate?.region || candidate;
  }
  return null;
}

async function resolveTemplateRegions(templates, options = {}) {
  const { regionStore = null, regions = null, isCancelled } = options;
  if (!regionStore && !regions) {
    throw new SingleMockupError(
      'Chưa có thiết lập vùng in cho mockup đơn.',
      'MISSING_SINGLE_MOCKUP_REGIONS',
    );
  }
  if (regionStore && typeof regionStore.get !== 'function') {
    throw new TypeError('regionStore phải cung cấp hàm get(template).');
  }

  const resolved = [];
  const missing = [];
  for (const template of templates) {
    throwIfCancelled(isCancelled);
    const candidate = regionStore
      ? await regionStore.get(template)
      : readRegionCandidate(regions, template);
    if (!candidate) {
      missing.push(template.name);
      continue;
    }
    resolved.push(validateNormalizedPrintRegion(candidate, template));
    throwIfCancelled(isCancelled);
  }
  if (missing.length > 0) {
    throw new SingleMockupError(
      `Chưa thiết lập vùng in cho: ${missing.join(', ')}.`,
      'MISSING_TEMPLATE_PRINT_REGION',
      { missingTemplates: missing },
    );
  }
  return resolved;
}

async function renderSingleMockupToFile(options) {
  const {
    template,
    sourcePath,
    region,
    outputPath,
    alphaThreshold = 0,
    watermarkPath = null,
    preserveMetadata = false,
    isCancelled,
  } = options;
  const caches = options.caches || createRenderingCaches();
  throwIfCancelled(isCancelled);
  const pixelRegion = calculatePixelPrintRegion(region, template);
  // Keep the existing visibility validation, but never crop the PNG canvas
  // when mapping it into a fixed 42×48 print region.
  const sourceKey = fileSystemKey(sourcePath);
  await memoizeBounded(
    caches.visibility,
    `${sourceKey}|${alphaThreshold}`,
    () => findAlphaBounds(sourcePath, alphaThreshold),
    MAX_DESIGN_CACHE_ENTRIES,
  );
  throwIfCancelled(isCancelled);

  let designBuffer;
  try {
    const designKey = `${sourceKey}|${pixelRegion.width}x${pixelRegion.height}`;
    designBuffer = await memoizeBounded(caches.designs, designKey, () =>
      caches.runTransform(() =>
        sharp(sourcePath, { failOn: 'error', limitInputPixels: false })
          .resize(pixelRegion.width, pixelRegion.height, {
            fit: 'contain',
            position: 'centre',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: sharp.kernel.lanczos3,
          })
          .png()
          .toBuffer()),
      MAX_DESIGN_CACHE_ENTRIES);
  } catch (error) {
    throw new SingleMockupError(
      `Không thể xử lý PNG “${path.basename(sourcePath)}”: ${error.message}`,
      'PROCESS_SINGLE_MOCKUP_SOURCE_FAILED',
      { filePath: sourcePath, cause: error },
    );
  }

  throwIfCancelled(isCancelled);
  const watermark = watermarkPath
    ? await memoizeBounded(
        caches.watermarks,
        `${fileSystemKey(watermarkPath)}|${template.width}x${template.height}`,
        () => prepareWatermark(watermarkPath, template),
        MAX_DESIGN_CACHE_ENTRIES,
      )
    : null;
  throwIfCancelled(isCancelled);
  try {
    const composites = [{
      input: designBuffer,
      left: pixelRegion.left,
      top: pixelRegion.top,
      blend: 'over',
    }];
    if (watermark) {
      // Sharp composites in array order, so the watermark must remain last/topmost.
      composites.push({
        input: watermark.input,
        left: watermark.left,
        top: watermark.top,
        blend: watermark.blend || 'over',
      });
    }
    let pipeline = sharp(template.path, { failOn: 'error', limitInputPixels: false })
      .autoOrient()
      .ensureAlpha()
      .composite(composites);
    if (preserveMetadata) {
      if (typeof pipeline.keepMetadata === 'function') {
        pipeline = pipeline.keepMetadata();
      } else if (template.density) {
        pipeline = pipeline.withMetadata({ density: template.density });
      }
    }
    await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
  } catch (error) {
    throw new SingleMockupError(
      `Không thể tạo mockup đơn từ “${template.name}”: ${error.message}`,
      'RENDER_SINGLE_MOCKUP_FAILED',
      { filePath: template.path, cause: error },
    );
  }
  return pixelRegion;
}

function sanitizeFileStem(value, fallback) {
  const sanitized = String(value)
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  return (sanitized || fallback).slice(0, 160);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findExistingSingleMockupOutputs(outputDirectory, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const resolvedOutputDirectory = normalizeDirectory(outputDirectory, 'outputDirectory');
  const safePrefix = sanitizeFileStem(
    options.prefix ?? DEFAULT_SINGLE_MOCKUP_PREFIX,
    DEFAULT_SINGLE_MOCKUP_PREFIX,
  );
  let entries;
  try {
    entries = await fsImpl.readdir(resolvedOutputDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    if (error?.code === 'ENOTDIR') {
      throw new SingleMockupError(
        'Thư mục kết quả mockup đơn không hợp lệ.',
        'INVALID_SINGLE_MOCKUP_OUTPUT_DIRECTORY',
        { filePath: resolvedOutputDirectory, cause: error },
      );
    }
    throw error;
  }

  const escapedPrefix = escapeRegExp(safePrefix);
  const outputPattern = new RegExp(
    `^(?:${escapedPrefix}_.+|\\[.+\\]_${escapedPrefix}_.+)\\.png$`,
    'i',
  );
  return entries
    .filter((entry) => entry.isFile() && outputPattern.test(entry.name))
    .sort((left, right) =>
      left.name.localeCompare(right.name, 'vi', { numeric: true, sensitivity: 'base' }),
    )
    .map((entry) => path.join(resolvedOutputDirectory, entry.name));
}

async function commitWithoutOverwrite(tempPath, outputDirectory, stem) {
  for (let revision = 1; revision <= MAX_OUTPUT_REVISIONS; revision += 1) {
    const suffix = revision === 1 ? '' : `_${revision}`;
    const candidate = path.join(outputDirectory, `${stem}${suffix}.png`);
    try {
      await fs.copyFile(tempPath, candidate, fsConstants.COPYFILE_EXCL);
      await fs.rm(tempPath, { force: true }).catch(() => {});
      return candidate;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  throw new SingleMockupError(
    `Không thể tìm tên file còn trống cho “${stem}”.`,
    'SINGLE_MOCKUP_OUTPUT_NAME_EXHAUSTED',
  );
}

async function generateSingleMockups(options = {}) {
  const {
    sourcePaths,
    sourceGroups = null,
    inputDirectory,
    sourceDirectory,
    outputDirectory,
    templates: providedTemplates = null,
    templateMarker = null,
    regionStore = null,
    regions = null,
    random = Math.random,
    prefix = DEFAULT_SINGLE_MOCKUP_PREFIX,
    watermarkPath = null,
    removeMetadata = true,
    onProgress,
    isCancelled,
  } = options;
  const alphaThreshold = options.alphaThreshold ?? options.settings?.alphaThreshold ?? 0;
  const shouldRemoveMetadata = removeMetadata !== false;
  const outputConcurrency = normalizeConcurrency(
    options.processingConcurrency,
    DEFAULT_OUTPUT_CONCURRENCY,
    'processingConcurrency',
    4,
  );
  const transformConcurrency = normalizeConcurrency(
    options.transformConcurrency,
    DEFAULT_TRANSFORM_CONCURRENCY,
    'transformConcurrency',
    8,
  );
  const metadataConcurrency = normalizeConcurrency(
    options.metadataConcurrency,
    DEFAULT_METADATA_CONCURRENCY,
    'metadataConcurrency',
    4,
  );
  const resolvedOutputDirectory = outputDirectory
    ? normalizeDirectory(outputDirectory, 'outputDirectory')
    : path.join(normalizeDirectory(sourceDirectory, 'sourceDirectory'), 'Done');
  const safePrefix = sanitizeFileStem(prefix, DEFAULT_SINGLE_MOCKUP_PREFIX);

  throwIfCancelled(isCancelled);
  const existingPaths = await findExistingSingleMockupOutputs(resolvedOutputDirectory, {
    prefix: safePrefix,
  });
  throwIfCancelled(isCancelled);
  if (existingPaths.length > 0) {
    return {
      created: false,
      skipped: true,
      skipReason: 'SINGLE_MOCKUP_ALREADY_EXISTS',
      existingPaths,
      outputDir: resolvedOutputDirectory,
      outputPaths: [],
      watermarkApplied: false,
      watermarkName: null,
      metadataRemoved: false,
      removedMetadataGroups: [],
      assignments: [],
    };
  }

  const templates = providedTemplates || await listSingleMockupTemplates(inputDirectory, {
    templateMarker,
  });
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new SingleMockupError(
      'Thư mục Input chưa có ảnh mockup đơn.',
      'NO_SINGLE_MOCKUP_TEMPLATES',
    );
  }
  const normalizedTemplates = templates.map((template) => {
    if (!template || typeof template !== 'object' || !template.path) {
      throw new SingleMockupError('Thông tin ảnh mockup không hợp lệ.', 'INVALID_TEMPLATE_DESCRIPTOR');
    }
    const descriptor = templateDescriptor(template);
    if (!descriptor.width || !descriptor.height) {
      throw new SingleMockupError(
        `Thiếu kích thước ảnh mockup “${descriptor.name}”.`,
        'MISSING_TEMPLATE_SIZE',
      );
    }
    return {
      ...template,
      path: path.resolve(String(template.path)),
      name: descriptor.name,
      width: descriptor.width,
      height: descriptor.height,
    };
  });

  throwIfCancelled(isCancelled);
  const templateRegions = await resolveTemplateRegions(normalizedTemplates, {
    regionStore,
    regions,
    isCancelled,
  });
  let renderPlan;
  if (sourceGroups !== null) {
    if (!Array.isArray(sourceGroups) || sourceGroups.length === 0) {
      throw new SingleMockupError(
        'Cần ít nhất một nhóm PNG để tạo mockup đơn Group Shirt.',
        'NO_SINGLE_MOCKUP_SOURCE_GROUPS',
      );
    }
    const seenGroupKeys = new Set();
    renderPlan = [];
    for (const [groupIndex, candidate] of sourceGroups.entries()) {
      throwIfCancelled(isCancelled);
      if (!candidate || typeof candidate !== 'object') {
        throw new SingleMockupError(
          'Thông tin nhóm PNG mockup đơn không hợp lệ.',
          'INVALID_SINGLE_MOCKUP_SOURCE_GROUP',
        );
      }
      const group = String(
        candidate.group ?? candidate.displayGroup ?? candidate.groupKey ?? '',
      ).normalize('NFC').trim().replace(/\s+/gu, ' ');
      const groupKey = String(candidate.groupKey ?? group)
        .normalize('NFC').trim().toLocaleLowerCase('en-US');
      if (!group || !groupKey) {
        throw new SingleMockupError(
          `Nhóm PNG thứ ${groupIndex + 1} chưa có tên.`,
          'INVALID_SINGLE_MOCKUP_SOURCE_GROUP',
        );
      }
      if (seenGroupKeys.has(groupKey)) {
        throw new SingleMockupError(
          `Nhóm PNG “${group}” bị lặp trong danh sách mockup đơn.`,
          'DUPLICATE_SINGLE_MOCKUP_SOURCE_GROUP',
          { group, groupKey },
        );
      }
      seenGroupKeys.add(groupKey);
      const groupSourcePaths = candidate.sourcePaths ||
        candidate.sources?.map((source) => source?.path || source);
      const validGroupSources = await validateSourcePngPaths(groupSourcePaths, isCancelled);
      const selectedGroupSources = selectRandomSourcePngs(
        validGroupSources,
        normalizedTemplates.length,
        random,
      );
      for (let templateIndex = 0; templateIndex < normalizedTemplates.length; templateIndex += 1) {
        renderPlan.push({
          group,
          groupKey,
          template: normalizedTemplates[templateIndex],
          sourcePath: selectedGroupSources[templateIndex],
          region: templateRegions[templateIndex],
        });
      }
    }
  } else {
    const validSources = await validateSourcePngPaths(sourcePaths, isCancelled);
    const selectedSources = selectRandomSourcePngs(validSources, normalizedTemplates.length, random);
    renderPlan = normalizedTemplates.map((template, index) => ({
      group: null,
      groupKey: null,
      template,
      sourcePath: selectedSources[index],
      region: templateRegions[index],
    }));
  }
  await fs.mkdir(resolvedOutputDirectory, { recursive: true });

  const tempPaths = [];
  const committedPaths = [];
  const rendered = new Array(renderPlan.length);
  const jobId = randomUUID();
  const caches = createRenderingCaches(transformConcurrency);
  const progress = (fraction, message, stage) => {
    if (typeof onProgress === 'function') {
      onProgress({ fraction: Math.max(0, Math.min(1, fraction)), message, stage });
    }
  };

  try {
    const outputTempPaths = renderPlan.map((item, index) => path.join(
      resolvedOutputDirectory,
      `.${safePrefix}-${jobId}-${String(index + 1).padStart(3, '0')}.tmp`,
    ));
    tempPaths.push(...outputTempPaths);
    let startedOutputs = 0;
    let completedOutputs = 0;
    await mapWithConcurrency(renderPlan, outputConcurrency, async (item, index) => {
      throwIfCancelled(isCancelled);
      const { template, sourcePath, region, group, groupKey } = item;
      startedOutputs += 1;
      progress(
        0.85 * (completedOutputs / renderPlan.length),
        `Đang tạo mockup đơn ${startedOutputs}/${renderPlan.length}…`,
        'single-mockup-compose',
      );
      const pixelRegion = await renderSingleMockupToFile({
        template,
        sourcePath,
        region,
        outputPath: outputTempPaths[index],
        alphaThreshold,
        watermarkPath,
        preserveMetadata: !shouldRemoveMetadata,
        isCancelled,
        caches,
      });
      rendered[index] = {
        template,
        sourcePath,
        region,
        pixelRegion,
        tempPath: outputTempPaths[index],
        group,
        groupKey,
      };
      completedOutputs += 1;
    });

    if (shouldRemoveMetadata) {
      let startedMetadata = 0;
      let cleanedOutputs = 0;
      await mapWithConcurrency(rendered, metadataConcurrency, async (item) => {
        throwIfCancelled(isCancelled);
        startedMetadata += 1;
        progress(
          0.85 + 0.1 * (cleanedOutputs / rendered.length),
          `Đang xóa 6 nhóm Metadata ở mockup đơn ${startedMetadata}/${rendered.length}…`,
          'single-mockup-metadata',
        );
        await stripMetadataFromFile(item.tempPath, { isCancelled });
        cleanedOutputs += 1;
      });
    }

    for (let index = 0; index < rendered.length; index += 1) {
      throwIfCancelled(isCancelled);
      const item = rendered[index];
      const templateStem = sanitizeFileStem(
        path.basename(item.template.name, path.extname(item.template.name)),
        `template-${index + 1}`,
      );
      const groupStem = item.group
        ? `[${sanitizeFileStem(item.group, `group-${index + 1}`)}]_${safePrefix}_`
        : `${safePrefix}_`;
      const outputPath = await commitWithoutOverwrite(
        item.tempPath,
        resolvedOutputDirectory,
        `${groupStem}${templateStem}`,
      );
      committedPaths.push(outputPath);
      progress(
        (shouldRemoveMetadata ? 0.95 : 0.85) +
          (shouldRemoveMetadata ? 0.05 : 0.15) * ((index + 1) / rendered.length),
        `Đã lưu mockup đơn ${index + 1}/${rendered.length}.`,
        'single-mockup-save',
      );
    }

    await Promise.allSettled(tempPaths.map((filePath) => fs.rm(filePath, { force: true })));

    return {
      created: true,
      skipped: false,
      outputDir: resolvedOutputDirectory,
      outputPaths: committedPaths,
      watermarkApplied: Boolean(watermarkPath),
      watermarkName: watermarkPath ? path.basename(path.resolve(String(watermarkPath))) : null,
      metadataRemoved: shouldRemoveMetadata,
      removedMetadataGroups: shouldRemoveMetadata ? [...REMOVED_METADATA_GROUPS] : [],
      assignments: rendered.map((item, index) => ({
        template: {
          path: item.template.path,
          name: item.template.name,
          width: item.template.width,
          height: item.template.height,
          format: item.template.format || null,
        },
        sourcePath: item.sourcePath,
        ...(item.group ? { group: item.group, groupKey: item.groupKey } : {}),
        region: { ...item.region },
        pixelRegion: { ...item.pixelRegion },
        outputPath: committedPaths[index],
      })),
    };
  } catch (error) {
    await Promise.allSettled(tempPaths.map((filePath) => fs.rm(filePath, { force: true })));
    await Promise.allSettled(committedPaths.map((filePath) => fs.rm(filePath, { force: true })));
    throw error;
  }
}

module.exports = {
  DEFAULT_SINGLE_MOCKUP_PREFIX,
  SINGLE_MOCKUP_TEMPLATE_EXTENSIONS,
  SingleMockupError,
  SingleMockupCancelledError,
  templateNameIncludesMarker,
  listSingleMockupTemplates,
  selectRandomSourcePngs,
  validateSourcePngPaths,
  calculatePixelPrintRegion,
  findExistingSingleMockupOutputs,
  resolveTemplateRegions,
  renderSingleMockupToFile,
  generateSingleMockups,
};
