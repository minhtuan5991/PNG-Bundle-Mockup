'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const {
  PRINT_REGION_ASPECT_RATIO,
  createSingleMockupRegionStore,
  validateNormalizedPrintRegion,
} = require('../src/services/single-mockup-regions');
const {
  calculatePixelPrintRegion,
  findExistingSingleMockupOutputs,
  generateSingleMockups,
  listSingleMockupTemplates,
  selectRandomSourcePngs,
} = require('../src/services/single-mockup-service');

async function createTempDirectory(t, prefix) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    // libvips can keep WEBP/TIFF input handles in its operation cache on Windows.
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

async function createSolidImage(filePath, format, options = {}) {
  const pipeline = sharp({
    create: {
      width: options.width || 200,
      height: options.height || 200,
      channels: options.channels || 4,
      background: options.background || { r: 245, g: 245, b: 245, alpha: 1 },
    },
  });
  if (format === 'jpeg') await pipeline.jpeg({ quality: 90 }).toFile(filePath);
  else if (format === 'webp') await pipeline.webp({ quality: 90 }).toFile(filePath);
  else if (format === 'tiff') await pipeline.tiff().toFile(filePath);
  else await pipeline.png().toFile(filePath);
}

async function createTemplateWithMetadata(filePath) {
  const xmp = '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></x:xmpmeta><?xpacket end="w"?>';
  await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 245, g: 245, b: 245, alpha: 1 },
    },
  })
    .withExif({ IFD0: { ImageDescription: 'single-mockup-secret' } })
    .withXmp(xmp)
    .withIccProfile('srgb')
    .png()
    .toFile(filePath);
}

async function createPaddedDesign(filePath, options = {}) {
  const content = await sharp({
    create: {
      width: options.width || 20,
      height: options.height || 40,
      channels: 4,
      background: { r: 230, g: 20, b: 30, alpha: 1 },
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
    .composite([{ input: content, left: options.left ?? 70, top: options.top ?? 30 }])
    .png()
    .toFile(filePath);
}

async function createWatermark(filePath, options = {}) {
  const mark = await sharp({
    create: {
      width: options.width || 20,
      height: options.height || 20,
      channels: 4,
      background: { r: 15, g: 45, b: 230, alpha: 1 },
    },
  }).png().toBuffer();
  await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, left: options.left ?? 45, top: options.top ?? 50 }])
    .png()
    .toFile(filePath);
}

async function rgbaAt(filePath, x, y) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 4)];
}

test('quét Input chỉ lấy PNG/JPG/WEBP/TIFF và bỏ qua PDF', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-scan-');
  const inputDirectory = path.join(directory, 'Input');
  await fs.mkdir(inputDirectory);
  await Promise.all([
    createSolidImage(path.join(inputDirectory, '01-shirt.png'), 'png'),
    createSolidImage(path.join(inputDirectory, '02-cup.jpg'), 'jpeg'),
    createSolidImage(path.join(inputDirectory, '03-bag.webp'), 'webp'),
    createSolidImage(path.join(inputDirectory, '04-frame.tif'), 'tiff'),
    fs.writeFile(path.join(inputDirectory, 'download.pdf'), '%PDF-1.4\n'),
    fs.writeFile(path.join(inputDirectory, 'notes.txt'), 'not a template'),
  ]);
  await fs.mkdir(path.join(inputDirectory, 'nested.png'));

  const templates = await listSingleMockupTemplates(inputDirectory);
  assert.deepEqual(
    templates.map((template) => template.name),
    ['01-shirt.png', '02-cup.jpg', '03-bag.webp', '04-frame.tif'],
  );
  assert.deepEqual(templates.map((template) => template.format), ['png', 'jpeg', 'webp', 'tiff']);
  assert.ok(templates.every((template) => template.width === 200 && template.height === 200));
});
test('lọc mockup đơn chỉ nhận ảnh có marker bundle, không phân biệt hoa thường', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-bundle-marker-');
  const inputDirectory = path.join(directory, 'Input');
  await fs.mkdir(inputDirectory);
  await Promise.all([
    createSolidImage(path.join(inputDirectory, 'shirt bundle.png'), 'png'),
    createSolidImage(path.join(inputDirectory, 'BUNDLE cup.jpg'), 'jpeg'),
    createSolidImage(path.join(inputDirectory, 'shirt mgs.png'), 'png'),
    createSolidImage(path.join(inputDirectory, 'plain.webp'), 'webp'),
  ]);

  const templates = await listSingleMockupTemplates(inputDirectory, {
    templateMarker: 'bundle',
  });
  assert.deepEqual(
    templates.map((template) => template.name),
    ['BUNDLE cup.jpg', 'shirt bundle.png'],
  );
});

