'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const {
  resolveInputDirectory,
  ensureInputDirectory,
} = require('../src/services/input-directory');

test('development dùng thư mục Input tại project root', () => {
  const projectPath = path.resolve('D:\\Projects\\PNG Bundle');
  assert.equal(
    resolveInputDirectory({ appPath: projectPath, isPackaged: false }),
    path.join(projectPath, 'Input'),
  );
});

test('packaged dùng thư mục Input cạnh file EXE', () => {
  const executablePath = path.resolve('C:\\Apps\\PNG Bundle Mockup\\PNG Bundle Mockup.exe');
  assert.equal(
    resolveInputDirectory({ executablePath, isPackaged: true }),
    path.join(path.dirname(executablePath), 'Input'),
  );
});

test('ensureInputDirectory tạo thư mục khi chưa tồn tại', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-input-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const inputPath = path.join(root, 'Installed App', 'Input');
  assert.equal(await ensureInputDirectory(inputPath), path.resolve(inputPath));
  assert.equal((await fs.stat(inputPath)).isDirectory(), true);
});
