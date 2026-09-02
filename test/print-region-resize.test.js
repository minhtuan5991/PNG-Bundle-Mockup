'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const resize = require('../src/shared/print-region-resize');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

function corner(region, handle) {
  const radians = (region.rotation || 0) * Math.PI / 180;
  const x = region.width / 2 * (handle.includes('e') ? 1 : -1);
  const y = region.height / 2 * (handle.includes('s') ? 1 : -1);
  return {
    x: region.centerX + x * Math.cos(radians) - y * Math.sin(radians),
    y: region.centerY + x * Math.sin(radians) + y * Math.cos(radians),
  };
}
const opposite = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' };

test('bốn góc giữ nguyên góc đối diện, tỷ lệ 42×48 và biên ảnh kể cả khi xoay', () => {
  for (const rotation of [0, 12, 45, 90, 135, 180, -12, -45, -90, -135]) {
    const start = { centerX: 500, centerY: 400, width: 175, height: 200, rotation };
    for (const handle of Object.keys(opposite)) {
      for (const delta of [{ x: 0, y: 0 }, { x: 24, y: -31 }, { x: 3000, y: 3000 }, { x: -3000, y: -3000 }]) {
        const next = { ...start, ...resize.resizeFromCorner(start, handle, delta, { width: 1000, height: 800 }) };
        const anchor = corner(start, opposite[handle]);
        const nextAnchor = corner(next, opposite[handle]);
        near(nextAnchor.x, anchor.x);
        near(nextAnchor.y, anchor.y);
        near(next.width / next.height, 42 / 48);
        assert.ok(next.height >= 8 - 1e-7);
        if (delta.x === 0 && delta.y === 0) {
          near(next.width, start.width);
          near(next.height, start.height);
        }
        for (const name of Object.keys(opposite)) {
          const point = corner(next, name);
          assert.ok(point.x >= -1e-7 && point.x <= 1000 + 1e-7);
          assert.ok(point.y >= -1e-7 && point.y <= 800 + 1e-7);
        }
      }
    }
  }
});

test('kéo tới đúng góc mới làm vùng lớn/nhỏ chính xác mà không di chuyển điểm neo', () => {
  for (const rotation of [0, 30, -80, 140]) {
    for (const handle of Object.keys(opposite)) {
      for (const scale of [0.5, 1.5]) {
        const start = { centerX: 500, centerY: 400, width: 175, height: 200, rotation };
        const anchor = corner(start, opposite[handle]);
        const oldCorner = corner(start, handle);
        const delta = { x: (oldCorner.x - anchor.x) * (scale - 1), y: (oldCorner.y - anchor.y) * (scale - 1) };
        const next = resize.resizeFromCorner(start, handle, delta, { width: 1000, height: 800 });
        near(next.width, start.width * scale);
        near(next.height, start.height * scale);
      }
    }
  }
});

test('helper được nạp trước app và browser dùng cùng thuật toán', () => {
  const context = {};
  vm.runInNewContext(read('src/shared/print-region-resize.js'), context);
  const args = [{ centerX: 500, centerY: 400, width: 175, height: 200, rotation: 35 }, 'nw', { x: -12, y: -50 }, { width: 1000, height: 800 }];
  assert.deepEqual(JSON.parse(JSON.stringify(context.printRegionResize.resizeFromCorner(...args))), resize.resizeFromCorner(...args));
  const html = read('src/renderer/index.html');
  assert.ok(html.indexOf('../shared/print-region-resize.js') < html.indexOf('src="app.js"'));
});

function rendererFunction(name, nextName) {
  const script = read('src/renderer/app.js');
  return script.slice(script.indexOf(`function ${name}(`), script.indexOf(`function ${nextName}(`));
}

test('handler Group Shirt dùng đúng góc đang kéo, hỗ trợ nền không vuông và vùng xoay', () => {
  for (const handle of Object.keys(opposite)) {
    const template = { width: 1200, height: 800 };
    const start = { id: 'one', centerX: 0.5, centerY: 0.5, width: 175 / 1200, height: 200 / 800, rotation: 30, side: 'front', color: 'bl', gender: 'm' };
    const region = { ...start };
    const frame = { left: 25, top: 30, width: 600, height: 400 };
    const node = { dataset: { regionId: 'one' }, setPointerCapture() {}, classList: { add() {} } };
    const state = { regionEditor: { kind: 'group' } };
    const context = {
      state, printRegionResize: resize,
      elements: { imageFrame: { getBoundingClientRect: () => frame } },
      selectGroupRegion() {}, currentGroupRegion: () => region,
      currentGroupRegionEntry: () => ({ template }), cloneGroupRegion: (r) => ({ ...r }),
      markGroupEditorDirty() {}, updateGroupRegionElement() {},
      constrainGroupRegion: () => assert.fail('Resize không được căn lại tâm'),
    };
    vm.runInNewContext(rendererFunction('beginGroupRegionDrag', 'endGroupRegionDrag'), context);
    context.beginGroupRegionDrag({ button: 0, pointerId: 1, clientX: 110, clientY: 100, target: { closest: () => node, dataset: { groupHandle: handle } }, preventDefault() {} });
    assert.equal(state.regionEditor.drag.handle, handle);
    context.moveGroupRegionDrag({ pointerId: 1, clientX: 170, clientY: 130, preventDefault() {} });
    const pixelRegion = (r) => ({ ...r, centerX: r.centerX * 1200, centerY: r.centerY * 800, width: r.width * 1200, height: r.height * 800 });
    const before = corner(pixelRegion(start), opposite[handle]);
    const after = corner(pixelRegion(region), opposite[handle]);
    near(after.x, before.x);
    near(after.y, before.y);
    assert.equal(region.gender, 'm');
    assert.equal(region.color, 'bl');
    assert.equal(region.rotation, 30);
  }
});

test('mockup đơn của Bundle và Group Shirt đều resize từ góc đối diện', () => {
  for (const source of ['bundle', 'group-shirt']) {
    for (const handle of Object.keys(opposite)) {
      const entry = { template: { width: 1200, height: 800 }, region: { x: 0.25, y: 0.25, width: 0.175, height: 0.3 } };
      const start = { left: 150, top: 100, width: 105, height: 120 };
      const state = { regionEditor: { source, dirty: true, drag: { pointerId: 1, mode: 'resize', handle, frame: { width: 600, height: 400 }, startX: 50, startY: 50, start } } };
      const context = { state, printRegionResize: resize, currentRegionEntry: () => entry, syncEditorWindowState() {}, updatePrintRegion() {}, setRegionEditorStatus() {} };
      vm.runInNewContext(rendererFunction('movePrintRegionDrag', 'endPrintRegionDrag'), context);
      context.movePrintRegionDrag({ pointerId: 1, clientX: 65, clientY: 75, preventDefault() {} });
      const before = corner({ centerX: start.left + start.width / 2, centerY: start.top + start.height / 2, width: start.width, height: start.height }, opposite[handle]);
      const r = entry.region;
      const after = corner({ centerX: (r.x + r.width / 2) * 600, centerY: (r.y + r.height / 2) * 400, width: r.width * 600, height: r.height * 400 }, opposite[handle]);
      near(after.x, before.x);
      near(after.y, before.y);
    }
  }
});
