'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const {
  findAlphaBounds,
  prepareWatermark,
  generateMockups,
} = require('../src/engine/image-engine');

async function createTransparentAsset(filePath, color, options = {}) {
  const width = options.width || 100;
  const height = options.height || 90;
  const left = options.left ?? 20;
  const top = options.top ?? 15;
  const contentWidth = options.contentWidth || 50;
  const contentHeight = options.contentHeight || 40;
  const content = await sharp({
    create: {
      width: contentWidth,
      height: contentHeight,
      channels: 4,
      background: color,
    },
  }).png().toBuffer();
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left, top }])
    .png()
    .toFile(filePath);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

async function addPngComment(filePath, comment) {
  const input = await fs.readFile(filePath);
  let offset = 8;
  let iendOffset = -1;
  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString('ascii', offset + 4, offset + 8);
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset += 12 + length;
  }
  assert.ok(iendOffset > 0, 'PNG fixture phải có chunk IEND');
  const textData = Buffer.from(`Comment\0${comment}`, 'latin1');
  const output = Buffer.concat([
    input.subarray(0, iendOffset),
    pngChunk('tEXt', textData),
    input.subarray(iendOffset),
  ]);
  await fs.writeFile(filePath, output);
}

function pngChunkTypes(buffer) {
  const types = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    types.push(buffer.toString('ascii', offset + 4, offset + 8));
    offset += 12 + length;
  }
  return types;
}

test('Bundle song song giữ nguyên byte PNG, bố cục, thứ tự, watermark và metadata', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-parallel-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const templatePath = path.join(directory, 'template.png');
  await sharp({ create: { width: 360, height: 500, channels: 3, background: '#eeeeee' } })
    .withMetadata({ density: 300 }).png().toFile(templatePath);
  const watermarkPath = path.join(directory, 'watermark.png');
  await createTransparentAsset(watermarkPath, { r: 12, g: 34, b: 200, alpha: 0.4 });
  const sourcePaths = [];
  for (let i = 0; i < 11; i += 1) {
    const sourcePath = path.join(directory, `design-${i}.png`);
    await createTransparentAsset(sourcePath, { r: 20 + i * 20, g: 80, b: 210 - i * 10, alpha: 0.8 }, { contentWidth: 35 + i, contentHeight: 30 + i });
    sourcePaths.push(sourcePath);
  }
  for (const removeMetadata of [true, false]) {
    const options = {
      sourcePaths, templatePath, watermarkPath, mockupCount: 4, removeMetadata,
      settings: { topMargin: 30, bottomMargin: 30, sideMargin: 20, gap: 12, alphaThreshold: 0 },
    };
    const serial = await generateMockups({ ...options, sourceDirectory: path.join(directory, `serial-${removeMetadata}`), processingConcurrency: 1, sourceConcurrency: 1, transformConcurrency: 1, metadataConcurrency: 1 });
    const progress = [];
    const parallel = await generateMockups({ ...options, sourceDirectory: path.join(directory, `parallel-${removeMetadata}`), onProgress: (value) => progress.push(value.fraction) });
    assert.deepEqual(parallel.groupSizes, [3, 3, 3, 2]);
    assert.deepEqual(parallel.layouts, serial.layouts);
    for (let i = 0; i < serial.outputPaths.length; i += 1) {
      assert.equal(path.basename(serial.outputPaths[i]), path.basename(parallel.outputPaths[i]));
      assert.deepEqual(await fs.readFile(serial.outputPaths[i]), await fs.readFile(parallel.outputPaths[i]));
    }
    assert.ok(progress.every((value, i) => i === 0 || value >= progress[i - 1]));
    assert.equal(progress.at(-1), 1);
  }
});

test('Bundle hủy khi đang ghép song song chờ worker dừng trước khi dọn file tạm', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-cancel-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const templatePath = path.join(directory, 'template.png');
  await sharp({ create: { width: 360, height: 500, channels: 3, background: '#eeeeee' } }).png().toFile(templatePath);
  const sourcePaths = [];
  for (let i = 0; i < 8; i += 1) {
    const sourcePath = path.join(directory, `design-${i}.png`);
    await createTransparentAsset(sourcePath, { r: 200, g: 30, b: 50, alpha: 1 });
    sourcePaths.push(sourcePath);
  }
  let cancelled = false;
  await assert.rejects(generateMockups({
    sourcePaths, templatePath, sourceDirectory: directory, mockupCount: 4,
    settings: { topMargin: 30, bottomMargin: 30, sideMargin: 20, gap: 12, alphaThreshold: 0 },
    isCancelled: () => cancelled,
    onProgress: (value) => { if (value.stage === 'compose' && value.fraction > 0.32) cancelled = true; },
  }), { code: 'CANCELLED' });
  assert.deepEqual(await fs.readdir(path.join(directory, 'Done')), []);
});

