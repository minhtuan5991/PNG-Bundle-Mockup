'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { generateMockups } = require('../src/engine/image-engine');

async function main() {
  const templatePath = process.argv[2];
  if (!templatePath) throw new Error('Cần truyền đường dẫn ảnh nền mẫu.');

  const qaRoot = path.join(__dirname, '..', '.qa-sample');
  const sourceDirectory = path.join(qaRoot, 'source');
  await fs.rm(qaRoot, { recursive: true, force: true });
  await fs.mkdir(sourceDirectory, { recursive: true });

  const palette = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  const sourcePaths = [];
  for (let index = 0; index < 15; index += 1) {
    const contentWidth = 120 + (index % 3) * 25;
    const contentHeight = 105 + (index % 2) * 30;
    const color = palette[index % palette.length];
    const svg = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${contentWidth}" height="${contentHeight}">
        <rect x="3" y="3" width="${contentWidth - 6}" height="${contentHeight - 6}" rx="22" fill="${color}" stroke="#ffffff" stroke-width="6"/>
        <circle cx="${contentWidth / 2}" cy="${contentHeight * 0.38}" r="${Math.min(contentWidth, contentHeight) * 0.19}" fill="#ffffff" fill-opacity=".9"/>
        <text x="50%" y="82%" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#ffffff">PNG ${index + 1}</text>
      </svg>
    `);
    const horizontalPadding = 55 + (index % 4) * 11;
    const verticalPadding = 44 + (index % 3) * 9;
    const filePath = path.join(sourceDirectory, `design-${String(index + 1).padStart(2, '0')}.png`);
    await sharp(svg)
      .extend({
        left: horizontalPadding,
        right: horizontalPadding + 23,
        top: verticalPadding,
        bottom: verticalPadding + 17,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(filePath);
    sourcePaths.push(filePath);
  }

  const result = await generateMockups({
    sourcePaths,
    templatePath: path.resolve(templatePath),
    sourceDirectory,
    mockupCount: 1,
    settings: {
      topMargin: 195,
      bottomMargin: 195,
      sideMargin: 24,
      gap: 20,
      alphaThreshold: 0,
    },
  });
  console.log(result.outputPaths[0]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