test('quét Input có thể bỏ qua ảnh mockup hỏng và trả cảnh báo', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-invalid-');
  const inputDirectory = path.join(directory, 'Input');
  await fs.mkdir(inputDirectory);
  await Promise.all([
    createSolidImage(path.join(inputDirectory, 'valid.png'), 'png'),
    fs.writeFile(path.join(inputDirectory, 'broken.jpg'), 'not-an-image'),
  ]);

  const warnings = [];
  const templates = await listSingleMockupTemplates(inputDirectory, {
    ignoreInvalid: true,
    warnings,
  });
  assert.deepEqual(templates.map((template) => template.name), ['valid.png']);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].name, 'broken.jpg');
  assert.equal(warnings[0].code, 'INVALID_SINGLE_MOCKUP_TEMPLATE');
});

test('mockup JPEG dùng kích thước đã auto-orient và xuất đúng chiều nhìn thấy', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-orientation-');
  const inputDirectory = path.join(directory, 'Input');
  const userDataPath = path.join(directory, 'UserData');
  await fs.mkdir(inputDirectory);
  const templatePath = path.join(inputDirectory, 'portrait.jpg');
  await sharp({
    create: {
      width: 40,
      height: 20,
      channels: 3,
      background: { r: 245, g: 245, b: 245 },
    },
  }).jpeg().withMetadata({ orientation: 6 }).toFile(templatePath);
  const sourcePath = path.join(directory, 'design.png');
  await createPaddedDesign(sourcePath);

  const templates = await listSingleMockupTemplates(inputDirectory);
  assert.equal(templates[0].width, 20);
  assert.equal(templates[0].height, 40);

  const regionStore = createSingleMockupRegionStore({ userDataPath });
  await regionStore.save(
    { name: 'portrait.jpg', width: 20, height: 40 },
    { x: 0.15, y: 0.3, width: 0.7, height: 0.4 },
  );
  const result = await generateSingleMockups({
    sourcePaths: [sourcePath],
    inputDirectory,
    sourceDirectory: directory,
    regionStore,
    random: () => 0,
  });
  const metadata = await sharp(result.outputPaths[0]).metadata();
  assert.equal(metadata.width, 20);
  assert.equal(metadata.height, 40);
  assert.equal(metadata.orientation, undefined);
});

test('chọn ngẫu nhiên không lặp khi đủ PNG và chỉ lặp khi nguồn ít hơn template', () => {
  const sourcePaths = ['a.png', 'b.png', 'c.png', 'd.png'].map((name) =>
    path.resolve('fixtures', name),
  );
  const selected = selectRandomSourcePngs(sourcePaths, 4, () => 0);
  assert.equal(selected.length, 4);
  assert.equal(new Set(selected).size, 4);

  const repeated = selectRandomSourcePngs(sourcePaths.slice(0, 2), 5, () => 0);
  assert.equal(repeated.length, 5);
  assert.equal(new Set(repeated).size, 2);
  for (let index = 1; index < repeated.length; index += 1) {
    assert.notEqual(repeated[index], repeated[index - 1]);
  }
});

test('vùng in normalized phải nằm trong 0..1 và có tỷ lệ pixel 7:8', () => {
  const region = validateNormalizedPrintRegion(
    { left: 0.1, top: 0.2, width: 0.35, height: 0.4 },
    { width: 200, height: 200 },
  );
  assert.deepEqual(region, { x: 0.1, y: 0.2, width: 0.35, height: 0.4 });
  const pixels = calculatePixelPrintRegion(region, { width: 200, height: 200 });
  assert.deepEqual(pixels, { left: 20, top: 40, width: 70, height: 80 });
  assert.equal(pixels.width / pixels.height, PRINT_REGION_ASPECT_RATIO);

  assert.throws(
    () => validateNormalizedPrintRegion(
      { x: 0.8, y: 0.1, width: 0.3, height: 0.4 },
      { width: 200, height: 200 },
    ),
    (error) => error.code === 'REGION_OUT_OF_BOUNDS',
  );
  assert.throws(
    () => validateNormalizedPrintRegion(
      { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
      { width: 200, height: 200 },
    ),
    (error) => error.code === 'INVALID_REGION_ASPECT_RATIO',
  );
});

test('store lưu nguyên tử vùng in theo tên template và bỏ thiết lập khi kích thước ảnh đổi', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-regions-');
  const template = { name: 'Shirt Mockup.PNG', width: 200, height: 200 };
  const region = { x: 0.1, y: 0.1, width: 0.35, height: 0.4 };
  const store = createSingleMockupRegionStore({ userDataPath: directory });
  await store.save(template, region);

  assert.deepEqual(await store.get({ ...template, name: 'shirt mockup.png' }), region);
  assert.equal(await store.get({ ...template, width: 400 }), null);

  const reloaded = createSingleMockupRegionStore({ userDataPath: directory });
  assert.deepEqual(await reloaded.get(template), region);
  const diskDocument = JSON.parse(await fs.readFile(store.filePath, 'utf8'));
  assert.equal(diskDocument.schemaVersion, 1);
  assert.deepEqual(Object.keys(diskDocument.templates), ['shirt mockup.png']);
  assert.deepEqual(
    (await fs.readdir(directory)).filter((name) => name.includes('.tmp-')),
    [],
  );

  await assert.rejects(
    () => store.save(template, { x: 0, y: 0, width: 0.5, height: 0.5 }),
    (error) => error.code === 'INVALID_REGION_ASPECT_RATIO',
  );
});

