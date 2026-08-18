'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
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
  id: 'front-1',
  side: 'front',
  centerX: 0.25,
  centerY: 0.5,
  width: 0.2,
  height: 0.3,
  rotation: 15,
});
const back = Object.freeze({
  id: 'back-1',
  side: 'back',
  centerX: 0.75,
  centerY: 0.5,
  width: 0.2,
  height: 0.3,
  rotation: -15,
});

test('chuẩn hóa center schema, alias cx/cy và alias top-left cũ', () => {
  assert.deepEqual(
    validateGroupShirtRegion({ ...front, rotation: 375 }, { width: 1000, height: 800 }),
    front,
  );
  assert.deepEqual(
    validateGroupShirtRegion({
      id: 'alias-center',
      type: 'f',
      cx: 0.5,
      cy: 0.5,
      width: 0.2,
      height: 0.4,
      angle: -370,
    }, { width: 500, height: 500 }),
    {
      id: 'alias-center',
      side: 'front',
      centerX: 0.5,
      centerY: 0.5,
      width: 0.2,
      height: 0.4,
      rotation: -10,
    },
  );
  const legacy = validateGroupShirtRegion({
    id: 'legacy', side: 'b', x: 0.2, y: 0.3, width: 0.2, height: 0.4,
  });
  assert.equal(legacy.id, 'legacy');
  assert.equal(legacy.side, 'back');
  assert.ok(Math.abs(legacy.centerX - 0.3) < 1e-12);
  assert.equal(legacy.centerY, 0.5);
  assert.equal(legacy.width, 0.2);
  assert.equal(legacy.height, 0.4);
  assert.equal(legacy.rotation, 0);
});

test('vùng xoay phải nằm trọn trong ảnh và id không được lặp', () => {
  assert.throws(
    () => validateGroupShirtRegion({
      id: 'outside', side: 'front', centerX: 0.08, centerY: 0.08,
      width: 0.2, height: 0.2, rotation: 45,
    }, { width: 1000, height: 1000 }),
    (error) => error instanceof GroupShirtRegionError &&
      error.code === 'ROTATED_GROUP_SHIRT_REGION_OUT_OF_BOUNDS',
  );
  assert.throws(
    () => validateGroupShirtRegions([front, { ...front, side: 'back' }], {
      width: 1000, height: 800,
    }),
    (error) => error.code === 'DUPLICATE_GROUP_SHIRT_REGION_ID',
  );
});

test('store giữ thứ tự nhiều vùng trước/sau, reload và kiểm tra dimensions/fingerprint', async (t) => {
  const userDataPath = await tempDirectory(t);
  const template = {
    name: '1mkg.wh.png', width: 1000, height: 800, fingerprint: 'AAA111',
  };
  const store = createGroupShirtRegionStore({ userDataPath });
  await store.save(template, [front, back]);
  assert.deepEqual(await store.get(template), [front, back]);

  const reloaded = createGroupShirtRegionStore({ userDataPath });
  assert.deepEqual(await reloaded.get(template), [front, back]);
  assert.equal(await reloaded.get({ ...template, width: 999 }), null);
  assert.equal(await reloaded.get({ ...template, fingerprint: 'different' }), null);
  assert.deepEqual(
    await reloaded.get({ name: template.name, width: 1000, height: 800 }),
    [front, back],
  );

  const legacyWithoutFingerprint = {
    name: 'legacy mkg.png', width: 1000, height: 800,
  };
  await reloaded.save(legacyWithoutFingerprint, [front]);
  assert.equal(
    await reloaded.get({ ...legacyWithoutFingerprint, fingerprint: 'new-content-hash' }),
    null,
  );

  const disk = JSON.parse(await fs.readFile(store.filePath, 'utf8'));
  assert.equal(disk.schemaVersion, 1);
  assert.deepEqual(disk.templates['1mkg.wh.png'].regions, [front, back]);
});

test('replaceAll ghi nối tiếp an toàn và không xóa template ngoài lần cập nhật', async (t) => {
  const userDataPath = await tempDirectory(t);
  const store = createGroupShirtRegionStore({ userDataPath });
  const first = { name: '1mkg.png', width: 1000, height: 800 };
  const second = { name: '2mkg.png', width: 1000, height: 800 };
  await Promise.all([
    store.save(first, [front]),
    store.save(second, [back]),
  ]);
  await store.replaceAll([{ template: first, regions: [{ ...front, rotation: 30 }] }]);
  assert.equal((await store.get(first))[0].rotation, 30);
  assert.deepEqual(await store.get(second), [back]);
});

test('sanitize bỏ riêng record hỏng nhưng giữ record hợp lệ', () => {
  const raw = {
    schemaVersion: 1,
    templates: {
      good: {
        templateName: 'good.png', templateWidth: 1000, templateHeight: 800,
        regions: [front],
      },
      bad: {
        templateName: 'bad.png', templateWidth: 1000, templateHeight: 800,
        regions: [{ ...front, centerX: 5 }],
      },
    },
  };
  const sanitized = sanitizeGroupShirtRegionDocument(raw);
  assert.deepEqual(Object.keys(sanitized.templates), ['good.png']);
  assert.deepEqual(
    getGroupShirtRegionsFromDocument(sanitized, {
      name: 'GOOD.PNG', width: 1000, height: 800,
    }),
    [front],
  );
  assert.deepEqual(getGroupShirtRegionsFromDocument(sanitized, 'good.png'), [front]);
});
