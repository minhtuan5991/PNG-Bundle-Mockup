'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('v1.4.0 dùng hai radio loại trừ và cả hai chế độ hỗ trợ PDF Download', () => {
  const html = read('src/renderer/index.html');
  assert.match(html, /id="mockupModeBundle"\s+name="mockupMode"[^>]*value="bundle"[^>]*checked/);
  assert.match(html, /id="mockupModeGroup"\s+name="mockupMode"[^>]*value="group-shirt"/);
  const pdfBlock = html.match(/<div id="pdfOptionBlock">([\s\S]*?)<\/div>\s*<label class="check-option">/);
  assert.ok(pdfBlock, 'PDF option phải nằm trong khối tùy chọn dùng chung');
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

test('preload và main expose đủ IPC Group Shirt, PDF và bộ lọc template bundle', () => {
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
  assert.match(main, /ipcMain\.handle\('group-shirt:generate'[\s\S]*?createDownloadPdf\(\{/);
  assert.match(main, /ipcMain\.handle\('group-shirt:generate'[\s\S]*?templateMarker:\s*'bundle'/);
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
  assert.match(main, /v140Api:\s*typeof window\.bundleApi\?\.selectGroupShirtTemplates/);
  assert.match(main, /v140Controls:\s*Boolean\(document\.querySelector\('#mockupModeBundle'\)/);
  assert.match(main, /v140SourceDirectory:[\s\S]*?groupSourceDirectory/);
  assert.match(main, /v142SharedMgs:[\s\S]*?!analyzeGroupShirtSetup[\s\S]*?state\.groupTemplates/);
  assert.match(main, /renameDialogActions:[\s\S]*?#renamePngApply[\s\S]*?Đổi tên và Đóng/);
  assert.match(main, /renameSelectionOnly:[\s\S]*?openRenamePngDialog[\s\S]*?selectedRenameFiles/);
  assert.match(main, /v140ModeSwitch:[\s\S]*?!pdfBlock\.classList\.contains\('is-hidden'\)/);
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
  assert.match(generate, /generateSingleMockups\(\{[\s\S]*?templateMarker:\s*'bundle'/);
});

test('renderer dispatch theo mode và payload Group Shirt nhận tùy chọn PDF dùng chung', () => {
  const script = read('src/renderer/app.js');
  assert.match(script, /state\.mockupMode\s*===\s*'group-shirt'[\s\S]*?api\.renderGroupShirtPreview/);
  assert.match(script, /state\.mockupMode\s*===\s*'group-shirt'[\s\S]*?api\.generateGroupShirtMockups/);
  const validationStart = script.indexOf('function validateGroupReady');
  const validationEnd = script.indexOf('\nfunction validateReady', validationStart);
  const validation = script.slice(validationStart, validationEnd);
  assert.match(validation, /includeAdditionalOutputs[\s\S]*?readAdditionalGenerationOptions\(\)/);
  assert.doesNotMatch(validation, /createPdfDownload:\s*false/);
  assert.match(validation, /templatePaths:\s*state\.groupTemplates/);
  assert.match(validation, /directories\.size\s*!==\s*1/);
  assert.match(script, /function groupSourceDirectory\(file\)\s*\{[\s\S]*?file\?\.directory[\s\S]*?state\.sourceDirectory/);
  const analysisStart = script.indexOf('function analyzeGroupShirtSetup');
  const analysisEnd = script.indexOf('\nfunction groupSourceDescriptors', analysisStart);
  const analysis = script.slice(analysisStart, analysisEnd);
  assert.match(analysis, /for \(const template of state\.groupTemplates\)/);
  assert.doesNotMatch(analysis, /templatesByGroup|missingTemplateGroups/);
  assert.match(script, /Không có ảnh nền mgs có vùng in phù hợp cho nhóm/);
  assert.match(read('src/renderer/index.html'), /mọi nhóm PNG dùng các nền có vùng in phù hợp/);
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

test('Group Shirt ẩn thiết lập Bundle, giữ alpha và có bộ chọn màu vùng in', () => {
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
  assert.match(html, /Vùng luôn giữ tỷ lệ 42×48 khi scale hoặc xoay/);
  assert.match(html, /id=.groupRegionColorLight.[\s\S]*?Áo sáng màu/);
  assert.match(html, /id=.groupRegionColorDark.[\s\S]*?Áo tối màu/);
  assert.match(script, /groupRegionColorLight\.checked[\s\S]*?groupRegionColorDark\.checked\s*=\s*false/);
  assert.match(script, /groupRegionColorDark\.checked[\s\S]*?groupRegionColorLight\.checked\s*=\s*false/);
  assert.match(html, /Đổi tên PNG chỉ gắn hoặc thay tag màu\/mặt/);
  assert.match(html, /“Nhóm \(số\)”[\s\S]*?File Explorer/);
});

test('vùng Group Shirt scale khóa đúng tỷ lệ pixel 42×48 và tối thiểu 7×8', () => {
  const script = read('src/renderer/app.js');
  const constrainStart = script.indexOf('function constrainGroupRegion');
  const markDirtyStart = script.indexOf('function markGroupEditorDirty', constrainStart);
  const dragStart = script.indexOf('function moveGroupRegionDrag');
  const dragEnd = script.indexOf('function endGroupRegionDrag', dragStart);
  const constrain = script.slice(constrainStart, markDirtyStart);
  const drag = script.slice(dragStart, dragEnd);
  assert.match(constrain, /aspectRatio\s*=\s*42\s*\/\s*48/);
  assert.match(constrain, /pixelWidth\s*=\s*Math\.max\(7,/);
  assert.match(constrain, /pixelHeight\s*=\s*pixelWidth\s*\/\s*aspectRatio/);
  assert.match(drag, /aspectRatio\s*=\s*42\s*\/\s*48/);
  assert.match(drag, /pixelHeight\s*=\s*Math\.max\(8,/);
  assert.match(drag, /pixelWidth\s*=\s*pixelHeight\s*\*\s*aspectRatio/);
});

test('package và lockfile cùng mang version 1.4.9', () => {
  const manifest = JSON.parse(read('package.json'));
  const lockfile = JSON.parse(read('package-lock.json'));
  assert.equal(manifest.version, '1.4.9');
  assert.equal(lockfile.version, '1.4.9');
  assert.equal(lockfile.packages[''].version, '1.4.9');
});