test('lưu lại các template hiện có không xóa vùng in của template tạm vắng khỏi Input', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-regions-merge-');
  const shirt = { name: 'shirt.png', width: 200, height: 200 };
  const cup = { name: 'cup.png', width: 200, height: 200 };
  const shirtRegion = { x: 0.1, y: 0.1, width: 0.35, height: 0.4 };
  const updatedShirtRegion = { x: 0.2, y: 0.2, width: 0.35, height: 0.4 };
  const cupRegion = { x: 0.05, y: 0.1, width: 0.4375, height: 0.5 };
  const store = createSingleMockupRegionStore({ userDataPath: directory });

  await store.replaceAll([
    { template: shirt, region: shirtRegion },
    { template: cup, region: cupRegion },
  ]);

  // cup.png is temporarily absent from Input, so the UI submits only shirt.png.
  await store.replaceAll([
    { template: shirt, region: updatedShirtRegion },
  ]);

  assert.deepEqual(await store.get(shirt), updatedShirtRegion);
  assert.deepEqual(await store.get(cup), cupRegion);

  const reloaded = createSingleMockupRegionStore({ userDataPath: directory });
  assert.deepEqual(await reloaded.get(cup), cupRegion);
  const diskDocument = JSON.parse(await fs.readFile(store.filePath, 'utf8'));
  assert.deepEqual(Object.keys(diskDocument.templates).sort(), ['cup.png', 'shirt.png']);
});

test('Group Shirt tạo mọi tổ hợp nhóm PNG và ảnh nền mockup đơn đã chọn', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-groups-');
  const outputDirectory = path.join(directory, 'Done');
  const templateNames = ['shirt-a.png', 'shirt-b.png', 'shirt-c.png'];
  const sourceNames = ['1 (1).png', '2 (1).wh.png', '3 (1).png'];
  const templatePaths = templateNames.map((name) => path.join(directory, name));
  const sourcePaths = sourceNames.map((name) => path.join(directory, name));
  await Promise.all([
    ...templatePaths.map((filePath) => createSolidImage(filePath, 'png')),
    ...sourcePaths.map((filePath) => createPaddedDesign(filePath)),
  ]);
  const templates = templatePaths.map((filePath) => ({
    path: filePath,
    name: path.basename(filePath),
    width: 200,
    height: 200,
  }));
  const regions = Object.fromEntries(templateNames.map((name) => [
    name,
    { x: 0.1, y: 0.1, width: 0.35, height: 0.4 },
  ]));
  const sourceGroups = sourcePaths.map((filePath, index) => ({
    group: String(index + 1),
    groupKey: String(index + 1),
    sourcePaths: [filePath],
  }));

  const result = await generateSingleMockups({
    sourceGroups,
    templates,
    regions,
    outputDirectory,
    random: () => 0,
  });

  assert.equal(result.created, true);
  assert.equal(result.outputPaths.length, 9);
  assert.deepEqual(result.assignments.map((item) => item.group), [
    '1', '1', '1', '2', '2', '2', '3', '3', '3',
  ]);
  assert.deepEqual(result.outputPaths.map((filePath) => path.basename(filePath)), [
    '[1]_single_shirt-a.png',
    '[1]_single_shirt-b.png',
    '[1]_single_shirt-c.png',
    '[2]_single_shirt-a.png',
    '[2]_single_shirt-b.png',
    '[2]_single_shirt-c.png',
    '[3]_single_shirt-a.png',
    '[3]_single_shirt-b.png',
    '[3]_single_shirt-c.png',
  ]);
  for (let groupIndex = 0; groupIndex < sourceGroups.length; groupIndex += 1) {
    const assignments = result.assignments.slice(groupIndex * 3, groupIndex * 3 + 3);
    assert.ok(assignments.every((item) => item.sourcePath === sourcePaths[groupIndex]));
  }

  const repeated = await generateSingleMockups({ outputDirectory });
  assert.equal(repeated.skipped, true);
  assert.equal(repeated.skipReason, 'SINGLE_MOCKUP_ALREADY_EXISTS');
  assert.equal(repeated.existingPaths.length, 9);
});

