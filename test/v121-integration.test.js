'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { generateMockups } = require('../src/engine/image-engine');
const { createDownloadPdf } = require('../src/services/pdf-download-service');
const { createSingleMockupRegionStore } = require('../src/services/single-mockup-regions');
const {
  generateSingleMockups,
  listSingleMockupTemplates,
} = require('../src/services/single-mockup-service');

async function createSourcePng(filePath, color) {
  const design = await sharp({
    create: {
      width: 90,
      height: 110,
      channels: 4,
      background: color,
    },
  }).png().toBuffer();
  await sharp(design)
    .extend({
      top: 24,
      bottom: 30,
      left: 28,
      right: 36,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(filePath);
}

test('v1.2.1 tao bundle, mockup don va PDF Download trong cung thu muc Done', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-v121-integration-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceDirectory = path.join(root, 'source');
  const inputDirectory = path.join(root, 'Input');
  await Promise.all([
    fs.mkdir(sourceDirectory, { recursive: true }),
    fs.mkdir(inputDirectory, { recursive: true }),
  ]);

  const sourcePaths = [
    path.join(sourceDirectory, 'design-1.png'),
    path.join(sourceDirectory, 'design-2.png'),
  ];
  await Promise.all([
    createSourcePng(sourcePaths[0], { r: 230, g: 40, b: 50, alpha: 1 }),
    createSourcePng(sourcePaths[1], { r: 30, g: 100, b: 230, alpha: 1 }),
  ]);

  const bundleTemplatePath = path.join(root, 'bundle-template.png');
  await sharp({
    create: {
      width: 500,
      height: 600,
      channels: 4,
      background: { r: 242, g: 242, b: 242, alpha: 1 },
    },
  }).png().toFile(bundleTemplatePath);

  const singleTemplatePath = path.join(inputDirectory, 'shirt.png');
  await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 4,
      background: { r: 225, g: 225, b: 225, alpha: 1 },
    },
  }).png().toFile(singleTemplatePath);
  await fs.copyFile(
    path.resolve(__dirname, '..', 'Input', 'Toystory HLW1.pdf'),
    path.join(inputDirectory, 'Toystory HLW1.pdf'),
  );

  const regionStore = createSingleMockupRegionStore({
    userDataPath: path.join(root, 'user-data'),
  });
  await regionStore.save(
    { name: 'shirt.png', width: 300, height: 300 },
    { x: 0.1, y: 0.1, width: 0.35, height: 0.4 },
  );

  const bundle = await generateMockups({
    sourcePaths,
    sourceDirectory,
    templatePath: bundleTemplatePath,
    mockupCount: 1,
    settings: {
      topMargin: 60,
      bottomMargin: 60,
      sideMargin: 30,
      gap: 18,
      alphaThreshold: 0,
    },
    removeMetadata: true,
  });
  const templates = await listSingleMockupTemplates(inputDirectory);
  const singles = await generateSingleMockups({
    sourcePaths,
    inputDirectory,
    outputDirectory: bundle.outputDir,
    templates,
    regionStore,
    removeMetadata: true,
    random: () => 0,
  });
  const pdf = await createDownloadPdf({
    inputDirectory,
    outputDirectory: bundle.outputDir,
    downloadUrl: 'https://downloads.example.test/orders/integration/files',
  });

  assert.equal(bundle.outputPaths.length, 1);
  assert.equal(singles.outputPaths.length, 1);
  assert.equal(pdf.linkAnnotationsUpdated, 3);
  assert.equal(pdf.downloadUrl, 'https://downloads.example.test/orders/integration/files');
  const expectedPaths = [...bundle.outputPaths, ...singles.outputPaths, pdf.outputPath];
  assert.ok(expectedPaths.every((filePath) => path.dirname(filePath) === bundle.outputDir));
  assert.equal(new Set(expectedPaths.map((filePath) => path.basename(filePath))).size, 3);
  for (const filePath of expectedPaths) {
    assert.equal((await fs.stat(filePath)).isFile(), true);
  }
});