test('Bundle từ chối giới hạn song song không hợp lệ', async () => {
  for (const name of ['processingConcurrency', 'sourceConcurrency', 'transformConcurrency', 'metadataConcurrency']) {
    await assert.rejects(generateMockups({ [name]: 0 }), { code: 'INVALID_BUNDLE_CONCURRENCY' });
  }
});

test('findAlphaBounds bỏ chính xác canvas trong suốt quanh thiết kế', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-bounds-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'padded.png');
  await createTransparentAsset(filePath, { r: 255, g: 0, b: 0, alpha: 1 / 255 }, {
    width: 120,
    height: 100,
    left: 31,
    top: 17,
    contentWidth: 54,
    contentHeight: 46,
  });

  const bounds = await findAlphaBounds(filePath, 0);
  assert.deepEqual(bounds, {
    left: 31,
    top: 17,
    width: 54,
    height: 46,
    originalWidth: 120,
    originalHeight: 100,
  });
  await assert.rejects(() => findAlphaBounds(filePath, 1), /hoàn toàn trong suốt/);
});

test('generateMockups chia nhóm, giữ kích thước nền và không ghi đè kết quả cũ', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-generate-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const templatePath = path.join(directory, 'template.jpg');
  await sharp({
    create: {
      width: 360,
      height: 500,
      channels: 3,
      background: { r: 242, g: 242, b: 242 },
    },
  })
    .jpeg({ quality: 95 })
    .toFile(templatePath);

  const colors = [
    { r: 230, g: 20, b: 20, alpha: 1 },
    { r: 20, g: 190, b: 50, alpha: 1 },
    { r: 20, g: 90, b: 230, alpha: 1 },
    { r: 230, g: 150, b: 20, alpha: 1 },
    { r: 170, g: 30, b: 210, alpha: 1 },
  ];
  const sourcePaths = [];
  for (let index = 0; index < colors.length; index += 1) {
    const filePath = path.join(directory, `design-${index + 1}.png`);
    await createTransparentAsset(filePath, colors[index]);
    sourcePaths.push(filePath);
  }

  const options = {
    sourcePaths,
    templatePath,
    sourceDirectory: directory,
    mockupCount: 2,
    settings: {
      topMargin: 50,
      bottomMargin: 50,
      sideMargin: 20,
      gap: 16,
      alphaThreshold: 0,
    },
  };
  const first = await generateMockups(options);
  assert.deepEqual(first.groupSizes, [3, 2]);
  assert.equal(first.outputPaths.length, 2);
  assert.deepEqual(
    first.outputPaths.map((filePath) => path.basename(filePath)),
    ['bundle_001.png', 'bundle_002.png'],
  );
  for (const outputPath of first.outputPaths) {
    const metadata = await sharp(outputPath).metadata();
    assert.equal(metadata.width, 360);
    assert.equal(metadata.height, 500);
  }

  const second = await generateMockups(options);
  assert.deepEqual(
    second.outputPaths.map((filePath) => path.basename(filePath)),
    ['bundle_001_2.png', 'bundle_002_2.png'],
  );
  const doneEntries = await fs.readdir(path.join(directory, 'Done'));
  assert.equal(doneEntries.filter((name) => name.endsWith('.png')).length, 4);
  assert.equal(doneEntries.some((name) => name.endsWith('.tmp')), false);
});

test('watermark PNG được căn giữa và phủ trên lớp thiết kế', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-watermark-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const templatePath = path.join(directory, 'template.png');
  await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).png().toFile(templatePath);

  const designPath = path.join(directory, 'design.png');
  await createTransparentAsset(designPath, { r: 230, g: 20, b: 20, alpha: 1 }, {
    width: 120,
    height: 120,
    left: 10,
    top: 10,
    contentWidth: 100,
    contentHeight: 100,
  });
  const watermarkPath = path.join(directory, 'watermark.png');
  await createTransparentAsset(watermarkPath, { r: 10, g: 40, b: 240, alpha: 1 }, {
    width: 40,
    height: 40,
    left: 10,
    top: 10,
    contentWidth: 20,
    contentHeight: 20,
  });

  const result = await generateMockups({
    sourcePaths: [designPath],
    templatePath,
    watermarkPath,
    sourceDirectory: directory,
    mockupCount: 1,
    removeMetadata: true,
    settings: {
      topMargin: 50,
      bottomMargin: 50,
      sideMargin: 50,
      gap: 0,
      alphaThreshold: 0,
    },
  });
  assert.equal(result.watermarkApplied, true);
  assert.equal(result.watermarkName, 'watermark.png');

  const { data, info } = await sharp(result.outputPaths[0])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const centerOffset = (150 * info.width + 150) * info.channels;
  assert.deepEqual([...data.subarray(centerOffset, centerOffset + 4)], [10, 40, 240, 255]);
  const outsideWatermarkOffset = (100 * info.width + 100) * info.channels;
  assert.deepEqual([...data.subarray(outsideWatermarkOffset, outsideWatermarkOffset + 3)], [230, 20, 20]);
});

