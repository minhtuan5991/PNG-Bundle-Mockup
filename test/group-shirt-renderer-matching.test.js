'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('renderer nạp matching dùng chung trước app và không giữ predicate exact-set cũ', () => {
  const html = read('src/renderer/index.html');
  const app = read('src/renderer/app.js');
  const planner = read('src/services/group-shirt-planner.js');

  assert.ok(
    html.indexOf('../shared/group-shirt-matching.js') < html.indexOf('src="app.js"'),
    'matching phải được nạp trước app.js',
  );
  assert.match(app, /const groupShirtMatching = window\.groupShirtMatching/);
  assert.match(app, /groupShirtMatching\.matchGroupShirtTemplate/);
  assert.match(app, /groupShirtMatching\.missingSourcePoolKeys/);
  assert.match(planner, /require\('\.\.\/shared\/group-shirt-matching'\)/);
  assert.match(planner, /matchGroupShirtTemplate\(group\.profile, group\.sources, regions\)/);
  assert.doesNotMatch(app, /sourceTracks[\s\S]*?regionTracks[\s\S]*?extraTrack/);
  assert.doesNotMatch(planner, /const extraTrack/);
});
