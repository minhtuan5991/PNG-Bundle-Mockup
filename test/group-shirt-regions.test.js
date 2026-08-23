'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  GROUP_SHIRT_REGION_SCHEMA_VERSION,
  GroupShirtRegionError,
  validateGroupShirtRegion,
  validateGroupShirtRegions,
  sanitizeGroupShirtRegionDocument,
  getGroupShirtRegionsFromDocument,
  createGroupShirtRegionStore,
} = require('../src/services/group-shirt-regions');

async function tempDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'group-shirt-regions-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

const front = Object.freeze({
  id: 'front-light-1',
  side: 'front',
  color: 'wh',
  centerX: 0.25,
  centerY: 0.5,
  width: 0.168,
  height: 0.24,
  rotation: 15,
});
const back = Object.freeze({
  id: 'back-dark-1',
  side: 'back',
  color: 'bl',
  centerX: 0.75,
  centerY: 0.5,
  width: 0.168,
  height: 0.24,
  rotation: -15,
});

// 0.168 × 1000 = 168px; 0.24 × 800 = 192px; 168:192 = 42:48.
const templateSize = Object.freeze({ width: 1000, height: 800 });

test('chuẩn hóa màu/mặt, alias center và mặc định áo sáng cho record cũ', () => {
  assert.deepEqual(validateGroupShirtRegion({ ...front, rotation: 375 }, templateSize), front);
  assert.deepEqual(
    validateGroupShirtRegion({
      id: 'alias-center',
      type: 'f',
      shirtColor: 'dark',
      cx: 0.5,
      cy: 0.5,
      width: 0.175,
      height: 0.2,
      angle: -370,
    }, { width: 500, height: 500 }),
    {
      id: 'alias-center',
      side: 'front',
      color: 'bl',
      centerX: 0.5,
      centerY: 0.5,
      width: 0.175,
      height: 0.2,
      rotation: -10,
    },
  );
  const legacy = validateGroupShirtRegion({
    id: 'legacy', side: 'b', x: 0.2, y: 0.3, width: 0.2, height: 0.4,
  });
  assert.equal(legacy.side, 'back');
  assert.equal(legacy.color, 'wh');
  assert.ok(Math.abs(legacy.centerX - 0.3) < 1e-12);
  assert.equal(legacy.centerY, 0.5);
});

test('vùng bắt buộc tỷ lệ pixel 42×48, nằm trọn sau xoay và không lặp id', () => {
  assert.throws(
    () => validateGroupShirtRegion({ ...front, width: 0.2 }, templateSize),
    (error) => error instanceof GroupShirtRegionError &&
      error.code === 'INVALID_GROUP_SHIRT_REGION_ASPECT_RATIO',
  );
  assert.throws(
    () => validateGroupShirtRegion({
      ...front, id: 'outside', centerX: 0.04, centerY: 0.04, rotation: 45,
    }, templateSize),
    (error) => error.code === 'ROTATED_GROUP_SHIRT_REGION_OUT_OF_BOUNDS',
  );
  assert.throws(
    () => validateGroupShirtRegions([front, { ...front, side: 'back' }], templateSize),
    (error) => error.code === 'DUPLICATE_GROUP_SHIRT_REGION_ID',
  );
});

test('store schema v2 giữ thứ tự, màu, dimensions và fingerprint', async (t) => {
  const userDataPath = await tempDirectory(t);
  const template = {
    name: '1 mgs.png', ...templateSize, fingerprint: 'AAA111',
  };
  const store = createGroupShirtRegionStore({ userDataPath });
  await store.save(template, [front, back]);
  assert.deepEqual(await store.get(template), [front, back]);

  const reloaded = createGroupShirtRegionStore({ userDataPath });
  assert.deepEqual(await reloaded.get(template), [front, back]);
  assert.equal(await reloaded.get({ ...template, width: 999 }), null);
  assert.equal(await reloaded.get({ ...template, fingerprint: 'different' }), null);
  assert.deepEqual(await reloaded.get({ name: template.name, ...templateSize }), [front, back]);

  const disk = JSON.parse(await fs.readFile(store.filePath, 'utf8'));
  assert.equal(disk.schemaVersion, GROUP_SHIRT_REGION_SCHEMA_VERSION);
  assert.equal(disk.schemaVersion, 2);
  assert.deepEqual(disk.templates['1 mgs.png'].regions, [front, back]);
});

test('sanitize di trú schema v1 thiếu màu thành áo sáng và bỏ riêng record sai tỷ lệ', () => {
  const legacyFront = { ...front };
  delete legacyFront.color;
  const raw = {
    schemaVersion: 1,
    templates: {
      good: {
        templateName: 'good mgs.png', templateWidth: 1000, templateHeight: 800,
        regions: [legacyFront],
      },
      bad: {
        templateName: 'bad mgs.png', templateWidth: 1000, templateHeight: 800,
        regions: [{ ...front, width: 0.2 }],
      },
    },
  };
  const sanitized = sanitizeGroupShirtRegionDocument(raw);
  assert.deepEqual(Object.keys(sanitized.templates), ['good mgs.png']);
  assert.equal(sanitized.schemaVersion, 2);
  assert.equal(sanitized.templates['good mgs.png'].regions[0].color, 'wh');
  assert.deepEqual(
    getGroupShirtRegionsFromDocument(sanitized, {
      name: 'GOOD MGS.PNG', ...templateSize,
    }),
    [{ ...front, color: 'wh' }],
  );
});

test('replaceAll ghi nối tiếp và không xóa template ngoài lần cập nhật', async (t) => {
  const userDataPath = await tempDirectory(t);
  const store = createGroupShirtRegionStore({ userDataPath });
  const first = { name: '1 mgs.png', ...templateSize };
  const second = { name: '2 mgs.png', ...templateSize };
  await Promise.all([
    store.save(first, [front]),
    store.save(second, [back]),
  ]);
  await store.replaceAll([{ template: first, regions: [{ ...front, rotation: 30 }] }]);
  assert.equal((await store.get(first))[0].rotation, 30);
  assert.deepEqual(await store.get(second), [back]);
});
