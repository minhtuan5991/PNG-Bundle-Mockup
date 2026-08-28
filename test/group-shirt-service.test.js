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
  chooseGroupShirtOutputPaths,
  renderGroupShirtOutputToBuffer,
  renderGroupShirtPreview,
  generateGroupShirtMockups,
} = require('../src/services/group-shirt-service');
const { findExistingSingleMockupOutputs } = require('../src/services/single-mockup-service');
const { createGroupShirtPlan } = require('../src/services/group-shirt-planner');

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
    group: options.group,
    displayGroup: options.displayGroup,
    color: options.color || 'wh',
    pageIndex: options.pageIndex ?? 0,
    assignments,
  };
}

test('tên output gồm nhóm PNG, tên mockup và số thứ tự riêng cho từng cặp tên', async (t) => {
  const directory = await createTempDirectory(t);
  const first = plannedOutput(path.join(directory, 'Áo trắng.mgs.jpg'), [], {
    groupKey: 'gia đình', displayGroup: 'Gia Đình', pageIndex: 9,
  });
  const otherGroup = { ...first, groupKey: 'friends', displayGroup: 'Friends' };
  const otherTemplate = plannedOutput(path.join(directory, 'Áo đen.mgs.png'), [], {
    groupKey: 'gia đình', group: 'Gia Đình',
  });
  const sameTemplateName = {
    ...first,
    template: { path: path.join(directory, 'other', 'Áo trắng.mgs.png') },
  };
  const paths = await chooseGroupShirtOutputPaths(directory, [
    first, otherGroup, otherTemplate, first, sameTemplateName, otherGroup,
  ]);

  assert.deepEqual(paths.map((filePath) => path.basename(filePath)), [
    '[Gia Đình]_Áo trắng.mgs_001.png',
    '[Friends]_Áo trắng.mgs_001.png',
    '[Gia Đình]_Áo đen.mgs_001.png',
    '[Gia Đình]_Áo trắng.mgs_002.png',
    '[Gia Đình]_Áo trắng.mgs_003.png',
    '[Friends]_Áo trắng.mgs_002.png',
  ]);
});

test('tên output tăng số khi Done đã có ảnh mà không đổi số của nhóm khác', async (t) => {
  const directory = await createTempDirectory(t);
  const output = plannedOutput(path.join(directory, 'chambray.mgs.jpg'), [], {
    displayGroup: 'Family',
  });
  const existingNames = ['[Family]_chambray.mgs_001.png', '[Family]_chambray.mgs_003.png'];
  for (const name of existingNames) await fs.writeFile(path.join(directory, name), name);
  const paths = await chooseGroupShirtOutputPaths(directory, [
    output, output, { ...output, displayGroup: 'Friends' },
  ]);

  assert.deepEqual(paths.map((filePath) => path.basename(filePath)), [
    '[Family]_chambray.mgs_002.png',
    '[Family]_chambray.mgs_004.png',
    '[Friends]_chambray.mgs_001.png',
  ]);
  for (const name of existingNames) {
    assert.equal(await fs.readFile(path.join(directory, name), 'utf8'), name);
  }
});

test('tên output an toàn trên Windows và không trùng sau chuẩn hóa tên', async (t) => {
  const directory = await createTempDirectory(t);
  const first = plannedOutput(path.join(directory, 'mgs:Ivory.png'), [], {
    displayGroup: 'Gia/đình',
  });
  const second = {
    ...first,
    displayGroup: 'gia\\đình'.normalize('NFD'),
    template: { path: path.join(directory, 'other', 'mgs?Ivory.png') },
  };
  const paths = await chooseGroupShirtOutputPaths(directory, [first, second]);

  assert.deepEqual(paths.map((filePath) => path.basename(filePath)), [
    '[Gia-đình]_mgs-Ivory_001.png',
    '[gia-đình]_mgs-Ivory_002.png',
  ]);
  assert.ok(paths.every((filePath) => path.dirname(filePath) === directory));
});

test('nhóm PNG tên single không làm ảnh Group Shirt bị nhận nhầm là mockup đơn', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, 'chambray.mgs.png');
  const paths = await chooseGroupShirtOutputPaths(directory, [
    plannedOutput(templatePath, [], { displayGroup: 'single' }),
    plannedOutput(templatePath, [], { displayGroup: 'single_Family' }),
  ]);
  for (const filePath of paths) await fs.writeFile(filePath, 'group shirt');
  assert.deepEqual(await findExistingSingleMockupOutputs(directory), []);

  const singlePath = path.join(directory, 'single_shirt_bundle.png');
  await fs.writeFile(singlePath, 'single mockup');
  assert.deepEqual(await findExistingSingleMockupOutputs(directory), [singlePath]);
});

