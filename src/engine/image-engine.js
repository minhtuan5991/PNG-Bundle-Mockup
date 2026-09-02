'use strict';

const fs = require('node:fs/promises');
const fsConstants = require('node:fs').constants;
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const { mapWithConcurrency, createConcurrencyLimiter } = require('../services/bounded-work');
const {
  LayoutError,
  splitBalanced,
  buildPlacements,
  validateLayoutArea,
} = require('./layout');

class ImageInputError extends Error {
  constructor(message, filePath, code = 'IMAGE_INPUT_ERROR') {
    super(message);
    this.name = 'ImageInputError';
    this.filePath = filePath;
    this.code = code;
  }
}

class GenerationCancelledError extends Error {
  constructor() {
    super('Đã huỷ thao tác. Không có file kết quả dở dang nào được giữ lại.');
    this.name = 'GenerationCancelledError';
    this.code = 'CANCELLED';
  }
}

function throwIfCancelled(isCancelled) {
  if (typeof isCancelled === 'function' && isCancelled()) {
    throw new GenerationCancelledError();
  }
}

function validateAlphaThreshold(value) {
  const threshold = Number(value ?? 0);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 254) {
    throw new LayoutError('Ngưỡng alpha phải là số nguyên từ 0 đến 254.', 'INVALID_ALPHA');
  }
  return threshold;
}

async function inspectImage(filePath) {
  try {
    const metadata = await sharp(filePath, {
      failOn: 'error',
      limitInputPixels: false,
    }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Không đọc được kích thước ảnh.');
    }
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      hasAlpha: Boolean(metadata.hasAlpha),
      density: metadata.density || null,
      orientation: metadata.orientation || null,
      autoOrient: metadata.autoOrient
        ? { width: metadata.autoOrient.width, height: metadata.autoOrient.height }
        : null,
    };
  } catch (error) {
    throw new ImageInputError(
      `Không thể đọc ảnh “${path.basename(filePath)}”: ${error.message}`,
      filePath,
      'UNREADABLE_IMAGE',
    );
  }
}

