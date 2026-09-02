'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rendererDirectory = path.resolve(__dirname, '..', 'src', 'renderer');

function cssRuleBody(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `Không tìm thấy CSS rule ${selector}`);
  return match[1];
}

test('checkbox tùy chọn neo focus vào label để không cuộn lệch viewport gốc', () => {
  const css = fs.readFileSync(path.join(rendererDirectory, 'styles.css'), 'utf8');
  const optionRule = cssRuleBody(css, '.check-option');
  const inputRule = cssRuleBody(css, '.check-option input');

  assert.match(optionRule, /position\s*:\s*relative\s*;/);
  assert.match(inputRule, /position\s*:\s*absolute\s*;/);
  assert.match(inputRule, /inset\s*:\s*0\s*;/);
  assert.match(inputRule, /width\s*:\s*100%\s*;/);
  assert.match(inputRule, /height\s*:\s*100%\s*;/);
});

test('checkbox mockup đơn luôn có thể bật để tự làm mới Input hoặc báo hướng dẫn', () => {
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');

  assert.doesNotMatch(
    script,
    /singleMockupTemplates\.length\s*===\s*0\s*&&\s*!elements\.createSingleMockups\.checked/,
  );
  assert.match(
    script,
    /createSingleMockups\.addEventListener\('change',\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await refreshInputAssets\(\)/,
  );
  assert.doesNotMatch(
    script,
    /singleMockupTemplates\.length\s*===\s*0[\s\S]{0,180}createSingleMockups\.checked\s*=\s*false/,
  );
  assert.match(script, /Main checks Done before validating Input\/regions/);
  assert.doesNotMatch(
    script,
    /editSingleMockupRegions\.disabled\s*=\s*[\s\S]{0,180}singleMockupTemplates\.length/,
  );
});

test('checkbox PDF vẫn bật để backend có thể bỏ qua khi Done đã có PDF', () => {
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');

  assert.doesNotMatch(
    script,
    /createPdfDownload\.disabled\s*=\s*[\s\S]{0,180}pdfTemplates\.length/,
  );
});

test('focus ô link PDF không được tự cuộn toàn bộ cửa sổ', () => {
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');

  assert.match(script, /downloadUrl\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

test('nút Loại bỏ PNG xóa sạch phiên làm việc PNG nhưng giữ nguyên file gốc', () => {
  const html = fs.readFileSync(path.join(rendererDirectory, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');
  const clearStart = script.indexOf('function clearPngFiles()');
  const clearEnd = script.indexOf('\nasync function addDroppedPngFiles', clearStart);
  const clearSource = script.slice(clearStart, clearEnd);

  assert.match(html, /id="removePngButton"[^>]*>[\s\S]*?Loại bỏ PNG<\/button>/);
  assert.doesNotMatch(html, /Giữ nguyên thứ tự tên file/);
  assert.doesNotMatch(script, /Giữ nguyên thứ tự tên file/);
  assert.match(
    script,
    /function clearPngFiles\(\)[\s\S]*?state\.sourceDirectory = null;[\s\S]*?state\.sourceDirectories = new Set\(\);[\s\S]*?state\.files = \[\];[\s\S]*?state\.selected = new Set\(\);/,
  );
  assert.match(script, /state\.output = null;[\s\S]*?renderSourcePathSummary\(\);/);
  assert.match(script, /File gốc vẫn được giữ nguyên\./);
  assert.match(script, /removePngButton\.addEventListener\('click', clearPngFiles\)/);
  assert.deepEqual(
    [...clearSource.matchAll(/\bapi\.([A-Za-z]\w*)/g)].map((match) => match[1]),
    ['clearSourceAuthorization'],
  );
  assert.doesNotMatch(clearSource, /unlink|rmSync|removeItem/i);
});

test('popup Group Shirt có đổi tên giữ mở, đổi tên và đóng, cùng hủy không lưu', () => {
  const html = fs.readFileSync(path.join(rendererDirectory, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');
  const closeStart = script.indexOf('function closeRenamePngDialog()');
  const closeEnd = script.indexOf('\nasync function applyRenamePngFiles', closeStart);
  const closeSource = script.slice(closeStart, closeEnd);

  assert.match(html, /id="renamePngCancel"[^>]*>Hủy<\/button>/);
  assert.match(html, /id="renamePngApply"[^>]*>Đổi Tên<\/button>/);
  assert.match(html, /id="renamePngConfirm"[^>]*>Đổi tên và Đóng<\/button>/);
  assert.match(script, /async function applyRenamePngFiles\(closeAfterSave = false\)/);
  assert.match(script, /renamePngApply\.addEventListener\('click', \(\) => applyRenamePngFiles\(false\)\)/);
  assert.match(script, /renamePngConfirm\.addEventListener\('click', \(\) => applyRenamePngFiles\(true\)\)/);
  assert.match(script, /if \(closeAfterSave\) closeRenamePngDialog\(\);/);
  assert.match(script, /picker\.selected = new Set\(\[\.\.\.picker\.selected\]\.map/);
  assert.match(script, /renamePngCancel\.addEventListener\('click', closeRenamePngDialog\)/);
  assert.doesNotMatch(closeSource, /renameGroupShirtPngFiles|applyRenamePngFiles/);
});

test('popup Group Shirt chỉ đổi tên các thumbnail được chọn rõ ràng', () => {
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');
  const openStart = script.indexOf('function openRenamePngDialog()');
  const openEnd = script.indexOf('\nfunction closeRenamePngDialog()', openStart);
  const applyStart = script.indexOf('async function applyRenamePngFiles');
  const applyEnd = script.indexOf('\nfunction commitSourcePicker()', applyStart);
  const openSource = script.slice(openStart, openEnd);
  const applySource = script.slice(applyStart, applyEnd);

  assert.match(openSource, /selected:\s*new Set\(\)/);
  assert.doesNotMatch(openSource, /new Set\(files\.map/);
  assert.match(script, /function selectedRenameFiles\(\)[\s\S]*?renamePicker\.selected\.has\(file\.path\)/);
  assert.match(script, /next\.textContent = !checked[\s\S]*?'Không đổi tên'/);
  assert.match(applySource, /const filePaths = selectedRenameFiles\(\)\.map\(\(file\) => file\.path\);/);
  assert.match(applySource, /renameGroupShirtPngFiles\(\{ filePaths, color, side, gender \}\)/);
});

test('thumbnail đổi tên Group Shirt đủ lớn để nhận diện ảnh rõ hơn', () => {
  const css = fs.readFileSync(path.join(rendererDirectory, 'styles.css'), 'utf8');
  const gridRule = cssRuleBody(css, '.rename-png-grid');
  const tileRule = cssRuleBody(css, '.rename-png-tile');
  const imageRule = cssRuleBody(css, '.rename-png-tile img');

  assert.match(gridRule, /minmax\(178px,\s*1fr\)/);
  assert.match(gridRule, /gap\s*:\s*12px\s*;/);
  assert.match(tileRule, /grid-template-columns\s*:\s*80px\s+minmax\(0,\s*1fr\)\s*;/);
  assert.match(tileRule, /min-height\s*:\s*92px\s*;/);
  assert.match(imageRule, /width\s*:\s*80px\s*;/);
  assert.match(imageRule, /height\s*:\s*76px\s*;/);
  assert.match(imageRule, /object-fit\s*:\s*contain\s*;/);
});

test('vùng in Group Shirt dùng đúng 12 màu tổ hợp và vẫn giữ nhãn chữ', () => {
  const css = fs.readFileSync(path.join(rendererDirectory, 'styles.css'), 'utf8');
  const script = fs.readFileSync(path.join(rendererDirectory, 'app.js'), 'utf8');
  const rootRule = cssRuleBody(css, ':root');
  const tokens = {
    '--group-region-front-light': '#f2cf66',
    '--group-region-front-dark': '#d8b1ff',
    '--group-region-back-light': '#fab264',
    '--group-region-back-dark': '#9a57dc',
    '--group-region-front-light-male': '#88e2f9',
    '--group-region-front-light-female': '#ffa2ef',
    '--group-region-front-dark-male': '#5951ff',
    '--group-region-front-dark-female': '#bc75ff',
    '--group-region-back-light-male': '#3506e1',
    '--group-region-back-light-female': '#7719cf',
    '--group-region-back-dark-male': '#231094',
    '--group-region-back-dark-female': '#420a77',
  };
  for (const [token, color] of Object.entries(tokens)) {
    assert.match(rootRule, new RegExp(`${token}\\s*:\\s*${color}\\s*;`, 'i'));
  }

  const selectors = {
    '.group-print-region[data-color="wh"][data-side="front"]': '--group-region-front-light',
    '.group-print-region[data-color="bl"][data-side="front"]': '--group-region-front-dark',
    '.group-print-region[data-color="wh"][data-side="back"]': '--group-region-back-light',
    '.group-print-region[data-color="bl"][data-side="back"]': '--group-region-back-dark',
    '.group-print-region[data-color="wh"][data-side="front"][data-gender="m"]': '--group-region-front-light-male',
    '.group-print-region[data-color="wh"][data-side="front"][data-gender="w"]': '--group-region-front-light-female',
    '.group-print-region[data-color="bl"][data-side="front"][data-gender="m"]': '--group-region-front-dark-male',
    '.group-print-region[data-color="bl"][data-side="front"][data-gender="w"]': '--group-region-front-dark-female',
    '.group-print-region[data-color="wh"][data-side="back"][data-gender="m"]': '--group-region-back-light-male',
    '.group-print-region[data-color="wh"][data-side="back"][data-gender="w"]': '--group-region-back-light-female',
    '.group-print-region[data-color="bl"][data-side="back"][data-gender="m"]': '--group-region-back-dark-male',
    '.group-print-region[data-color="bl"][data-side="back"][data-gender="w"]': '--group-region-back-dark-female',
  };
  for (const [selector, token] of Object.entries(selectors)) {
    assert.match(cssRuleBody(css, selector), new RegExp(`--region-color\\s*:\\s*var\\(${token}\\)\\s*;`));
  }

  assert.match(script, /genderLabel = region\.gender === 'm' \? 'Nam · ' : \(region\.gender === 'w' \? 'Nữ · ' : ''\)/);
  assert.match(script, /label\.textContent = `\$\{genderLabel\}\$\{colorLabel\} · \$\{sideLabel\} \$\{trackIndex\}`/);
});