test('mockup đơn giữ kích thước và vị trí thiết kế trên canvas PNG 4200×4800', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-full-canvas-');
  const templatePath = path.join(directory, 'shirt bundle.png');
  const sourcePath = path.join(directory, 'Family (1).png');
  await Promise.all([
    createSolidImage(templatePath, 'png'),
    createPaddedDesign(sourcePath, {
      canvasWidth: 4200, canvasHeight: 4800,
      width: 1200, height: 1800, left: 2400, top: 600,
    }),
  ]);
  const originalSource = await fs.readFile(sourcePath);
  const template = { path: templatePath, name: path.basename(templatePath), width: 200, height: 200 };
  const result = await generateSingleMockups({
    sourcePaths: [sourcePath],
    templates: [template],
    regions: { [template.name]: { x: 0.1, y: 0.1, width: 0.35, height: 0.4 } },
    sourceDirectory: directory,
    random: () => 0,
  });
  const outputPath = result.outputPaths[0];

  // The canvas fits 70×80 at (20,20); the design stays 20×30 at (60,30).
  assert.deepEqual(await rgbaAt(outputPath, 70, 45), [230, 20, 30, 255]);
  for (const [x, y] of [[55, 60], [55, 45], [85, 45], [70, 25], [70, 65]]) {
    assert.deepEqual(await rgbaAt(outputPath, x, y), [245, 245, 245, 255]);
  }
  assert.deepEqual(await fs.readFile(sourcePath), originalSource);
});

test('generateSingleMockups chỉ tạo một lần trong Done và bỏ qua các lượt sau', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-generate-');
  const inputDirectory = path.join(directory, 'Input');
  const userDataPath = path.join(directory, 'UserData');
  await fs.mkdir(inputDirectory);
  const templatePath = path.join(inputDirectory, 'shirt.png');
  await createSolidImage(templatePath, 'png', {
    width: 200,
    height: 200,
    background: { r: 245, g: 245, b: 245, alpha: 1 },
  });
  await fs.writeFile(path.join(inputDirectory, 'instructions.pdf'), '%PDF-1.4\n');
  const sourcePath = path.join(directory, 'padded-design.png');
  await createPaddedDesign(sourcePath);

  const regionStore = createSingleMockupRegionStore({ userDataPath });
  await regionStore.save(
    { name: 'shirt.png', width: 200, height: 200 },
    { x: 0.1, y: 0.1, width: 0.35, height: 0.4 },
  );
  const options = {
    sourcePaths: [sourcePath],
    inputDirectory,
    sourceDirectory: directory,
    regionStore,
    random: () => 0,
  };

  const first = await generateSingleMockups(options);
  assert.equal(first.created, true);
  assert.equal(first.skipped, false);
  assert.deepEqual(first.outputPaths.map((filePath) => path.basename(filePath)), ['single_shirt.png']);
  assert.deepEqual(first.assignments[0].pixelRegion, { left: 20, top: 20, width: 70, height: 80 });
  assert.deepEqual(await rgbaAt(first.outputPaths[0], 23, 60), [245, 245, 245, 255]);
  assert.deepEqual(await rgbaAt(first.outputPaths[0], 55, 60), [245, 245, 245, 255]);
  assert.deepEqual(await rgbaAt(first.outputPaths[0], 75, 60), [230, 20, 30, 255]);
  assert.deepEqual(await rgbaAt(first.outputPaths[0], 100, 60), [245, 245, 245, 255]);

  const second = await generateSingleMockups(options);
  assert.equal(second.created, false);
  assert.equal(second.skipped, true);
  assert.equal(second.skipReason, 'SINGLE_MOCKUP_ALREADY_EXISTS');
  assert.deepEqual(second.outputPaths, []);
  assert.deepEqual(second.existingPaths, [first.outputPaths[0]]);
  assert.equal(await fs.stat(first.outputPaths[0]).then((stat) => stat.isFile()), true);
  assert.deepEqual(await fs.readdir(path.join(directory, 'Done')), ['single_shirt.png']);

  const watermarkPath = path.join(directory, 'watermark.png');
  await createWatermark(watermarkPath, { left: 72, top: 50, height: 10 });
  const withWatermark = await generateSingleMockups({
    ...options,
    outputDirectory: path.join(directory, 'Done-watermark'),
    watermarkPath,
  });
  assert.deepEqual(
    withWatermark.outputPaths.map((filePath) => path.basename(filePath)),
    ['single_shirt.png'],
  );
  assert.equal(withWatermark.watermarkApplied, true);
  assert.equal(withWatermark.watermarkName, 'watermark.png');
  assert.deepEqual(await rgbaAt(withWatermark.outputPaths[0], 75, 55), [15, 45, 230, 255]);
  assert.deepEqual(await rgbaAt(withWatermark.outputPaths[0], 75, 66), [230, 20, 30, 255]);
  assert.deepEqual(
    (await fs.readdir(path.join(directory, 'Done'))).filter((name) => name.endsWith('.tmp')),
    [],
  );
});

