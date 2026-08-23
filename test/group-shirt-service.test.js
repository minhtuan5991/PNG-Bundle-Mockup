'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const {
  GroupShirtError,
  GroupShirtCancelledError,
  normalizedRegion,
  renderGroupShirtOutputToBuffer,
  renderGroupShirtPreview,
  generateGroupShirtMockups,
} = require('../src/services/group-shirt-service');

async function createTempDirectory(t, prefix = 'group-shirt-service-') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    sharp.cache(false);
    await fs.rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 50,
    });
  });
  return directory;
}

async function createTemplate(filePath, options = {}) {
  let pipeline = sharp({
    create: {
      width: options.width || 200,
      height: options.height || 200,
      channels: 4,
      background: options.background || { r: 245, g: 245, b: 245, alpha: 1 },
    },
  });
  if (options.metadata) {
    const xmp = '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></x:xmpmeta><?xpacket end="w"?>';
    pipeline = pipeline
      .withExif({ IFD0: { ImageDescription: 'group-shirt-secret' } })
      .withXmp(xmp)
      .withIccProfile('srgb');
  }
  await pipeline.png().toFile(filePath);
}

async function createPaddedDesign(filePath, options = {}) {
  const width = options.width || 20;
  const height = options.height || 40;
  const content = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: options.color || { r: 230, g: 25, b: 35, alpha: 1 },
    },
  }).png().toBuffer();
  await sharp({
    create: {
      width: options.canvasWidth || 100,
      height: options.canvasHeight || 100,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{
      input: content,
      left: options.left ?? 65,
      top: options.top ?? 25,
    }])
    .png()
    .toFile(filePath);
}

async function createWatermark(filePath, width = 200, height = 200, mark = {}) {
  const patch = await sharp({
    create: {
      width: mark.width || 24,
      height: mark.height || 24,
      channels: 4,
      background: mark.color || { r: 15, g: 50, b: 235, alpha: 1 },
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
    .composite([{
      input: patch,
      left: mark.left ?? Math.round((width - (mark.width || 24)) / 2),
      top: mark.top ?? Math.round((height - (mark.height || 24)) / 2),
    }])
    .png()
    .toFile(filePath);
}

async function rgbaAt(input, x, y) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 4)];
}

let generatedRegionId = 0;

function assignment(sourcePath, region = {}) {
  generatedRegionId += 1;
  return {
    source: { path: sourcePath, name: path.basename(sourcePath) },
    region: {
      id: region.id || `region-${generatedRegionId}`,
      side: region.side || 'front',
      color: region.color || 'wh',
      centerX: region.centerX ?? 0.5,
      centerY: region.centerY ?? 0.5,
      width: region.width ?? 0.35,
      height: region.height ?? 0.4,
      rotation: region.rotation ?? 0,
    },
  };
}

function plannedOutput(templatePath, assignments, options = {}) {
  return {
    template: {
      path: templatePath,
      name: path.basename(templatePath),
      groupKey: options.groupKey || '1',
      color: options.color || 'wh',
    },
    groupKey: options.groupKey || '1',
    color: options.color || 'wh',
    pageIndex: options.pageIndex ?? 0,
    assignments,
  };
}

test('compositor crop alpha, xoay quanh tâm và giữ PNG trong đúng vùng in', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, '1 mgs.png');
  const sourcePath = path.join(directory, '1 (1).wh.f.png');
  await createTemplate(templatePath);
  await createPaddedDesign(sourcePath, {
    width: 10,
    height: 40,
    left: 73,
    top: 19,
    color: { r: 225, g: 25, b: 35, alpha: 1 },
  });

  const output = plannedOutput(templatePath, [assignment(sourcePath, {
    id: 'front-1',
    centerX: 0.5,
    centerY: 0.5,
    width: 0.35,
    height: 0.4,
    rotation: 90,
  })]);
  const rendered = await renderGroupShirtOutputToBuffer({ output });

  assert.deepEqual(await rgbaAt(rendered.buffer, 125, 100), [225, 25, 35, 255]);
  assert.deepEqual(await rgbaAt(rendered.buffer, 100, 135), [245, 245, 245, 255]);
  assert.equal(rendered.template.width, 200);
  assert.equal(rendered.template.height, 200);
});

