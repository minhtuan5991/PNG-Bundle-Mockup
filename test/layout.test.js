'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LayoutError,
  balanceCounts,
  splitBalanced,
  buildPlacements,
} = require('../src/engine/layout');

function squareAssets(count) {
  return Array.from({ length: count }, (_, index) => ({
    path: `asset-${index}.png`,
    width: 100,
    height: 100,
  }));
}

const sampleSettings = {
  topMargin: 195,
  bottomMargin: 195,
  sideMargin: 24,
  gap: 20,
};

test('balanceCounts chia đều và giữ phần dư ở các nhóm đầu', () => {
  assert.deepEqual(balanceCounts(30, 1), [30]);
  assert.deepEqual(balanceCounts(30, 2), [15, 15]);
  assert.deepEqual(balanceCounts(31, 2), [16, 15]);
  assert.deepEqual(balanceCounts(32, 3), [11, 11, 10]);
});

test('splitBalanced không làm thiếu, lặp hoặc đổi thứ tự', () => {
  const items = Array.from({ length: 17 }, (_, index) => index + 1);
  const groups = splitBalanced(items, 4);
  assert.deepEqual(groups.map((group) => group.length), [5, 4, 4, 4]);
  assert.deepEqual(groups.flat(), items);
});

test('không cho tạo nhiều mockup hơn số PNG', () => {
  assert.throws(() => balanceCounts(2, 3), (error) => {
    assert.ok(error instanceof LayoutError);
    assert.equal(error.code, 'TOO_MANY_GROUPS');
    return true;
  });
});

test('15 ảnh vuông trên template mẫu tạo lưới 5 cột × 3 hàng', () => {
  const layout = buildPlacements(squareAssets(15), 765, 767, sampleSettings);
  assert.equal(layout.grid.cols, 5);
  assert.equal(layout.grid.rows, 3);
  assert.deepEqual(layout.grid.rowCounts, [5, 5, 5]);
});

test('mọi pixel được đặt hoàn toàn trong vùng lề quy định', () => {
  const assets = squareAssets(14).map((asset, index) => ({
    ...asset,
    width: index % 2 ? 220 : 80,
    height: index % 3 ? 100 : 240,
  }));
  const layout = buildPlacements(assets, 765, 767, sampleSettings);
  for (const placement of layout.placements) {
    assert.ok(placement.left >= sampleSettings.sideMargin);
    assert.ok(placement.top >= sampleSettings.topMargin);
    assert.ok(placement.left + placement.width <= 765 - sampleSettings.sideMargin);
    assert.ok(placement.top + placement.height <= 767 - sampleSettings.bottomMargin);
    const aspectBefore = placement.sourceWidth / placement.sourceHeight;
    const aspectAfter = placement.width / placement.height;
    assert.ok(Math.abs(aspectBefore - aspectAfter) < 0.025);
  }
});

test('báo lỗi rõ ràng khi tổng lề dọc chiếm hết template', () => {
  assert.throws(
    () => buildPlacements(squareAssets(1), 300, 390, sampleSettings),
    (error) => error.code === 'VERTICAL_AREA_EMPTY',
  );
});
