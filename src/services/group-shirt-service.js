'use strict';

const fs = require('node:fs/promises');
const fsConstants = require('node:fs').constants;
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const {
  inspectImage,
  findAlphaBounds,
  prepareWatermark,
  stripMetadataFromFile,
} = require('../engine/image-engine');
const { validateGroupShirtRegion } = require('./group-shirt-regions');
const {
  mapWithConcurrency,
  createConcurrencyLimiter,
  memoizeBounded,
} = require('./bounded-work');

const GROUP_SHIRT_OUTPUT_PREFIX = 'group-shirt';
const MAX_OUTPUT_REVISIONS = 10000;
const DEFAULT_OUTPUT_CONCURRENCY = 2;
const DEFAULT_SOURCE_CONCURRENCY = 4;
const DEFAULT_TRANSFORM_CONCURRENCY = 4;
const DEFAULT_METADATA_CONCURRENCY = 2;
const MAX_DESIGN_CACHE_ENTRIES = 64;
const SUPPORTED_TEMPLATE_FORMATS = new Set(['png', 'jpeg', 'webp', 'tiff']);
const REMOVED_METADATA_GROUPS = Object.freeze([
  'Comment',
  'EXIF',
  'XMP',
  'EXIF thumbnail',
  'IPTC',
  'ICC profile',
]);

class GroupShirtError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GroupShirtError';
    this.code = code;
    Object.assign(this, details);
  }
}

class GroupShirtCancelledError extends GroupShirtError {
  constructor() {
    super('Đã huỷ thao tác tạo Mockup Group Shirt.', 'CANCELLED');
    this.name = 'GroupShirtCancelledError';
  }
}

function throwIfCancelled(isCancelled) {
  if (typeof isCancelled === 'function' && isCancelled()) {
    throw new GroupShirtCancelledError();
  }
}

function progressCallback(onProgress, fraction, message, stage, details = {}) {
  if (typeof onProgress !== 'function') return;
  onProgress({
    ...details,
    fraction: Math.max(0, Math.min(1, Number(fraction) || 0)),
    message,
    stage,
  });
}

function normalizeAlphaThreshold(value) {
  const threshold = Number(value ?? 0);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 254) {
    throw new GroupShirtError(
      'Ngưỡng alpha phải là số nguyên từ 0 đến 254.',
      'INVALID_ALPHA_THRESHOLD',
    );
  }
  return threshold;
}

function normalizePositiveInteger(value, fallback, optionName) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new GroupShirtError(
      `${optionName} phải là số nguyên dương.`,
      'INVALID_PREVIEW_SIZE',
      { optionName },
    );
  }
  return number;
}

function normalizeConcurrency(value, fallback, optionName, maximum = 8) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > maximum) {
    throw new GroupShirtError(
      `${optionName} phải là số nguyên từ 1 đến ${maximum}.`,
      'INVALID_GROUP_SHIRT_CONCURRENCY',
      { optionName },
    );
  }
  return number;
}

function createRenderingCaches(caches = {}, transformConcurrency = DEFAULT_TRANSFORM_CONCURRENCY) {
  const output = caches && typeof caches === 'object' ? caches : {};
  if (!(output.templates instanceof Map)) output.templates = new Map();
  if (!(output.sources instanceof Map)) output.sources = new Map();
  if (!(output.watermarks instanceof Map)) output.watermarks = new Map();
  if (!(output.designs instanceof Map)) output.designs = new Map();
  if (typeof output.runTransform !== 'function') {
    output.runTransform = createConcurrencyLimiter(transformConcurrency);
  }
  return output;
}

function resolvedFilePath(value, optionName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GroupShirtError(`Thiếu ${optionName}.`, 'MISSING_FILE_PATH', { optionName });
  }
  return path.resolve(value);
}

function outputDirectoryFromOptions(options, outputs) {
  if (typeof options.outputDirectory === 'string' && options.outputDirectory.trim()) {
    return path.resolve(options.outputDirectory);
  }
  if (typeof options.sourceDirectory === 'string' && options.sourceDirectory.trim()) {
    return path.join(path.resolve(options.sourceDirectory), 'Done');
  }
  const firstSource = outputs
    .flatMap((output) => output.assignments || [])
    .map((assignment) => assignment?.source?.path || assignment?.sourcePath)
    .find((value) => typeof value === 'string' && value.trim());
  if (firstSource) return path.join(path.dirname(path.resolve(firstSource)), 'Done');
  throw new GroupShirtError(
    'Không xác định được thư mục Done cho Mockup Group Shirt.',
    'MISSING_OUTPUT_DIRECTORY',
  );
}

