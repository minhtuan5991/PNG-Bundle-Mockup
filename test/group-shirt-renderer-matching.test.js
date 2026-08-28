'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const backendMatching = require('../src/shared/group-shirt-matching');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('matching ở browser và backend lọc nền có mặt sau cho nhóm chỉ có mặt trước', () => {
  const browserContext = {};
  vm.runInNewContext(read('src/shared/group-shirt-matching.js'), browserContext);
  const sources = [{ color: 'wh', side: 'f', explicitColor: null, explicitSide: null }];
  const regions = [
    { id: 'wh-f', color: 'wh', side: 'front' },
    { id: 'bl-f', color: 'bl', side: 'front' },
    { id: 'wh-b', color: 'wh', side: 'back' },
    { id: 'bl-b', color: 'bl', side: 'back' },
  ];

  for (const matching of [backendMatching, browserContext.groupShirtMatching]) {
    const profile = matching.groupShirtProfile(sources);
    const match = matching.matchGroupShirtTemplate(profile, sources, regions.slice(0, 2));
    assert.equal(profile, 'plain');
    assert.equal(match.compatible, true);
    assert.deepEqual(Array.from(match.regions, (region) => region.id), ['wh-f', 'bl-f']);
    assert.deepEqual(Array.from(match.coveredPoolKeys), ['all']);
    assert.equal(match.ignoredRegionCount, 0);
    assert.equal(matching.missingSourcePoolKeys(profile, sources, [match]).length, 0);

    const mixedSides = matching.matchGroupShirtTemplate(profile, sources, regions);
    assert.equal(mixedSides.compatible, false);
    assert.match(mixedSides.reason, /không có PNG mặt sau/);
    const backOnly = matching.matchGroupShirtTemplate(profile, sources, [regions[3]]);
    assert.equal(backOnly.compatible, false);
    assert.equal(backOnly.regions.length, 0);
    assert.deepEqual(Array.from(matching.missingSourcePoolKeys(profile, sources, [backOnly])), ['all']);
    assert.equal(matching.matchGroupShirtTemplate(profile, sources, []).compatible, false);
  }
});

test('matching nhóm hỗn hợp giống nhau với cờ boolean backend và null/string renderer', () => {
  const browserContext = {};
  vm.runInNewContext(read('src/shared/group-shirt-matching.js'), browserContext);
  const regions = [
    { id: 'wh-f', color: 'wh', side: 'front' },
    { id: 'bl-f', color: 'bl', side: 'front' },
    { id: 'wh-b', color: 'wh', side: 'back' },
    { id: 'bl-b', color: 'bl', side: 'back' },
  ];
  for (const matching of [backendMatching, browserContext.groupShirtMatching]) {
    for (const browserFlags of [false, true]) {
      const sources = [
        { color: 'wh', side: 'f', explicitColor: browserFlags ? null : false, explicitSide: browserFlags ? 'f' : true },
        { color: 'wh', side: 'b', explicitColor: browserFlags ? 'wh' : true, explicitSide: browserFlags ? 'b' : true },
        { color: 'bl', side: 'b', explicitColor: browserFlags ? 'bl' : true, explicitSide: browserFlags ? 'b' : true },
      ];
      const profile = matching.groupShirtProfile(sources);
      const match = matching.matchGroupShirtTemplate(profile, sources, regions);
      assert.equal(profile, 'color-side');
      assert.equal(match.compatible, true);
      assert.deepEqual(Array.from(match.regions, (region) => region.id), ['wh-f', 'bl-f', 'wh-b', 'bl-b']);
      assert.deepEqual(Array.from(match.coveredPoolKeys), ['track:*.front', 'track:wh.back', 'track:bl.back']);
      assert.equal(matching.missingSourcePoolKeys(profile, sources, [match]).length, 0);
      assert.deepEqual(Array.from(matching.regionSourcePoolKeys(profile, regions[1])), ['track:bl.front', 'track:*.front']);
    }
  }
});

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