test('từ chối watermark không phải PNG hoặc không có pixel nền trong suốt', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-watermark-invalid-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const template = { width: 200, height: 200 };

  const opaquePath = path.join(directory, 'opaque.png');
  await sharp({
    create: {
      width: 30,
      height: 30,
      channels: 4,
      background: { r: 20, g: 30, b: 40, alpha: 1 },
    },
  }).png().toFile(opaquePath);
  await assert.rejects(
    () => prepareWatermark(opaquePath, template),
    (error) => error.code === 'WATERMARK_FULLY_OPAQUE',
  );

  const fakePngPath = path.join(directory, 'actually-jpeg.png');
  await sharp({
    create: {
      width: 30,
      height: 30,
      channels: 3,
      background: { r: 220, g: 220, b: 220 },
    },
  }).jpeg().toFile(fakePngPath);
  await assert.rejects(
    () => prepareWatermark(fakePngPath, template),
    (error) => error.code === 'WATERMARK_NOT_PNG',
  );
});

test('xóa Metadata là bước cuối và loại Comment, EXIF, XMP, IPTC, ICC profile', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-metadata-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const templatePath = path.join(directory, 'template-with-metadata.png');
  const xmp = '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></x:xmpmeta><?xpacket end="w"?>';
  await sharp({
    create: {
      width: 240,
      height: 240,
      channels: 4,
      background: { r: 245, g: 245, b: 245, alpha: 1 },
    },
  })
    .withExif({
      IFD0: { ImageDescription: 'secret-exif' },
      IFD1: { ImageDescription: 'thumbnail-marker' },
    })
    .withXmp(xmp)
    .withIccProfile('srgb')
    .png()
    .toFile(templatePath);
  await addPngComment(templatePath, 'secret-comment');

  const templateMetadata = await sharp(templatePath).metadata();
  assert.ok(pngChunkTypes(await fs.readFile(templatePath)).includes('tEXt'));
  assert.ok(templateMetadata.exif);
  assert.ok(templateMetadata.xmp);
  assert.ok(templateMetadata.icc || templateMetadata.hasProfile);

  const designPath = path.join(directory, 'design.png');
  await createTransparentAsset(designPath, { r: 40, g: 180, b: 90, alpha: 1 });
  const result = await generateMockups({
    sourcePaths: [designPath],
    templatePath,
    sourceDirectory: directory,
    mockupCount: 1,
    removeMetadata: true,
    settings: {
      topMargin: 30,
      bottomMargin: 30,
      sideMargin: 30,
      gap: 0,
      alphaThreshold: 0,
    },
  });

  assert.equal(result.metadataRemoved, true);
  assert.deepEqual(result.removedMetadataGroups, [
    'Comment',
    'EXIF',
    'XMP',
    'EXIF thumbnail',
    'IPTC',
    'ICC profile',
  ]);
  const outputMetadata = await sharp(result.outputPaths[0]).metadata();
  const outputChunkTypes = pngChunkTypes(await fs.readFile(result.outputPaths[0]));
  assert.equal(outputChunkTypes.some((type) => ['tEXt', 'iTXt', 'zTXt'].includes(type)), false);
  assert.equal(outputMetadata.comments, undefined);
  assert.equal(outputMetadata.exif, undefined);
  assert.equal(outputMetadata.xmp, undefined);
  assert.equal(outputMetadata.iptc, undefined);
  assert.equal(outputMetadata.icc, undefined);
  assert.equal(outputMetadata.hasProfile, false);

  const preserved = await generateMockups({
    sourcePaths: [designPath],
    templatePath,
    sourceDirectory: directory,
    mockupCount: 1,
    removeMetadata: false,
    settings: {
      topMargin: 30,
      bottomMargin: 30,
      sideMargin: 30,
      gap: 0,
      alphaThreshold: 0,
    },
  });
  assert.equal(preserved.metadataRemoved, false);
  const preservedMetadata = await sharp(preserved.outputPaths[0]).metadata();
  assert.ok(preservedMetadata.exif);
  assert.ok(preservedMetadata.xmp);
  assert.ok(preservedMetadata.icc || preservedMetadata.hasProfile);
});