test('watermark luôn là lớp trên cùng sau tất cả vùng in', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, '1 mgs.png');
  const sourcePath = path.join(directory, '1 (1).png');
  const watermarkPath = path.join(directory, 'watermark.png');
  await Promise.all([
    createTemplate(templatePath),
    createPaddedDesign(sourcePath, {
      width: 40,
      height: 40,
      left: 30,
      top: 30,
      color: { r: 235, g: 25, b: 30, alpha: 1 },
    }),
    createWatermark(watermarkPath),
  ]);

  const output = plannedOutput(templatePath, [assignment(sourcePath, {
    id: 'front-centre',
    width: 0.35,
    height: 0.4,
  })]);
  const withoutWatermark = await renderGroupShirtOutputToBuffer({ output });
  const withWatermark = await renderGroupShirtOutputToBuffer({ output, watermarkPath });

  assert.deepEqual(await rgbaAt(withoutWatermark.buffer, 100, 100), [235, 25, 30, 255]);
  assert.deepEqual(await rgbaAt(withWatermark.buffer, 100, 100), [15, 50, 235, 255]);
  assert.equal(withWatermark.watermarkApplied, true);
});

test('nền JPEG/TIFF dùng kích thước auto-orient và output bỏ EXIF Orientation', async (t) => {
  const directory = await createTempDirectory(t, 'group-shirt-orientation-');
  const outputDirectory = path.join(directory, 'Done');
  const jpegTemplate = path.join(directory, '1 mgs.jpg');
  const tiffTemplate = path.join(directory, '2 mgs.tiff');
  const sourcePath = path.join(directory, '1 (1).png');
  const jpeg = sharp({
    create: {
      width: 40,
      height: 20,
      channels: 3,
      background: { r: 245, g: 245, b: 245 },
    },
  }).jpeg().withMetadata({ orientation: 6 }).toFile(jpegTemplate);
  const tiff = sharp({
    create: {
      width: 60,
      height: 30,
      channels: 3,
      background: { r: 235, g: 235, b: 235 },
    },
  }).tiff().withMetadata({ orientation: 6 }).toFile(tiffTemplate);
  await Promise.all([jpeg, tiff, createPaddedDesign(sourcePath)]);

  const result = await generateGroupShirtMockups({
    plan: {
      outputs: [
        plannedOutput(jpegTemplate, [assignment(sourcePath, {
          id: 'jpeg-front', width: 0.35, height: 0.2,
        })]),
        plannedOutput(tiffTemplate, [assignment(sourcePath, {
          id: 'tiff-front', width: 0.35, height: 0.2,
        })], { groupKey: '2' }),
      ],
    },
    outputDirectory,
  });

  const [jpegMetadata, tiffMetadata] = await Promise.all(
    result.outputPaths.map((filePath) => sharp(filePath).metadata()),
  );
  assert.deepEqual(
    [jpegMetadata.width, jpegMetadata.height, jpegMetadata.orientation],
    [20, 40, undefined],
  );
  assert.deepEqual(
    [tiffMetadata.width, tiffMetadata.height, tiffMetadata.orientation],
    [30, 60, undefined],
  );
});

test('generate hỗ trợ nhiều variant, xóa metadata cuối, giữ metadata khi tắt và không ghi đè', async (t) => {
  const directory = await createTempDirectory(t);
  const outputDirectory = path.join(directory, 'Done');
  const templateOne = path.join(directory, '1 mgs.png');
  const templateTwo = path.join(directory, '1 mgs alternative.png');
  const sourcePath = path.join(directory, '1 (1).wh.f.png');
  await Promise.all([
    createTemplate(templateOne, { metadata: true }),
    createTemplate(templateTwo, { metadata: true, background: { r: 230, g: 230, b: 230, alpha: 1 } }),
    createPaddedDesign(sourcePath),
  ]);
  const plan = {
    outputs: [
      plannedOutput(templateOne, [assignment(sourcePath, { id: 'front-a' })]),
      plannedOutput(templateTwo, [assignment(sourcePath, { id: 'front-b' })]),
    ],
    warnings: [{ code: 'TEST_WARNING' }],
  };

  const first = await generateGroupShirtMockups({ plan, outputDirectory, removeMetadata: true });
  const second = await generateGroupShirtMockups({ plan, outputDirectory, removeMetadata: true });
  const preserved = await generateGroupShirtMockups({
    plan,
    outputDirectory,
    removeMetadata: false,
  });

  assert.equal(first.outputCount, 2);
  assert.equal(second.outputCount, 2);
  assert.equal(preserved.outputCount, 2);
  assert.equal(new Set([
    ...first.outputPaths,
    ...second.outputPaths,
    ...preserved.outputPaths,
  ]).size, 6);
  assert.ok(second.outputPaths.every((filePath) => /_2\.png$/i.test(filePath)));
  assert.ok(preserved.outputPaths.every((filePath) => /_3\.png$/i.test(filePath)));
  assert.deepEqual(first.removedMetadataGroups, [
    'Comment', 'EXIF', 'XMP', 'EXIF thumbnail', 'IPTC', 'ICC profile',
  ]);
  assert.equal(preserved.metadataRemoved, false);
  assert.deepEqual(preserved.removedMetadataGroups, []);
  assert.deepEqual(first.warnings, [{ code: 'TEST_WARNING' }]);
  for (const filePath of [...first.outputPaths, ...second.outputPaths]) {
    const metadata = await sharp(filePath).metadata();
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
    assert.equal(metadata.iptc, undefined);
    assert.equal(metadata.icc, undefined);
  }
  for (const filePath of preserved.outputPaths) {
    const metadata = await sharp(filePath).metadata();
    assert.ok(metadata.exif, 'EXIF của ảnh nền phải được giữ khi bỏ chọn Xóa Metadata');
    assert.ok(metadata.xmp, 'XMP của ảnh nền phải được giữ khi bỏ chọn Xóa Metadata');
    assert.ok(metadata.icc, 'ICC profile của ảnh nền phải được giữ khi bỏ chọn Xóa Metadata');
  }
});

