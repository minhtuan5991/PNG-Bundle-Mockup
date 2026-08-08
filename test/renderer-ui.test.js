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