function sanitizeFileStem(value, fallback = 'mockup') {
  const sanitized = String(value || '')
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  return (sanitized || fallback).slice(0, 120);
}

function fileSystemKey(filePath) {
  const resolved = path.resolve(String(filePath));
  return process.platform === 'win32'
    ? resolved.toLocaleLowerCase('en-US')
    : resolved;
}

async function pathExists(filePath, fsImpl = fs) {
  try {
    await fsImpl.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function planOutputs(plan) {
  const outputs = plan?.outputs || plan?.pages;
  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new GroupShirtError(
      'Không có trang Mockup Group Shirt hợp lệ để tạo.',
      'NO_GROUP_SHIRT_OUTPUTS',
    );
  }
  return outputs;
}

async function resolveGroupShirtPlan(options = {}) {
  if (options.plan) {
    const plan = typeof options.plan === 'function'
      ? await options.plan()
      : await options.plan;
    planOutputs(plan);
    return plan;
  }

  let createPlan = options.createPlan;
  if (typeof createPlan !== 'function') {
    // Kept lazy so the compositor can also be tested or reused with a persisted plan.
    // eslint-disable-next-line global-require
    ({ createGroupShirtPlan: createPlan } = require('./group-shirt-planner'));
  }
  if (typeof createPlan !== 'function') {
    throw new GroupShirtError(
      'Không tìm thấy bộ lập kế hoạch Mockup Group Shirt.',
      'MISSING_GROUP_SHIRT_PLANNER',
    );
  }

  const plannerOptions = options.plannerOptions || {
    sources: options.sources || options.sourcePaths,
    templates: options.templates || options.templatePaths,
    regionsByTemplate: options.regionsByTemplate,
    regionResolver: options.regionResolver,
    random: options.random,
  };
  const plan = await createPlan(plannerOptions);
  planOutputs(plan);
  return plan;
}

function templatePathFromOutput(output) {
  return output?.template?.path || output?.templatePath;
}

function sourcePathFromAssignment(assignment) {
  return assignment?.source?.path || assignment?.sourcePath;
}

function normalizedRegion(region, template) {
  const canonical = validateGroupShirtRegion(region, template);
  const { centerX, centerY, width, height, rotation } = canonical;
  const pixelCenterX = centerX * template.width;
  const pixelCenterY = centerY * template.height;
  const pixelWidth = Math.max(1, Math.round(width * template.width));
  const pixelHeight = Math.max(1, Math.round(height * template.height));
  return {
    ...canonical,
    centerX,
    centerY,
    cx: centerX,
    cy: centerY,
    width,
    height,
    rotation,
    pixelCenterX,
    pixelCenterY,
    pixelWidth,
    pixelHeight,
  };
}

async function inspectTemplateDescriptor(rawTemplate, templateCache, isCancelled) {
  const templatePath = resolvedFilePath(rawTemplate?.path || rawTemplate, 'ảnh nền Group Shirt');
  const key = fileSystemKey(templatePath);
  if (!templateCache.has(key)) {
    templateCache.set(key, (async () => {
      throwIfCancelled(isCancelled);
      let metadata;
      try {
        metadata = await inspectImage(templatePath);
      } catch (error) {
        throw new GroupShirtError(
          `Không thể đọc ảnh nền “${path.basename(templatePath)}”: ${error.message}`,
          'INVALID_GROUP_SHIRT_TEMPLATE',
          { filePath: templatePath, cause: error },
        );
      }
      if (!SUPPORTED_TEMPLATE_FORMATS.has(metadata.format)) {
        throw new GroupShirtError(
          `Ảnh nền “${path.basename(templatePath)}” không thuộc định dạng được hỗ trợ.`,
          'UNSUPPORTED_GROUP_SHIRT_TEMPLATE',
          { filePath: templatePath, format: metadata.format },
        );
      }
      const width = metadata.autoOrient?.width || metadata.width;
      const height = metadata.autoOrient?.height || metadata.height;
      throwIfCancelled(isCancelled);
      return {
        ...(typeof rawTemplate === 'object' ? rawTemplate : {}),
        path: templatePath,
        name: rawTemplate?.name || path.basename(templatePath),
        width,
        height,
        format: metadata.format,
        density: metadata.density || null,
      };
    })());
  }
  return templateCache.get(key);
}

async function inspectSourceDescriptor(rawSource, alphaThreshold, sourceCache, isCancelled) {
  const sourcePath = resolvedFilePath(rawSource?.path || rawSource, 'PNG Group Shirt');
  const key = fileSystemKey(sourcePath);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, (async () => {
      throwIfCancelled(isCancelled);
      let metadata;
      try {
        metadata = await inspectImage(sourcePath);
      } catch (error) {
        throw new GroupShirtError(
          `Không thể đọc PNG “${path.basename(sourcePath)}”: ${error.message}`,
          'INVALID_GROUP_SHIRT_SOURCE',
          { filePath: sourcePath, cause: error },
        );
      }
      if (metadata.format !== 'png') {
        throw new GroupShirtError(
          `“${path.basename(sourcePath)}” không phải PNG hợp lệ.`,
          'GROUP_SHIRT_SOURCE_NOT_PNG',
          { filePath: sourcePath, format: metadata.format },
        );
      }
      let bounds;
      try {
        // Validate visibility at the requested threshold only. These bounds
        // must not determine placement inside a fixed 42×48 print region.
        bounds = await findAlphaBounds(sourcePath, alphaThreshold);
      } catch (error) {
        throw new GroupShirtError(
          `Không thể xác định vùng pixel của “${path.basename(sourcePath)}”: ${error.message}`,
          'INVALID_GROUP_SHIRT_ALPHA_BOUNDS',
          { filePath: sourcePath, cause: error },
        );
      }
      throwIfCancelled(isCancelled);
      return {
        ...(typeof rawSource === 'object' ? rawSource : {}),
        path: sourcePath,
        name: rawSource?.name || path.basename(sourcePath),
        metadata,
        bounds,
      };
    })());
  }
  return sourceCache.get(key);
}