async function findAlphaBounds(filePath, alphaThreshold = 0) {
  const threshold = validateAlphaThreshold(alphaThreshold);
  let raw;
  try {
    raw = await sharp(filePath, {
      failOn: 'error',
      limitInputPixels: false,
    })
      .ensureAlpha()
      .extractChannel('alpha')
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw new ImageInputError(
      `Không thể đọc vùng pixel của “${path.basename(filePath)}”: ${error.message}`,
      filePath,
      'UNREADABLE_IMAGE',
    );
  }

  const { data, info } = raw;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    const rowOffset = y * info.width;
    for (let x = 0; x < info.width; x += 1) {
      if (data[rowOffset + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new ImageInputError(
      `PNG “${path.basename(filePath)}” hoàn toàn trong suốt ở ngưỡng alpha ${threshold}.`,
      filePath,
      'FULLY_TRANSPARENT',
    );
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    originalWidth: info.width,
    originalHeight: info.height,
  };
}

async function prepareAsset(filePath, alphaThreshold = 0) {
  const bounds = await findAlphaBounds(filePath, alphaThreshold);
  return {
    path: filePath,
    name: path.basename(filePath),
    width: bounds.width,
    height: bounds.height,
    bounds,
  };
}

async function inspectWatermark(filePath) {
  const resolvedPath = path.resolve(String(filePath));
  const metadata = await inspectImage(resolvedPath);
  if (metadata.format !== 'png') {
    throw new ImageInputError(
      `Watermark “${path.basename(resolvedPath)}” phải là file PNG.`,
      resolvedPath,
      'WATERMARK_NOT_PNG',
    );
  }
  if (!metadata.hasAlpha) {
    throw new ImageInputError(
      `Watermark “${path.basename(resolvedPath)}” không có kênh trong suốt (alpha).`,
      resolvedPath,
      'WATERMARK_NO_ALPHA',
    );
  }
  const stats = await sharp(resolvedPath, {
    failOn: 'error',
    limitInputPixels: false,
  })
    .ensureAlpha()
    .stats();
  const alphaChannel = stats.channels[3];
  if (!alphaChannel || alphaChannel.min >= 255) {
    throw new ImageInputError(
      `Watermark “${path.basename(resolvedPath)}” không có pixel nền trong suốt.`,
      resolvedPath,
      'WATERMARK_FULLY_OPAQUE',
    );
  }
  await findAlphaBounds(resolvedPath, 0);
  return { ...metadata, path: resolvedPath, name: path.basename(resolvedPath) };
}

async function prepareWatermark(filePath, template) {
  const metadata = await inspectWatermark(filePath);
  const resolvedPath = metadata.path;

  const scale = Math.min(1, template.width / metadata.width, template.height / metadata.height);
  const width = Math.max(1, Math.round(metadata.width * scale));
  const height = Math.max(1, Math.round(metadata.height * scale));
  let input;
  try {
    input = await sharp(resolvedPath, {
      failOn: 'error',
      limitInputPixels: false,
    })
      .resize(width, height, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch (error) {
    throw new ImageInputError(
      `Không thể xử lý watermark “${path.basename(resolvedPath)}”: ${error.message}`,
      resolvedPath,
      'PROCESS_WATERMARK_FAILED',
    );
  }

  return {
    path: resolvedPath,
    name: path.basename(resolvedPath),
    input,
    left: Math.round((template.width - width) / 2),
    top: Math.round((template.height - height) / 2),
    width,
    height,
    blend: 'over',
  };
}

async function makeCompositeInputs(assets, layout, options = {}) {
  const { isCancelled, onItem } = options;
  const concurrency = options.transformConcurrency ?? 4;
  const runTransform = options.runTransform || createConcurrencyLimiter(concurrency);
  let completed = 0;

  return mapWithConcurrency(layout.placements, concurrency, (placement) => runTransform(async () => {
    throwIfCancelled(isCancelled);
    const asset = assets[placement.assetIndex];
    let input;
    try {
      input = await sharp(asset.path, {
        failOn: 'error',
        limitInputPixels: false,
      })
        .extract({
          left: asset.bounds.left,
          top: asset.bounds.top,
          width: asset.bounds.width,
          height: asset.bounds.height,
        })
        .resize(placement.width, placement.height, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer();
    } catch (error) {
      throw new ImageInputError(
        `Không thể xử lý “${asset.name}”: ${error.message}`,
        asset.path,
        'PROCESS_IMAGE_FAILED',
      );
    }

    completed += 1;
    if (typeof onItem === 'function') onItem(completed, assets.length, asset);
    return {
      input,
      left: placement.left,
      top: placement.top,
      blend: 'over',
    };
  }));
}

async function createCompositePipeline(templatePath, template, assets, settings, options = {}) {
  validateLayoutArea(template.width, template.height, settings);
  const layout = buildPlacements(assets, template.width, template.height, settings);
  const composites = await makeCompositeInputs(assets, layout, options);
  if (options.watermarkComposite) {
    composites.push({
      input: options.watermarkComposite.input,
      left: options.watermarkComposite.left,
      top: options.watermarkComposite.top,
      blend: 'over',
    });
  }
  throwIfCancelled(options.isCancelled);

  let pipeline = sharp(templatePath, {
    failOn: 'error',
    limitInputPixels: false,
  })
    .ensureAlpha()
    .composite(composites);

  if (options.preserveMetadata !== false) {
    if (typeof pipeline.keepMetadata === 'function') {
      pipeline = pipeline.keepMetadata();
    } else if (template.density) {
      pipeline = pipeline.withMetadata({ density: template.density });
    }
  }

  return { pipeline, layout };
}

async function stripMetadataFromFile(filePath, options = {}) {
  const cleanPath = `${filePath}.${randomUUID()}.metadata-clean`;
  try {
    throwIfCancelled(options.isCancelled);
    await sharp(filePath, {
      failOn: 'error',
      limitInputPixels: false,
    })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(cleanPath);

    const metadata = await sharp(cleanPath, {
      failOn: 'error',
      limitInputPixels: false,
    }).metadata();
    const remaining = [];
    if (metadata.comments?.length) remaining.push('Comment');
    if (metadata.exif) remaining.push('EXIF / EXIF thumbnail');
    if (metadata.xmp) remaining.push('XMP');
    if (metadata.iptc || metadata.tifftagPhotoshop) remaining.push('IPTC');
    if (metadata.icc || metadata.hasProfile) remaining.push('ICC profile');
    if (remaining.length > 0) {
      throw new Error(`Không thể xóa hoàn toàn metadata: ${remaining.join(', ')}.`);
    }

    throwIfCancelled(options.isCancelled);
    await fs.rm(filePath, { force: true });
    await fs.rename(cleanPath, filePath);
    return {
      removed: ['Comment', 'EXIF', 'XMP', 'EXIF thumbnail', 'IPTC', 'ICC profile'],
    };
  } catch (error) {
    await fs.rm(cleanPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function renderCompositeToFile(
  templatePath,
  template,
  assets,
  settings,
  outputPath,
  options = {},
) {
  const { pipeline, layout } = await createCompositePipeline(
    templatePath,
    template,
    assets,
    settings,
    options,
  );
  throwIfCancelled(options.isCancelled);
  await pipeline
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
  return layout;
}

async function renderCompositeToBuffer(templatePath, template, assets, settings, options = {}) {
  const { pipeline, layout } = await createCompositePipeline(
    templatePath,
    template,
    assets,
    settings,
    options,
  );
  const buffer = await pipeline
    .png({ compressionLevel: 8, adaptiveFiltering: true })
    .toBuffer();
  return { buffer, layout };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function chooseBatchOutputPaths(outputDir, count, prefix = 'bundle') {
  for (let revision = 1; revision < 10000; revision += 1) {
    const suffix = revision === 1 ? '' : `_${revision}`;
    const candidates = Array.from({ length: count }, (_, index) =>
      path.join(
        outputDir,
        `${prefix}_${String(index + 1).padStart(3, '0')}${suffix}.png`,
      ),
    );
    const collisionChecks = await Promise.all(candidates.map(pathExists));
    if (collisionChecks.every((exists) => !exists)) return candidates;
  }
  throw new Error('Không thể tìm tên file kết quả còn trống trong thư mục Done.');
}

function validateSourcePaths(sourcePaths) {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
    throw new LayoutError('Cần chọn ít nhất một file PNG.', 'NO_FILES');
  }
  const normalized = sourcePaths.map((filePath) => path.resolve(String(filePath)));
  const unique = new Set(normalized.map((filePath) => filePath.toLocaleLowerCase()));
  if (unique.size !== normalized.length) {
    throw new LayoutError('Danh sách đang chứa file PNG bị lặp.', 'DUPLICATE_FILE');
  }
  for (const filePath of normalized) {
    if (path.extname(filePath).toLocaleLowerCase() !== '.png') {
      throw new ImageInputError(
        `“${path.basename(filePath)}” không phải file PNG.`,
        filePath,
        'NOT_PNG',
      );
    }
  }
  return normalized;
}

async function generateMockups(options) {
  const {
    sourcePaths,
    templatePath,
    sourceDirectory,
    mockupCount,
    settings,
    watermarkPath = null,
    removeMetadata = true,
    prefix = 'bundle',
    onProgress,
    isCancelled,
  } = options;
  const concurrencyOption = (name, fallback, maximum) => {
    const value = options[name] ?? fallback;
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      throw new LayoutError('Giới hạn xử lý song song không hợp lệ.', 'INVALID_BUNDLE_CONCURRENCY');
    }
    return value;
  };
  const processingConcurrency = concurrencyOption('processingConcurrency', 2, 4);
  const sourceConcurrency = concurrencyOption('sourceConcurrency', 4, 8);
  const transformConcurrency = concurrencyOption('transformConcurrency', 4, 8);
  const metadataConcurrency = concurrencyOption('metadataConcurrency', 2, 4);
  const runTransform = createConcurrencyLimiter(transformConcurrency);

  const paths = validateSourcePaths(sourcePaths);
  const groups = splitBalanced(paths, Number(mockupCount));
  const shouldRemoveMetadata = removeMetadata !== false;
  const alphaThreshold = validateAlphaThreshold(settings.alphaThreshold ?? 0);
  const resolvedTemplate = path.resolve(String(templatePath));
  const resolvedSourceDirectory = path.resolve(String(sourceDirectory));
  const outputDir = path.join(resolvedSourceDirectory, 'Done');
  const tempPaths = [];
  const committedPaths = [];
  let reportedFraction = 0;

  const progress = (fraction, message, stage) => {
    if (typeof onProgress === 'function') {
      reportedFraction = Math.max(reportedFraction, Math.min(1, fraction));
      onProgress({ fraction: reportedFraction, message, stage });
    }
  };

  try {
    throwIfCancelled(isCancelled);
    const template = await inspectImage(resolvedTemplate);
    validateLayoutArea(template.width, template.height, settings);
    const watermark = watermarkPath
      ? await prepareWatermark(watermarkPath, template)
      : null;
    await fs.mkdir(outputDir, { recursive: true });
    const finalPaths = await chooseBatchOutputPaths(outputDir, groups.length, prefix);

    progress(0.01, 'Đang kiểm tra vùng pixel của các PNG…', 'prepare');
    let preparedCount = 0;
    const prepared = await mapWithConcurrency(paths, sourceConcurrency, async (filePath) => {
      throwIfCancelled(isCancelled);
      const asset = await prepareAsset(filePath, alphaThreshold);
      preparedCount += 1;
      progress(
        0.32 * (preparedCount / paths.length),
        `Đang đọc PNG ${preparedCount}/${paths.length}: ${path.basename(filePath)}`,
        'prepare',
      );
      return asset;
    });

    const preparedGroups = splitBalanced(prepared, groups.length);
    const jobId = randomUUID();
    let renderedAssets = 0;

    for (let pageIndex = 0; pageIndex < preparedGroups.length; pageIndex += 1) {
      tempPaths.push(path.join(
        outputDir,
        `.${prefix}-${jobId}-${String(pageIndex + 1).padStart(3, '0')}.tmp`,
      ));
    }
    const layouts = await mapWithConcurrency(preparedGroups, processingConcurrency, async (group, pageIndex) => {
      throwIfCancelled(isCancelled);
      progress(
        0.32 + 0.54 * (renderedAssets / prepared.length),
        `Đang tạo mockup ${pageIndex + 1}/${preparedGroups.length}…`,
        'compose',
      );
      const layout = await renderCompositeToFile(
        resolvedTemplate,
        template,
        group,
        settings,
        tempPaths[pageIndex],
        {
          isCancelled,
          transformConcurrency,
          runTransform,
          watermarkComposite: watermark,
          preserveMetadata: true,
          onItem: () => {
            renderedAssets += 1;
            progress(
              0.32 + 0.54 * (renderedAssets / prepared.length),
              `Đang ghép PNG ${renderedAssets}/${prepared.length} vào mockup…`,
              'compose',
            );
          },
        },
      );
      return layout;
    });

    if (shouldRemoveMetadata) {
      let metadataCount = 0;
      await mapWithConcurrency(tempPaths, metadataConcurrency, async (tempPath) => {
        throwIfCancelled(isCancelled);
        progress(
          0.86 + 0.1 * (metadataCount / tempPaths.length),
          `Đang xóa 6 nhóm Metadata ở bước cuối ${metadataCount + 1}/${tempPaths.length}…`,
          'metadata',
        );
        await stripMetadataFromFile(tempPath, { isCancelled });
        metadataCount += 1;
      });
    }

    throwIfCancelled(isCancelled);
    for (let index = 0; index < tempPaths.length; index += 1) {
      if (await pathExists(finalPaths[index])) {
        throw new Error(`File kết quả “${path.basename(finalPaths[index])}” vừa được tạo bởi tác vụ khác.`);
      }
      await fs.copyFile(tempPaths[index], finalPaths[index], fsConstants.COPYFILE_EXCL);
      committedPaths.push(finalPaths[index]);
      await fs.rm(tempPaths[index], { force: true });
      progress(
        0.96 + 0.04 * ((index + 1) / tempPaths.length),
        `Đang lưu mockup ${index + 1}/${tempPaths.length}…`,
        'save',
      );
    }

    return {
      outputDir,
      outputPaths: committedPaths,
      groupSizes: preparedGroups.map((group) => group.length),
      layouts: layouts.map((layout) => ({
        rows: layout.grid.rows,
        cols: layout.grid.cols,
        rowCounts: layout.grid.rowCounts,
      })),
      template: { width: template.width, height: template.height },
      metadataRemoved: shouldRemoveMetadata,
      removedMetadataGroups: shouldRemoveMetadata
        ? ['Comment', 'EXIF', 'XMP', 'EXIF thumbnail', 'IPTC', 'ICC profile']
        : [],
      watermarkApplied: Boolean(watermark),
      watermarkName: watermark?.name || null,
    };
  } catch (error) {
    await Promise.allSettled(tempPaths.map((tempPath) => fs.rm(tempPath, { force: true })));
    await Promise.allSettled(committedPaths.map((filePath) => fs.rm(filePath, { force: true })));
    throw error;
  }
}

async function renderPreview(options) {
  const {
    sourcePaths,
    templatePath,
    mockupCount,
    pageIndex = 0,
    settings,
    watermarkPath = null,
    isCancelled,
    onProgress,
    maxWidth = 1400,
    maxHeight = 1000,
  } = options;

  const paths = validateSourcePaths(sourcePaths);
  const groups = splitBalanced(paths, Number(mockupCount));
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= groups.length) {
    throw new LayoutError('Trang xem trước không hợp lệ.', 'INVALID_PAGE');
  }
  const alphaThreshold = validateAlphaThreshold(settings.alphaThreshold ?? 0);
  const template = await inspectImage(templatePath);
  validateLayoutArea(template.width, template.height, settings);
  const watermark = watermarkPath
    ? await prepareWatermark(watermarkPath, template)
    : null;
  const group = groups[pageIndex];
  let preparedCount = 0;

  const prepared = await mapWithConcurrency(group, 4, async (filePath) => {
    throwIfCancelled(isCancelled);
    const asset = await prepareAsset(filePath, alphaThreshold);
    preparedCount += 1;
    if (typeof onProgress === 'function') {
      onProgress({
        fraction: 0.45 * (preparedCount / group.length),
        message: `Đang chuẩn bị preview ${preparedCount}/${group.length}…`,
        stage: 'preview',
      });
    }
    return asset;
  });

  const rendered = await renderCompositeToBuffer(
    templatePath,
    template,
    prepared,
    settings,
    {
      isCancelled,
      watermarkComposite: watermark,
      preserveMetadata: false,
      onItem: (current, total) => {
        if (typeof onProgress === 'function') {
          onProgress({
            fraction: 0.45 + 0.45 * (current / total),
            message: `Đang ghép preview ${current}/${total}…`,
            stage: 'preview',
          });
        }
      },
    },
  );

  throwIfCancelled(isCancelled);
  const previewBuffer = await sharp(rendered.buffer)
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 7 })
    .toBuffer();

  if (typeof onProgress === 'function') {
    onProgress({ fraction: 1, message: 'Đã tạo xong preview.', stage: 'preview' });
  }

  return {
    buffer: previewBuffer,
    groupSizes: groups.map((groupPaths) => groupPaths.length),
    pageIndex,
    pageCount: groups.length,
    layout: {
      rows: rendered.layout.grid.rows,
      cols: rendered.layout.grid.cols,
      rowCounts: rendered.layout.grid.rowCounts,
    },
    template: { width: template.width, height: template.height },
  };
}

module.exports = {
  ImageInputError,
  GenerationCancelledError,
  inspectImage,
  findAlphaBounds,
  prepareAsset,
  inspectWatermark,
  prepareWatermark,
  stripMetadataFromFile,
  renderCompositeToFile,
  renderCompositeToBuffer,
  chooseBatchOutputPaths,
  generateMockups,
  renderPreview,
};
