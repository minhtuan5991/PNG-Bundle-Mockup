'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('v1.3.0 dùng hai radio loại trừ và chỉ Bundle chứa PDF Download', () => {
  const html = read('src/renderer/index.html');
  assert.match(html, /id="mockupModeBundle"\s+name="mockupMode"[^>]*value="bundle"[^>]*checked/);
  assert.match(html, /id="mockupModeGroup"\s+name="mockupMode"[^>]*value="group-shirt"/);
  const pdfBlock = html.match(/<div id="pdfOptionBlock">([\s\S]*?)<\/div>\s*<label class="check-option">/);
  assert.ok(pdfBlock, 'PDF option phải có wrapper Bundle-only');
  assert.match(pdfBlock[1], /id="createPdfDownload"/);
  assert.match(html, /id="chooseGroupTemplatesButton"/);
  assert.match(html, /id="editGroupMockupRegions"/);
});

test('mọi ID renderer query đều tồn tại đúng một lần trong HTML', () => {
  const html = read('src/renderer/index.html');
  const script = read('src/renderer/app.js');
  const queriedIds = [...script.matchAll(/querySelector\('#([^']+)'\)/g)].map((match) => match[1]);
  for (const id of new Set(queriedIds)) {
    const occurrences = [...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length;
    assert.equal(occurrences, 1, `ID #${id} phải tồn tại đúng một lần`);
  }
});

test('preload và main expose đủ IPC Group Shirt nhưng chặn PDF ở backend', () => {
  const preload = read('src/preload.js');
  const main = read('src/main.js');
  for (const apiName of [
    'renameGroupShirtPngFiles',
    'saveGroupShirtRegions',
    'selectGroupShirtTemplates',
    'renderGroupShirtPreview',
    'generateGroupShirtMockups',
  ]) assert.match(preload, new RegExp(`${apiName}:`));
  for (const channel of [
    'source:rename-group-shirt-png-files',
    'group-shirt:save-regions',
    'dialog:select-group-shirt-templates',
    'group-shirt:preview',
    'group-shirt:generate',
  ]) assert.match(main, new RegExp(`ipcMain\\.handle\\('${channel}'`));
  assert.match(main, /createPdfDownload\s*===\s*true[\s\S]*?UNSUPPORTED_OPTION_FOR_MODE/);
  assert.match(main, /selectLightGroupShirtSources\(sourcePaths\)/);
});

test('Group Shirt đăng ký job trước mọi inspect async và xác thực capability theo sender', () => {
  const main = read('src/main.js');
  const previewStart = main.indexOf("ipcMain.handle('group-shirt:preview'");
  const generateStart = main.indexOf("ipcMain.handle('group-shirt:generate'");
  const bundleStart = main.indexOf("ipcMain.handle('mockup:generate'", generateStart);
  assert.ok(previewStart >= 0 && generateStart > previewStart && bundleStart > generateStart);

  const preview = main.slice(previewStart, generateStart);
  const generate = main.slice(generateStart, bundleStart);
  for (const handler of [preview, generate]) {
    const beginIndex = handler.indexOf('beginJob(event');
    const sourceIndex = handler.indexOf('validateGroupShirtSourcePayload(');
    const templateAuthIndex = handler.indexOf('validateAuthorizedGroupTemplatePaths(');
    const inspectIndex = handler.indexOf('inspectGroupShirtTemplatePaths(');
    assert.ok(beginIndex >= 0, 'handler phải đăng ký job');
    assert.ok(beginIndex < sourceIndex, 'beginJob phải chạy trước source validation');
    assert.ok(sourceIndex < templateAuthIndex, 'source capability phải được kiểm tra');
    assert.ok(templateAuthIndex < inspectIndex, 'template capability phải được kiểm tra trước inspect');
    assert.match(handler, /validateGroupShirtSourcePayload\([\s\S]*?event\.sender\.id/);
    assert.match(handler, /validateAuthorizedGroupTemplatePaths\([\s\S]*?event\.sender\.id/);
    assert.match(handler, /finally\s*\{[\s\S]*?jobControl\.finish\(\)/);
  }
});

test('allowlist và fingerprint bảo vệ source/template theo từng renderer', () => {
  const main = read('src/main.js');
  assert.match(main, /if\s*\(smokeTest\)\s*app\.disableHardwareAcceleration\(\)/);
  assert.match(main, /v130Api:\s*typeof window\.bundleApi\?\.selectGroupShirtTemplates/);
  assert.match(main, /v130Controls:\s*Boolean\(document\.querySelector\('#mockupModeBundle'\)/);
  assert.match(main, /const authorizedSourcePaths\s*=\s*new Map\(\)/);
  assert.match(main, /const authorizedGroupTemplatePaths\s*=\s*new Map\(\)/);
  assert.match(main, /replaceAuthorizedPaths\([\s\S]*?event\.sender\.id/);
  assert.match(main, /assertAuthorizedPaths\([\s\S]*?senderId/);
  assert.match(main, /authorizedSourcePaths\.delete\(key\)/);
  assert.match(main, /authorizedGroupTemplatePaths\.delete\(key\)/);
  assert.match(
    main,
    /fingerprint:\s*createHash\('sha256'\)\.update\(contents\)\.digest\('hex'\)/,
  );
});

test('mockup đơn Group Shirt preflight áo sáng trước render nhưng vẫn cho service skip Done cũ', () => {
  const main = read('src/main.js');
  const helperStart = main.indexOf('async function preflightGroupSingleMockupSources');
  const helperEnd = main.indexOf('\nfunction createWindow', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  const helper = main.slice(helperStart, helperEnd);
  assert.match(helper, /selectLightGroupShirtSources\(sourcePaths\)/);
  assert.match(helper, /findExistingSingleMockupOutputs\([\s\S]*?Done/);
  assert.match(helper, /existingPaths\.length\s*>\s*0[\s\S]*?return \[\]/);
  assert.match(helper, /NO_LIGHT_SINGLE_MOCKUP_SOURCES/);

  const generateStart = main.indexOf("ipcMain.handle('group-shirt:generate'");
  const bundleStart = main.indexOf("ipcMain.handle('mockup:generate'", generateStart);
  const generate = main.slice(generateStart, bundleStart);
  assert.ok(
    generate.indexOf('preflightGroupSingleMockupSources(') <
      generate.indexOf('generateGroupShirtMockups('),
    'preflight áo sáng phải hoàn tất trước render Group Shirt',
  );
  assert.match(generate, /generateSingleMockups\(\{[\s\S]*?sourcePaths:\s*lightSources/);
});

test('renderer dispatch theo mode và payload Group Shirt luôn tắt PDF', () => {
  const script = read('src/renderer/app.js');
  assert.match(script, /state\.mockupMode\s*===\s*'group-shirt'[\s\S]*?api\.renderGroupShirtPreview/);
  assert.match(script, /state\.mockupMode\s*===\s*'group-shirt'[\s\S]*?api\.generateGroupShirtMockups/);
  const validationStart = script.indexOf('function validateGroupReady');
  const validationEnd = script.indexOf('\nfunction validateReady', validationStart);
  const validation = script.slice(validationStart, validationEnd);
  assert.match(validation, /createPdfDownload:\s*false/);
  assert.match(validation, /templatePaths:\s*state\.groupTemplates/);
  assert.match(validation, /directories\.size\s*!==\s*1/);
});

test('renderer giữ preview và thống kê đúng chế độ hiện tại', () => {
  const script = read('src/renderer/app.js');
  const commitStart = script.indexOf('function commitSourcePicker');
  const mergeStart = script.indexOf('function mergeDroppedFiles');
  const clearStart = script.indexOf('function clearPngFiles');
  const restoreStart = script.indexOf('function restorePreviewAfterRegionEditor');
  const exitStart = script.indexOf('function exitRegionEditor', restoreStart);
  const previewStart = script.indexOf('async function runPreview');
  const outputStart = script.indexOf('function showOutputPage', previewStart);
  assert.ok(commitStart >= 0 && mergeStart > commitStart && clearStart > mergeStart);
  assert.match(
    script.slice(commitStart, mergeStart),
    /restorePreviewAfterRegionEditor\(null\)/,
  );
  assert.match(
    script.slice(mergeStart, clearStart),
    /restorePreviewAfterRegionEditor\(null\)/,
  );
  const restore = script.slice(restoreStart, exitStart);
  assert.match(restore, /state\.mockupMode\s*===\s*'group-shirt'[\s\S]*?showGroupTemplatePreview/);
  assert.match(restore, /state\.mockupMode\s*===\s*'bundle'\s*&&\s*state\.template[\s\S]*?showTemplatePreview/);
  const preview = script.slice(previewStart, outputStart);
  assert.match(preview, /statTemplate\.textContent\s*=\s*[\s\S]*?result\.template\.width[\s\S]*?result\.template\.height/);
  assert.match(preview, /if\s*\(groupMode\)[\s\S]*?statLayout\.textContent\s*=\s*`\$\{result\.regionCount\s*\|\|\s*0\}\s*vùng in`/);
});

test('Group Shirt ẩn thiết lập Bundle nhưng giữ alpha và hướng dẫn tay xoay riêng', () => {
  const html = read('src/renderer/index.html');
  const script = read('src/renderer/app.js');
  assert.match(
    html,
    /id="bundleMarginSettingsPanel"[\s\S]*?id="topMargin"[\s\S]*?id="bottomMargin"[\s\S]*?id="sideMargin"[\s\S]*?<div class="field-grid advanced-grid">[\s\S]*?id="alphaThreshold"/,
  );
  assert.match(script, /bundleMarginSettingsPanel\.classList\.toggle\('is-hidden',\s*isGroup\)/);
  assert.match(script, /regionCount\s*=\s*analysis\.matchedTemplates\.reduce/);
  assert.match(script, /groupReadinessSummary\.classList\.toggle\([\s\S]*?'is-ready'/);
  assert.match(script, /groupReadinessSummary\.classList\.toggle\([\s\S]*?'is-warning'/);
  assert.match(html, /Kéo nút tròn ↻ riêng phía trên vùng để xoay tự do/);
  assert.match(html, /Đổi tên PNG chỉ gắn hoặc thay tag màu\/mặt/);
  assert.match(html, /“Nhóm \(số\)”[\s\S]*?File Explorer/);
});

test('vùng Group Shirt resize tự do với kích thước tối thiểu 1 pixel', () => {
  const script = read('src/renderer/app.js');
  const constrainStart = script.indexOf('function constrainGroupRegion');
  const markDirtyStart = script.indexOf('function markGroupEditorDirty', constrainStart);
  const dragStart = script.indexOf('function moveGroupRegionDrag');
  const dragEnd = script.indexOf('function endGroupRegionDrag', dragStart);
  const constrain = script.slice(constrainStart, markDirtyStart);
  const drag = script.slice(dragStart, dragEnd);
  assert.match(constrain, /minimumWidth\s*=\s*Math\.min\(1,\s*1\s*\/\s*template\.width\)/);
  assert.match(constrain, /minimumHeight\s*=\s*Math\.min\(1,\s*1\s*\/\s*template\.height\)/);
  assert.match(drag, /pixelWidth\s*=\s*Math\.max\(1,/);
  assert.match(drag, /pixelHeight\s*=\s*Math\.max\(1,/);
  assert.doesNotMatch(drag, /pixelWidth\s*\*\s*8\s*\/\s*7|pixelHeight\s*\*\s*7\s*\/\s*8/);
});

test('package và lockfile cùng mang version 1.3.0', () => {
  const manifest = JSON.parse(read('package.json'));
  const lockfile = JSON.parse(read('package-lock.json'));
  assert.equal(manifest.version, '1.3.0');
  assert.equal(lockfile.version, '1.3.0');
  assert.equal(lockfile.packages[''].version, '1.3.0');
});