test('service tích hợp planner: 6 mặt trước + 6 mặt sau trên 3+3 vùng tạo đúng 2 ảnh', async (t) => {
  const directory = await createTempDirectory(t);
  const outputDirectory = path.join(directory, 'Done');
  const templatePath = path.join(directory, '1 mgs.png');
  await createTemplate(templatePath, { width: 300, height: 240 });
  const sourcePaths = [];
  for (const side of ['f', 'b']) {
    for (let ordinal = 1; ordinal <= 6; ordinal += 1) {
      const sourcePath = path.join(directory, `1 (${ordinal}).wh.${side}.png`);
      sourcePaths.push(sourcePath);
      await createPaddedDesign(sourcePath, {
        color: side === 'f'
          ? { r: 225, g: 35, b: 40, alpha: 1 }
          : { r: 20, g: 105, b: 225, alpha: 1 },
      });
    }
  }
  const regions = [];
  for (const [side, centerY] of [['front', 0.3], ['back', 0.7]]) {
    for (let index = 0; index < 3; index += 1) {
      regions.push({
        id: `${side}-${index + 1}`,
        side,
        centerX: 0.2 + index * 0.3,
        centerY,
        width: 0.175,
        height: 0.25,
        rotation: 0,
      });
    }
  }

  const result = await generateGroupShirtMockups({
    sourcePaths,
    templates: [{
      path: templatePath,
      name: path.basename(templatePath),
      width: 300,
      height: 240,
      group: '1',
      groupKey: '1',
      color: 'wh',
      regions,
    }],
    outputDirectory,
  });

  assert.equal(result.outputCount, 2);
  assert.deepEqual(result.outputs.map((output) => output.assignmentCount), [6, 6]);
  assert.deepEqual(result.outputs.map((output) => output.batchIndex), [0, 1]);
  assert.ok(result.outputPaths[0].endsWith('_001.png'));
  assert.ok(result.outputPaths[1].endsWith('_002.png'));
});

test('preview dùng đúng outputIndex, giới hạn kích thước và báo tiến độ hoàn tất', async (t) => {
  const directory = await createTempDirectory(t);
  const firstTemplate = path.join(directory, '1 mgs.png');
  const secondTemplate = path.join(directory, '2 mgs.png');
  const firstSource = path.join(directory, '1 (1).png');
  const secondSource = path.join(directory, '2 (1).png');
  await Promise.all([
    createTemplate(firstTemplate, { width: 300, height: 180 }),
    createTemplate(secondTemplate, { width: 240, height: 200 }),
    createPaddedDesign(firstSource),
    createPaddedDesign(secondSource, { color: { r: 20, g: 100, b: 230, alpha: 1 } }),
  ]);
  const progress = [];
  const preview = await renderGroupShirtPreview({
    plan: {
      outputs: [
        plannedOutput(firstTemplate, [assignment(firstSource, { id: 'one' })]),
        plannedOutput(secondTemplate, [assignment(secondSource, {
          id: 'two', width: 0.2916666666666667, height: 0.4,
        })], { groupKey: '2' }),
      ],
    },
    outputIndex: 1,
    maxWidth: 100,
    maxHeight: 100,
    onProgress: (value) => progress.push(value),
  });

  assert.equal(preview.pageIndex, 1);
  assert.equal(preview.pageCount, 2);
  assert.deepEqual(preview.preview, { width: 100, height: 83 });
  assert.equal(preview.template.name, '2 mgs.png');
  assert.equal(progress.at(-1).fraction, 1);
  assert.equal(progress.at(-1).stage, 'group-shirt-preview');
});

