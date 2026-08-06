'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainPath = path.resolve(__dirname, '..', 'src', 'main.js');

test('closed handler không đọc webContents sau khi BrowserWindow đã bị hủy', () => {
  const source = fs.readFileSync(mainPath, 'utf8');
  const createWindowStart = source.indexOf('function createWindow()');
  const closeHelperStart = source.indexOf('function closeWindowAfterWork', createWindowStart);
  assert.ok(createWindowStart >= 0 && closeHelperStart > createWindowStart);

  const createWindowSource = source.slice(createWindowStart, closeHelperStart);
  assert.match(
    createWindowSource,
    /const windowWebContentsId\s*=\s*window\.webContents\.id\s*;/,
  );

  const closedHandler = createWindowSource.match(
    /window\.once\('closed',\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/,
  );
  assert.ok(closedHandler, 'Không tìm thấy BrowserWindow closed handler.');
  assert.match(closedHandler[1], /const key\s*=\s*windowWebContentsId\s*;/);
  assert.doesNotMatch(closedHandler[1], /window\.webContents/);
});