test('preview và ảnh xuất giữ toàn bộ PNG 4200×4800 trong vùng in 42×48', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, 'shirt mgs.png');
  const sourcePath = path.join(directory, 'Family (1).png');
  await Promise.all([
    createTemplate(templatePath),
    createPaddedDesign(sourcePath, {
      canvasWidth: 4200, canvasHeight: 4800,
      width: 1200, height: 1800, left: 2400, top: 600,
    }),
  ]);
  const originalSource = await fs.readFile(sourcePath);
  const plan = { outputs: [plannedOutput(templatePath, [assignment(sourcePath)])] };

  const preview = await renderGroupShirtPreview({ plan, maxWidth: 100, maxHeight: 100 });
  const result = await generateGroupShirtMockups({ plan, sourceDirectory: directory });
  const outputPath = result.outputPaths[0];

  // The full 4200×4800 canvas maps to 70×80 at (65,60), so the off-centre
  // 1200×1800 design must occupy only 20×30 at (105,70), not fill the region.
  assert.deepEqual(await rgbaAt(outputPath, 115, 85), [230, 25, 35, 255]);
  for (const [x, y] of [[100, 100], [100, 85], [130, 85], [115, 65], [115, 105]]) {
    assert.deepEqual(await rgbaAt(outputPath, x, y), [245, 245, 245, 255]);
  }
  assert.deepEqual(preview.preview, { width: 100, height: 100 });
  assert.deepEqual(await rgbaAt(preview.buffer, 57, 42), [230, 25, 35, 255]);
  assert.deepEqual(await rgbaAt(preview.buffer, 50, 50), [245, 245, 245, 255]);
  assert.deepEqual(await fs.readFile(sourcePath), originalSource);
});

test('preview và ảnh xuất: không tag chỉ ghép mặt trước, .f/.b giữ đúng mặt trên cả hai màu', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, 'all sides mgs.png');
  const plainPath = path.join(directory, 'Plain (1).png');
  const frontPath = path.join(directory, 'Sides (1).f.png');
  const backPath = path.join(directory, 'Sides (1).b.png');
  const red = { r: 230, g: 25, b: 35, alpha: 1 };
  const green = { r: 25, g: 210, b: 40, alpha: 1 };
  const blue = { r: 20, g: 45, b: 225, alpha: 1 };
  const design = {
    canvasWidth: 420, canvasHeight: 480,
    width: 120, height: 180, left: 240, top: 60,
  };
  await Promise.all([
    createTemplate(templatePath),
    createPaddedDesign(plainPath, { ...design, color: red }),
    createPaddedDesign(frontPath, { ...design, color: green }),
    createPaddedDesign(backPath, { ...design, color: blue }),
  ]);
  const regions = [
    { id: 'wh-f', side: 'front', color: 'wh', centerX: 0.25, centerY: 0.25 },
    { id: 'bl-f', side: 'front', color: 'bl', centerX: 0.75, centerY: 0.25 },
    { id: 'wh-b', side: 'back', color: 'wh', centerX: 0.25, centerY: 0.75 },
    { id: 'bl-b', side: 'back', color: 'bl', centerX: 0.75, centerY: 0.75 },
  ].map((region) => assignment(plainPath, region).region);
  const plan = await createGroupShirtPlan({
    sources: [plainPath, frontPath, backPath],
    templates: [{ path: templatePath, width: 200, height: 200, regions }],
    random: () => 0,
  });
  assert.equal(plan.outputCount, 2);
  assert.deepEqual(plan.warnings, []);
  const result = await generateGroupShirtMockups({ plan, sourceDirectory: directory });

  for (const [pageIndex, output] of plan.outputs.entries()) {
    const preview = await renderGroupShirtPreview({ plan, pageIndex, maxWidth: 200, maxHeight: 200 });
    assert.equal(preview.assignmentCount, output.profile === 'plain' ? 2 : 4);
    for (const region of regions) {
      const color = output.profile === 'plain' ? red : (region.side === 'front' ? green : blue);
      const expected = output.profile === 'plain' && region.side === 'back'
        ? [245, 245, 245, 255]
        : [color.r, color.g, color.b, 255];
      const x = Math.round(region.centerX * 200);
      const y = Math.round(region.centerY * 200);
      for (const input of [preview.buffer, result.outputPaths[pageIndex]]) {
        assert.deepEqual(await rgbaAt(input, x + 15, y - 15), expected, `${output.group}: ${region.id}`);
        assert.deepEqual(await rgbaAt(input, x, y), [245, 245, 245, 255]);
      }
    }
  }
});