async function normalizePlannedOutput(rawOutput, outputIndex, caches, options = {}) {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new GroupShirtError('Trang Group Shirt không hợp lệ.', 'INVALID_GROUP_SHIRT_OUTPUT');
  }
  const rawTemplate = rawOutput.template || rawOutput.templatePath;
  const template = await inspectTemplateDescriptor(rawTemplate, caches.templates, options.isCancelled);
  const assignments = rawOutput.assignments;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new GroupShirtError(
      `Trang ${outputIndex + 1} không có PNG để ghép.`,
      'EMPTY_GROUP_SHIRT_OUTPUT',
      { outputIndex },
    );
  }

  const seenRegionIds = new Set();
  const normalizedAssignments = [];
  for (let assignmentIndex = 0; assignmentIndex < assignments.length; assignmentIndex += 1) {
    throwIfCancelled(options.isCancelled);
    const assignment = assignments[assignmentIndex];
    const rawSource = assignment?.source || assignment?.sourcePath;
    const sourcePath = resolvedFilePath(rawSource?.path || rawSource, 'PNG Group Shirt');

    const region = normalizedRegion(assignment?.region, template);
    if (region.id !== undefined && region.id !== null) {
      const regionId = String(region.id);
      if (seenRegionIds.has(regionId)) {
        throw new GroupShirtError(
          `Vùng in “${regionId}” bị lặp trong một ảnh Group Shirt.`,
          'DUPLICATE_REGION_IN_GROUP_SHIRT_OUTPUT',
          { regionId, outputIndex },
        );
      }
      seenRegionIds.add(regionId);
    }
    normalizedAssignments.push({
      ...assignment,
      source: typeof rawSource === 'object'
        ? { ...rawSource, path: sourcePath }
        : { path: sourcePath, name: path.basename(sourcePath) },
      region,
    });
  }

  return {
    ...rawOutput,
    outputIndex,
    template,
    assignments: normalizedAssignments,
  };
}

async function normalizePlanForRendering(plan, options = {}) {
  const outputs = planOutputs(plan);
  const caches = createRenderingCaches(options.caches);
  const normalized = await mapWithConcurrency(outputs, 4, (output, index) =>
    normalizePlannedOutput(output, index, caches, options));
  return { outputs: normalized, caches };
}