test('Done có mockup đơn thì bỏ qua trước khi yêu cầu PNG, Input hoặc vùng in', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-skip-');
  const outputDirectory = path.join(directory, 'Done');
  await fs.mkdir(outputDirectory);
  await Promise.all([
    fs.writeFile(path.join(outputDirectory, 'mockup_001.png'), 'bundle'),
    fs.writeFile(path.join(outputDirectory, 'SINGLE_existing.PnG'), 'single'),
  ]);

  const found = await findExistingSingleMockupOutputs(outputDirectory);
  assert.deepEqual(found.map((filePath) => path.basename(filePath)), ['SINGLE_existing.PnG']);

  const result = await generateSingleMockups({ outputDirectory });
  assert.equal(result.created, false);
  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, 'SINGLE_MOCKUP_ALREADY_EXISTS');
  assert.deepEqual(result.outputPaths, []);
  assert.deepEqual(result.existingPaths, found);
  assert.deepEqual(
    (await fs.readdir(outputDirectory)).sort(),
    ['SINGLE_existing.PnG', 'mockup_001.png'],
  );
});

test('mockup đơn mặc định xóa 6 nhóm metadata ở bước cuối và có thể giữ metadata template', async (t) => {
  const directory = await createTempDirectory(t, 'single-mockup-metadata-');
  const inputDirectory = path.join(directory, 'Input');
  const userDataPath = path.join(directory, 'UserData');
  await fs.mkdir(inputDirectory);
  const templatePath = path.join(inputDirectory, 'shirt-with-metadata.png');
  await createTemplateWithMetadata(templatePath);
  const templateMetadata = await sharp(templatePath).metadata();
  assert.ok(templateMetadata.exif);
  assert.ok(templateMetadata.xmp);
  assert.ok(templateMetadata.icc || templateMetadata.hasProfile);

  const sourcePath = path.join(directory, 'design.png');
  await createPaddedDesign(sourcePath);
  const regionStore = createSingleMockupRegionStore({ userDataPath });
  await regionStore.save(
    { name: 'shirt-with-metadata.png', width: 200, height: 200 },
    { x: 0.1, y: 0.1, width: 0.35, height: 0.4 },
  );
  const options = {
    sourcePaths: [sourcePath],
    inputDirectory,
    sourceDirectory: directory,
    regionStore,
    random: () => 0,
  };

  const cleaned = await generateSingleMockups(options);
  assert.equal(cleaned.metadataRemoved, true);
  assert.deepEqual(cleaned.removedMetadataGroups, [
    'Comment',
    'EXIF',
    'XMP',
    'EXIF thumbnail',
    'IPTC',
    'ICC profile',
  ]);
  const cleanedMetadata = await sharp(cleaned.outputPaths[0]).metadata();
  assert.equal(cleanedMetadata.comments, undefined);
  assert.equal(cleanedMetadata.exif, undefined);
  assert.equal(cleanedMetadata.xmp, undefined);
  assert.equal(cleanedMetadata.iptc, undefined);
  assert.equal(cleanedMetadata.icc, undefined);
  assert.equal(cleanedMetadata.hasProfile, false);

  const preserved = await generateSingleMockups({
    ...options,
    outputDirectory: path.join(directory, 'Done-preserved'),
    removeMetadata: false,
  });
  assert.equal(preserved.metadataRemoved, false);
  assert.deepEqual(preserved.removedMetadataGroups, []);
  const preservedMetadata = await sharp(preserved.outputPaths[0]).metadata();
  assert.ok(preservedMetadata.exif);
  assert.ok(preservedMetadata.xmp);
  assert.ok(preservedMetadata.icc || preservedMetadata.hasProfile);
});
