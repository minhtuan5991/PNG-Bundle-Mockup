'use strict';

// Synthetic fixtures only. Compare against the released implementation in memory.
// Run from a checkout containing v1.4.13: node scripts/benchmark-rendering.js
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');

function baseline(relativePath) {
  const filename = path.join(root, relativePath);
  const source = execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'show', `v1.4.13:${relativePath}`], { cwd: root, encoding: 'utf8' });
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(source, filename);
  return mod.exports;
}

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-mockup-benchmark-'));
  try {
    const templatePath = path.join(directory, 'sample mgs.png');
    await sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#dddddd' } }).png().toFile(templatePath);
    const sources = [];
    for (let i = 0; i < 36; i += 1) {
      const filePath = path.join(directory, `1 (${i + 1}).png`);
      const input = Buffer.from(`<svg width="840" height="960"><rect x="84" y="96" width="672" height="768" fill="rgb(${30 + i * 5},90,160)" opacity=".8"/><circle cx="420" cy="480" r="170" fill="#ffd233"/><path d="M84 96L756 864M756 96L84 864" stroke="#fff" stroke-width="20"/></svg>`);
      await sharp(input).png().toFile(filePath);
      sources.push(filePath);
    }
    const template = { path: templatePath, name: path.basename(templatePath), width: 1000, height: 1000 };
    const templates = [];
    for (let i = 0; i < 6; i += 1) {
      const filePath = path.join(directory, `single-${i}.png`);
      await fs.copyFile(templatePath, filePath);
      templates.push({ ...template, path: filePath, name: path.basename(filePath) });
    }
    const tasks = [
      {
        name: 'Bundle', modulePath: 'src/engine/image-engine.js', method: 'generateMockups',
        options: { sourcePaths: sources, templatePath, mockupCount: 6, settings: { topMargin: 50, bottomMargin: 50, sideMargin: 30, gap: 20, alphaThreshold: 0 } },
      },
      {
        name: 'Group Shirt', modulePath: 'src/services/group-shirt-service.js', method: 'generateGroupShirtMockups',
        options: { plan: { outputs: Array.from({ length: 12 }, (_, pageIndex) => ({
          group: '1', groupKey: '1', pageIndex, template,
          assignments: sources.slice(0, 6).map((filePath, i) => ({
            source: { path: filePath, name: path.basename(filePath) },
            region: { id: `region-${i}`, side: 'front', color: 'wh', centerX: 0.2 + (i % 3) * 0.3, centerY: 0.3 + Math.floor(i / 3) * 0.4, width: 0.14, height: 0.16, rotation: i % 2 ? 12 : 0 },
          })),
        })) } },
      },
      {
        name: 'Single', modulePath: 'src/services/single-mockup-service.js', method: 'generateSingleMockups',
        options: { templates, regions: Object.fromEntries(templates.map((item) => [item.name, { x: 0.2, y: 0.2, width: 0.35, height: 0.4 }])), sourceGroups: sources.slice(0, 2).map((filePath, i) => ({ group: String(i + 1), groupKey: String(i + 1), sourcePaths: [filePath] })), random: () => 0 },
      },
    ];
    for (const task of tasks) {
      const versions = [baseline(task.modulePath), require(path.join(root, task.modulePath))];
      const times = [[], []];
      for (let round = 0; round < 3; round += 1) {
        const results = [];
        // Reverse execution order on the middle round to reduce warm-cache bias.
        for (const version of round % 2 ? [1, 0] : [0, 1]) {
          sharp.cache(false);
          const target = path.join(directory, `${task.name}-${round}-${version}`);
          const start = performance.now();
          results[version] = await versions[version][task.method]({ ...task.options, sourceDirectory: target, outputDirectory: path.join(target, 'Done') });
          times[version].push(Math.round(performance.now() - start));
        }
        assert.equal(results[0].outputPaths.length, results[1].outputPaths.length);
        for (let i = 0; i < results[0].outputPaths.length; i += 1) {
          assert.equal(path.basename(results[0].outputPaths[i]), path.basename(results[1].outputPaths[i]));
          assert.deepEqual(await fs.readFile(results[0].outputPaths[i]), await fs.readFile(results[1].outputPaths[i]));
        }
      }
      const median = (values) => [...values].sort((a, b) => a - b)[1];
      const before = median(times[0]);
      const after = median(times[1]);
      console.log(JSON.stringify({ flow: task.name, baselineMs: times[0], optimizedMs: times[1], medianBeforeMs: before, medianAfterMs: after, timeSavedPercent: Math.round((1 - after / before) * 100), identicalBytes: true }));
    }
  } finally {
    sharp.cache(false);
    // Only this unique synthetic fixture directory is removed.
    if (path.dirname(directory) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('png-mockup-benchmark-')) throw new Error('Unsafe benchmark cleanup path');
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