test('compositor giữ canvas PNG và xoay quanh tâm vùng in', async (t) => {
  const directory = await createTempDirectory(t);
  const templatePath = path.join(directory, '1 mgs.png');
  const sourcePath = path.join(directory, '1 (1).wh.f.png');
  await createTemplate(templatePath);
  await createPaddedDesign(sourcePath, {
    canvasWidth: 420,
    canvasHeight: 480,
    width: 120,
    height: 180,
    left: 240,
    top: 60,
    color: { r: 225, g: 25, b: 35, alpha: 1 },
  });

  for (const [rotation, designX, designY, width, height] of [
    [0, 115, 85, 70, 80],
    [90, 115, 115, 80, 70],
    [-90, 85, 85, 80, 70],
    [180, 85, 115, 70, 80],
  ]) {
    const output = plannedOutput(templatePath, [assignment(sourcePath, {
      id: 'front-1', rotation,
    })]);
    const composites = [];
    const rendered = await renderGroupShirtOutputToBuffer({
      output,
      onItem: (_current, _total, composite) => composites.push(composite),
    });

    assert.deepEqual(
      [composites[0].renderedWidth, composites[0].renderedHeight],
      [width, height],
      `Canvas sau khi xoay ${rotation}° phải giữ đúng kích thước vùng in`,
    );
    assert.deepEqual(await rgbaAt(rendered.buffer, designX, designY), [225, 25, 35, 255]);
    assert.deepEqual(await rgbaAt(rendered.buffer, 100, 100), [245, 245, 245, 255]);
    assert.deepEqual(await rgbaAt(rendered.buffer, 145, 145), [245, 245, 245, 255]);
    assert.equal(rendered.template.width, 200);
    assert.equal(rendered.template.height, 200);
  }
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
  assert.deepEqual(first.outputPaths.map((filePath) => path.basename(filePath)), [
    '[1]_1 mgs_001.png', '[1]_1 mgs alternative_001.png',
  ]);
  assert.deepEqual(second.outputPaths.map((filePath) => path.basename(filePath)), [
    '[1]_1 mgs_002.png', '[1]_1 mgs alternative_002.png',
  ]);
  assert.deepEqual(preserved.outputPaths.map((filePath) => path.basename(filePath)), [
    '[1]_1 mgs_003.png', '[1]_1 mgs alternative_003.png',
  ]);
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
  assert.deepEqual(result.outputs.map((output) => output.name), [
    '[1]_1 mgs_001.png', '[1]_1 mgs_002.png',
  ]);
});

test('service tái sử dụng một nền mgs cho nhiều nhóm và giữ tên output không trùng', async (t) => {
  const directory = await createTempDirectory(t);
  const outputDirectory = path.join(directory, 'Done');
  const templatePath = path.join(directory, '.mgs3.png');
  const firstSource = path.join(directory, '1 (1).png');
  const secondSource = path.join(directory, 'Family (1).png');
  await Promise.all([
    createTemplate(templatePath, { width: 300, height: 240 }),
    createPaddedDesign(firstSource),
    createPaddedDesign(secondSource, { color: { r: 20, g: 105, b: 225, alpha: 1 } }),
  ]);
  const regions = [
    {
      id: 'front-1', side: 'front', color: 'wh',
      centerX: 0.3, centerY: 0.5, width: 0.14, height: 0.2, rotation: 0,
    },
    {
      id: 'front-2', side: 'front', color: 'wh',
      centerX: 0.7, centerY: 0.5, width: 0.14, height: 0.2, rotation: 0,
    },
  ];

  const result = await generateGroupShirtMockups({
    sourcePaths: [firstSource, secondSource],
    templates: [{
      path: templatePath,
      name: path.basename(templatePath),
      width: 300,
      height: 240,
      regions,
    }],
    outputDirectory,
    removeMetadata: false,
    random: () => 0,
  });

  assert.equal(result.outputCount, 2);
  assert.deepEqual(result.outputs.map((output) => output.groupKey), ['1', 'family']);
  assert.deepEqual(result.outputs.map((output) => output.assignmentCount), [2, 2]);
  assert.equal(new Set(result.outputPaths).size, 2);
  assert.deepEqual(result.outputs.map((output) => output.name), [
    '[1]_.mgs3_001.png', '[Family]_.mgs3_001.png',
  ]);
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