test('hủy giữa batch sẽ dọn sạch temp và không giữ output dở dang', async (t) => {
  const directory = await createTempDirectory(t);
  const outputDirectory = path.join(directory, 'Done');
  const templatePath = path.join(directory, '1 mgs.png');
  const firstSource = path.join(directory, '1 (1).wh.f.png');
  const secondSource = path.join(directory, '1 (2).wh.f.png');
  await Promise.all([
    createTemplate(templatePath),
    createPaddedDesign(firstSource),
    createPaddedDesign(secondSource, { color: { r: 20, g: 110, b: 225, alpha: 1 } }),
  ]);
  let cancelled = false;
  const promise = generateGroupShirtMockups({
    plan: {
      outputs: [
        plannedOutput(templatePath, [assignment(firstSource, { id: 'one' })], { pageIndex: 0 }),
        plannedOutput(templatePath, [assignment(secondSource, { id: 'two' })], { pageIndex: 1 }),
      ],
    },
    outputDirectory,
    isCancelled: () => cancelled,
    onProgress: (value) => {
      if (value.stage === 'group-shirt-compose' && /1\/2/.test(value.message)) cancelled = true;
    },
  });

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof GroupShirtCancelledError);
    assert.equal(error.code, 'CANCELLED');
    return true;
  });
  const entries = await fs.readdir(outputDirectory).catch(() => []);
  assert.deepEqual(entries, []);
});

test('rollback toàn bộ khi một PNG nguồn không thể đọc', async (t) => {
  const directory = await createTempDirectory(t);
  const outputDirectory = path.join(directory, 'Done');
  const templatePath = path.join(directory, '1 mgs.png');
  const validSource = path.join(directory, '1 (1).png');
  const missingSource = path.join(directory, '1 (2).png');
  await Promise.all([createTemplate(templatePath), createPaddedDesign(validSource)]);

  await assert.rejects(
    generateGroupShirtMockups({
      plan: {
        outputs: [
          plannedOutput(templatePath, [assignment(validSource, { id: 'one' })], { pageIndex: 0 }),
          plannedOutput(templatePath, [assignment(missingSource, { id: 'two' })], { pageIndex: 1 }),
        ],
      },
      outputDirectory,
    }),
    (error) => error instanceof GroupShirtError && error.code === 'INVALID_GROUP_SHIRT_SOURCE',
  );
  const entries = await fs.readdir(outputDirectory).catch(() => []);
  assert.deepEqual(entries, []);
});

test('service cho phép lặp source ngẫu nhiên nhưng vẫn từ chối region lặp', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, '1 mgs.png');
  const sourcePath = path.join(directory, '1 (1).png');
  await Promise.all([createTemplate(templatePath), createPaddedDesign(sourcePath)]);

  const repeated = await renderGroupShirtOutputToBuffer({
    output: plannedOutput(templatePath, [
      assignment(sourcePath, { id: 'front-1', centerX: 0.3 }),
      assignment(sourcePath, { id: 'front-2', centerX: 0.7 }),
    ]),
  });
  assert.equal(repeated.output.assignments.length, 2);
  const otherSource = path.join(directory, '1 (2).png');
  await createPaddedDesign(otherSource);
  await assert.rejects(
    renderGroupShirtOutputToBuffer({
      output: plannedOutput(templatePath, [
        assignment(sourcePath, { id: 'same', centerX: 0.3 }),
        assignment(otherSource, { id: 'same', centerX: 0.7 }),
      ]),
    }),
    (error) => error.code === 'DUPLICATE_REGION_IN_GROUP_SHIRT_OUTPUT',
  );
});

test('vùng xoay vượt mép ảnh bị chặn trước khi compositor chạy', () => {
  assert.throws(
    () => normalizedRegion({
      id: 'outside',
      side: 'front',
      centerX: 0.9,
      centerY: 0.5,
      width: 0.35,
      height: 0.4,
      rotation: 45,
    }, {
      path: 'template.png',
      width: 200,
      height: 200,
    }),
    (error) => error.code === 'ROTATED_GROUP_SHIRT_REGION_OUT_OF_BOUNDS',
  );
});