async function createDesignComposite(assignment, options) {
  const {
    alphaThreshold,
    sourceCache,
    designCache,
    runTransform = (task) => task(),
    template,
    isCancelled,
  } = options;
  const source = await inspectSourceDescriptor(
    assignment.source,
    alphaThreshold,
    sourceCache,
    isCancelled,
  );
  const { region } = assignment;
  throwIfCancelled(isCancelled);

  const designKey = [
    fileSystemKey(source.path),
    `${region.pixelWidth}x${region.pixelHeight}`,
    Number(region.rotation),
  ].join('|');
  let result;
  try {
    result = await memoizeBounded(designCache, designKey, () => runTransform(async () => {
      throwIfCancelled(isCancelled);
      // Resize the entire PNG canvas, including transparent margins, so the
      // design keeps its original size and position relative to the print area.
      let transformed = await sharp(source.path, { failOn: 'error', limitInputPixels: false })
        .resize(region.pixelWidth, region.pixelHeight, {
          fit: 'contain',
          position: 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: sharp.kernel.lanczos3,
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer({ resolveWithObject: true });
      if (Math.abs(region.rotation) > 1e-9) {
        throwIfCancelled(isCancelled);
        // Materialize the resized canvas before rotation: Sharp can otherwise
        // apply 90° rotations before contain-padding and change the frame size.
        transformed = await sharp(transformed.data, { failOn: 'error', limitInputPixels: false })
          .rotate(region.rotation, {
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png({ compressionLevel: 9, adaptiveFiltering: true })
          .toBuffer({ resolveWithObject: true });
      }
      throwIfCancelled(isCancelled);
      return transformed;
    }), MAX_DESIGN_CACHE_ENTRIES);
  } catch (error) {
    if (error instanceof GroupShirtCancelledError) throw error;
    throw new GroupShirtError(
      `Không thể xử lý PNG “${path.basename(source.path)}”: ${error.message}`,
      'PROCESS_GROUP_SHIRT_SOURCE_FAILED',
      { filePath: source.path, cause: error },
    );
  }

  if (result.info.width > template.width || result.info.height > template.height) {
    throw new GroupShirtError(
      'Vùng in sau khi xoay lớn hơn ảnh nền.',
      'GROUP_SHIRT_ROTATED_REGION_OUT_OF_BOUNDS',
      { regionId: region.id || null, templatePath: template.path },
    );
  }
  const idealLeft = Math.round(region.pixelCenterX - result.info.width / 2);
  const idealTop = Math.round(region.pixelCenterY - result.info.height / 2);
  // libvips may expand a rotated image by one anti-aliasing pixel. Keep the
  // visual centre and clamp only that sub-pixel rounding difference.
  const left = Math.max(0, Math.min(template.width - result.info.width, idealLeft));
  const top = Math.max(0, Math.min(template.height - result.info.height, idealTop));
  throwIfCancelled(isCancelled);
  return {
    input: result.data,
    left,
    top,
    blend: 'over',
    source,
    region,
    renderedWidth: result.info.width,
    renderedHeight: result.info.height,
  };
}

async function watermarkForTemplate(watermarkPath, template, cache, isCancelled) {
  if (!watermarkPath) return null;
  const resolvedWatermark = resolvedFilePath(watermarkPath, 'watermark');
  const key = `${fileSystemKey(resolvedWatermark)}\0${template.width}x${template.height}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      throwIfCancelled(isCancelled);
      const watermark = await prepareWatermark(resolvedWatermark, template);
      throwIfCancelled(isCancelled);
      return watermark;
    })());
  }
  return cache.get(key);
}

async function renderGroupShirtOutputToBuffer(options = {}) {
  const {
    output,
    alphaThreshold = 0,
    watermarkPath = null,
    preserveMetadata = false,
    isCancelled,
    onItem,
  } = options;
  const threshold = normalizeAlphaThreshold(alphaThreshold);
  const caches = createRenderingCaches(options.caches);
  const normalizedOutput = output?.template?.width && output?.assignments?.every((item) => item?.region?.pixelWidth)
    ? output
    : await normalizePlannedOutput(output, Number(output?.outputIndex) || 0, caches, { isCancelled });
  const { template, assignments } = normalizedOutput;
  let completedAssignments = 0;
  const composites = await mapWithConcurrency(assignments, 8, async (assignment) => {
    throwIfCancelled(isCancelled);
    const composite = await createDesignComposite(assignment, {
      alphaThreshold: threshold,
      sourceCache: caches.sources,
      designCache: caches.designs,
      runTransform: caches.runTransform,
      template,
      isCancelled,
    });
    completedAssignments += 1;
    if (typeof onItem === 'function') {
      onItem(completedAssignments, assignments.length, composite);
    }
    return {
      input: composite.input,
      left: composite.left,
      top: composite.top,
      blend: 'over',
    };
  });

  const watermark = await watermarkForTemplate(
    watermarkPath,
    template,
    caches.watermarks,
    isCancelled,
  );
  if (watermark) {
    // Sharp composites in array order. This must remain the last/topmost layer.
    composites.push({
      input: watermark.input,
      left: watermark.left,
      top: watermark.top,
      blend: watermark.blend || 'over',
    });
  }

  throwIfCancelled(isCancelled);
  try {
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
    const buffer = await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    throwIfCancelled(isCancelled);
    return {
      buffer,
      output: normalizedOutput,
      template,
      watermarkApplied: Boolean(watermark),
    };
  } catch (error) {
    if (error instanceof GroupShirtError) throw error;
    throw new GroupShirtError(
      `Không thể ghép ảnh nền “${template.name}”: ${error.message}`,
      'RENDER_GROUP_SHIRT_FAILED',
      { filePath: template.path, cause: error },
    );
  }
}

function outputBaseStems(outputs) {
  return outputs.map((output) => {
    const groupStem = sanitizeFileStem(output.displayGroup || output.group || output.groupKey, 'group');
    const templateName = output.template?.name || path.basename(templatePathFromOutput(output));
    const templateStem = sanitizeFileStem(
      path.basename(templateName, path.extname(templateName)),
      'template',
    );
    // Delimit the group so even a group named "single" cannot be mistaken for
    // a single_*.png output by the existing single-mockup skip check.
    return `[${groupStem}]_${templateStem}`;
  });
}

async function chooseGroupShirtOutputPaths(outputDirectory, outputs, options = {}) {
  const resolvedDirectory = path.resolve(String(outputDirectory));
  const bases = outputBaseStems(outputs);
  const fsImpl = options.fsImpl || fs;
  const nextOrdinals = new Map();
  const candidates = [];
  for (const base of bases) {
    // Share a counter for the final group/template name, including names that
    // become identical after sanitizing or differ only by case on Windows.
    const key = base.toLocaleLowerCase('en-US');
    let ordinal = nextOrdinals.get(key) || 1;
    let candidate;
    for (let attempt = 0; attempt < MAX_OUTPUT_REVISIONS; attempt += 1, ordinal += 1) {
      const candidatePath = path.join(resolvedDirectory, `${base}_${String(ordinal).padStart(3, '0')}.png`);
      if (!await pathExists(candidatePath, fsImpl)) {
        candidate = candidatePath;
        break;
      }
    }
    if (!candidate) {
      throw new GroupShirtError(
        'Không thể tìm tên file Group Shirt còn trống trong thư mục Done.',
        'GROUP_SHIRT_OUTPUT_NAME_EXHAUSTED',
      );
    }
    nextOrdinals.set(key, ordinal + 1);
    candidates.push(candidate);
  }
  return candidates;
}

async function renderGroupShirtPreview(options = {}) {
  const plan = await resolveGroupShirtPlan(options);
  const outputs = planOutputs(plan);
  const pageIndex = Number(options.pageIndex ?? options.outputIndex ?? 0);
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= outputs.length) {
    throw new GroupShirtError('Trang preview Group Shirt không hợp lệ.', 'INVALID_PREVIEW_PAGE');
  }
  const maxWidth = normalizePositiveInteger(options.maxWidth, 1400, 'maxWidth');
  const maxHeight = normalizePositiveInteger(options.maxHeight, 1000, 'maxHeight');
  const caches = createRenderingCaches();
  throwIfCancelled(options.isCancelled);
  progressCallback(options.onProgress, 0, 'Đang chuẩn bị preview Group Shirt…', 'group-shirt-preview');
  const output = await normalizePlannedOutput(outputs[pageIndex], pageIndex, caches, options);
  const rendered = await renderGroupShirtOutputToBuffer({
    output,
    alphaThreshold: options.alphaThreshold ?? options.settings?.alphaThreshold ?? 0,
    watermarkPath: options.watermarkPath || null,
    preserveMetadata: false,
    caches,
    isCancelled: options.isCancelled,
    onItem: (current, total) => progressCallback(
      options.onProgress,
      0.1 + 0.75 * (current / total),
      `Đang ghép PNG ${current}/${total} vào preview…`,
      'group-shirt-preview',
    ),
  });
  throwIfCancelled(options.isCancelled);
  const buffer = await sharp(rendered.buffer)
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 7 })
    .toBuffer();
  throwIfCancelled(options.isCancelled);
  progressCallback(options.onProgress, 1, 'Đã tạo xong preview Group Shirt.', 'group-shirt-preview');
  const previewMetadata = await inspectImage(buffer);
  return {
    buffer,
    pageIndex,
    pageCount: outputs.length,
    assignmentCount: output.assignments.length,
    template: {
      path: output.template.path,
      name: output.template.name,
      width: output.template.width,
      height: output.template.height,
    },
    preview: {
      width: previewMetadata.width,
      height: previewMetadata.height,
    },
    groupKey: output.groupKey || output.template.groupKey || null,
    displayGroup: output.displayGroup || output.group ||
      output.template.displayGroup || output.template.group || null,
    color: output.color || output.template.color || null,
  };
}

async function generateGroupShirtMockups(options = {}) {
  const plan = await resolveGroupShirtPlan(options);
  const rawOutputs = planOutputs(plan);
  const threshold = normalizeAlphaThreshold(options.alphaThreshold ?? options.settings?.alphaThreshold ?? 0);
  const shouldRemoveMetadata = options.removeMetadata !== false;
  const outputConcurrency = normalizeConcurrency(
    options.processingConcurrency,
    DEFAULT_OUTPUT_CONCURRENCY,
    'processingConcurrency',
    4,
  );
  const sourceConcurrency = normalizeConcurrency(
    options.sourceConcurrency,
    DEFAULT_SOURCE_CONCURRENCY,
    'sourceConcurrency',
    8,
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
  const caches = createRenderingCaches({}, transformConcurrency);
  const normalized = await normalizePlanForRendering(plan, {
    caches,
    isCancelled: options.isCancelled,
  });
  const outputs = normalized.outputs;
  const outputDir = outputDirectoryFromOptions(options, outputs);
  const tempPaths = [];
  const committedPaths = [];
  const jobId = randomUUID();
  const unusedTemplates = Array.isArray(plan.unusedTemplates)
    ? plan.unusedTemplates.map((template) => ({
        path: template.path || null,
        name: template.name || (template.path ? path.basename(template.path) : null),
        groupKey: template.groupKey || null,
        color: template.color || null,
      }))
    : [];
  const warnings = [
    ...(Array.isArray(plan.warnings) ? plan.warnings : []),
    ...unusedTemplates.map((template) => ({
      code: 'UNUSED_GROUP_SHIRT_TEMPLATE',
      message: `Ảnh nền “${template.name || 'không rõ tên'}” không có vùng in phù hợp với bất kỳ nhóm PNG nào nên đã được bỏ qua.`,
      template,
    })),
  ];

  try {
    throwIfCancelled(options.isCancelled);
    await fs.mkdir(outputDir, { recursive: true });
    const finalPaths = await chooseGroupShirtOutputPaths(outputDir, outputs);

    const uniqueSources = [];
    const sourceKeys = new Set();
    for (const output of outputs) {
      for (const assignment of output.assignments) {
        const key = fileSystemKey(assignment.source.path);
        if (!sourceKeys.has(key)) {
          sourceKeys.add(key);
          uniqueSources.push(assignment.source);
        }
      }
    }
    let preparedSources = 0;
    await mapWithConcurrency(uniqueSources, sourceConcurrency, async (source) => {
      throwIfCancelled(options.isCancelled);
      await inspectSourceDescriptor(
        source,
        threshold,
        caches.sources,
        options.isCancelled,
      );
      preparedSources += 1;
      progressCallback(
        options.onProgress,
        0.2 * (preparedSources / uniqueSources.length),
        `Đang kiểm tra PNG ${preparedSources}/${uniqueSources.length}…`,
        'group-shirt-prepare',
      );
    });

    let renderedAssignments = 0;
    const totalAssignments = outputs.reduce((sum, output) => sum + output.assignments.length, 0);
    const outputTempPaths = outputs.map((output, index) => path.join(
      outputDir,
      `.${GROUP_SHIRT_OUTPUT_PREFIX}-${jobId}-${String(index + 1).padStart(3, '0')}.tmp`,
    ));
    tempPaths.push(...outputTempPaths);
    let startedOutputs = 0;
    await mapWithConcurrency(outputs, outputConcurrency, async (output, index) => {
      throwIfCancelled(options.isCancelled);
      startedOutputs += 1;
      progressCallback(
        options.onProgress,
        0.2 + 0.62 * (renderedAssignments / totalAssignments),
        `Đang tạo Group Shirt ${startedOutputs}/${outputs.length}…`,
        'group-shirt-compose',
      );
      const rendered = await renderGroupShirtOutputToBuffer({
        output,
        alphaThreshold: threshold,
        watermarkPath: options.watermarkPath || null,
        preserveMetadata: true,
        caches,
        isCancelled: options.isCancelled,
        onItem: () => {
          renderedAssignments += 1;
          progressCallback(
            options.onProgress,
            0.2 + 0.62 * (renderedAssignments / totalAssignments),
            `Đang ghép PNG ${renderedAssignments}/${totalAssignments}…`,
            'group-shirt-compose',
          );
        },
      });
      await fs.writeFile(outputTempPaths[index], rendered.buffer, { flag: 'wx' });
    });

    if (shouldRemoveMetadata) {
      let cleanedOutputs = 0;
      let startedMetadata = 0;
      await mapWithConcurrency(tempPaths, metadataConcurrency, async (tempPath) => {
        throwIfCancelled(options.isCancelled);
        startedMetadata += 1;
        progressCallback(
          options.onProgress,
          0.82 + 0.12 * (cleanedOutputs / tempPaths.length),
          `Đang xóa 6 nhóm Metadata ${startedMetadata}/${tempPaths.length}…`,
          'group-shirt-metadata',
        );
        await stripMetadataFromFile(tempPath, { isCancelled: options.isCancelled });
        cleanedOutputs += 1;
      });
    }

    for (let index = 0; index < tempPaths.length; index += 1) {
      throwIfCancelled(options.isCancelled);
      await fs.copyFile(tempPaths[index], finalPaths[index], fsConstants.COPYFILE_EXCL);
      committedPaths.push(finalPaths[index]);
      await fs.rm(tempPaths[index], { force: true });
      progressCallback(
        options.onProgress,
        (shouldRemoveMetadata ? 0.94 : 0.82) +
          (shouldRemoveMetadata ? 0.06 : 0.18) * ((index + 1) / tempPaths.length),
        `Đã lưu Group Shirt ${index + 1}/${tempPaths.length}.`,
        'group-shirt-save',
      );
    }

    return {
      outputDir,
      outputPaths: committedPaths,
      outputCount: committedPaths.length,
      outputs: outputs.map((output, index) => ({
        path: committedPaths[index],
        name: path.basename(committedPaths[index]),
        template: {
          path: output.template.path,
          name: output.template.name,
          width: output.template.width,
          height: output.template.height,
        },
        groupKey: output.groupKey || output.template.groupKey || null,
        displayGroup: output.displayGroup || output.group ||
          output.template.displayGroup || output.template.group || null,
        color: output.color || output.template.color || null,
        pageIndex: Number.isInteger(output.pageIndex)
          ? output.pageIndex
          : (Number.isInteger(output.batchIndex) ? output.batchIndex : null),
        batchIndex: Number.isInteger(output.batchIndex) ? output.batchIndex : null,
        batchCount: Number.isInteger(output.batchCount) ? output.batchCount : null,
        assignmentCount: output.assignments.length,
      })),
      metadataRemoved: shouldRemoveMetadata,
      removedMetadataGroups: shouldRemoveMetadata ? [...REMOVED_METADATA_GROUPS] : [],
      watermarkApplied: Boolean(options.watermarkPath),
      watermarkName: options.watermarkPath ? path.basename(path.resolve(options.watermarkPath)) : null,
      groups: Array.isArray(plan.groups) ? plan.groups.map((group) => ({ ...group })) : [],
      unusedTemplates,
      warnings,
    };
  } catch (error) {
    await Promise.allSettled(tempPaths.map((filePath) => fs.rm(filePath, { force: true })));
    await Promise.allSettled(committedPaths.map((filePath) => fs.rm(filePath, { force: true })));
    throw error;
  }
}

module.exports = {
  GROUP_SHIRT_OUTPUT_PREFIX,
  REMOVED_METADATA_GROUPS,
  GroupShirtError,
  GroupShirtCancelledError,
  resolveGroupShirtPlan,
  normalizedRegion,
  chooseGroupShirtOutputPaths,
  renderGroupShirtOutputToBuffer,
  renderGroupShirtPreview,
  generateGroupShirtMockups,
};
