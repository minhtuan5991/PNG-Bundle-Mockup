'use strict';

const fs = require('node:fs/promises');
const fsConstants = require('node:fs').constants;
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
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
  const composites = [];
  const { isCancelled, onItem } = options;

  for (let index = 0; index < layout.placements.length; index += 1) {
    throwIfCancelled(isCancelled);
    const placement = layout.placements[index];
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

    composites.push({
      input,
      left: placement.left,
      top: placement.top,
      blend: 'over',
    });
    if (typeof onItem === 'function') onItem(index + 1, assets.length, asset);
  }

  return composites;
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

  const paths = validateSourcePaths(sourcePaths);
  const groups = splitBalanced(paths, Number(mockupCount));
  const shouldRemoveMetadata = removeMetadata !== false;
  const alphaThreshold = validateAlphaThreshold(settings.alphaThreshold ?? 0);
  const resolvedTemplate = path.resolve(String(templatePath));
  const resolvedSourceDirectory = path.resolve(String(sourceDirectory));
  const outputDir = path.join(resolvedSourceDirectory, 'Done');
  const tempPaths = [];
  const committedPaths = [];

  const progress = (fraction, message, stage) => {
    if (typeof onProgress === 'function') {
      onProgress({ fraction: Math.max(0, Math.min(1, fraction)), message, stage });
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
    const prepared = [];
    for (let index = 0; index < paths.length; index += 1) {
      throwIfCancelled(isCancelled);
      prepared.push(await prepareAsset(paths[index], alphaThreshold));
      progress(
        0.32 * ((index + 1) / paths.length),
        `Đang đọc PNG ${index + 1}/${paths.length}: ${path.basename(paths[index])}`,
        'prepare',
      );
    }

    const preparedGroups = splitBalanced(prepared, groups.length);
    const layouts = [];
    const jobId = randomUUID();
    let renderedAssets = 0;

    for (let pageIndex = 0; pageIndex < preparedGroups.length; pageIndex += 1) {
      throwIfCancelled(isCancelled);
      const tempPath = path.join(
        outputDir,
        `.${prefix}-${jobId}-${String(pageIndex + 1).padStart(3, '0')}.tmp`,
      );
      tempPaths.push(tempPath);
      const group = preparedGroups[pageIndex];
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
        tempPath,
        {
          isCancelled,
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
      layouts.push(layout);
    }

    if (shouldRemoveMetadata) {
      for (let index = 0; index < tempPaths.length; index += 1) {
        throwIfCancelled(isCancelled);
        progress(
          0.86 + 0.1 * (index / tempPaths.length),
          `Đang xóa 6 nhóm Metadata ở bước cuối ${index + 1}/${tempPaths.length}…`,
          'metadata',
        );
        await stripMetadataFromFile(tempPaths[index], { isCancelled });
      }
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
  const prepared = [];

  for (let index = 0; index < group.length; index += 1) {
    throwIfCancelled(isCancelled);
    prepared.push(await prepareAsset(group[index], alphaThreshold));
    if (typeof onProgress === 'function') {
      onProgress({
        fraction: 0.45 * ((index + 1) / group.length),
        message: `Đang chuẩn bị preview ${index + 1}/${group.length}…`,
        stage: 'preview',
      });
    }
  }

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
