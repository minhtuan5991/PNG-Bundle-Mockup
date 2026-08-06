'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  SCHEMA_VERSION,
  PATH_KEYS,
  defaultPreferences,
  sanitizePreferences,
  validateRememberedPath,
  resolveDialogDefaultPath,
  createPathPreferencesStore,
} = require('../src/services/path-preferences');

async function makeWorkspace(t, prefix = 'png-bundle-paths-') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function createFixturePaths(t) {
  const root = await makeWorkspace(t);
  const userDataPath = path.join(root, 'User Data');
  const sourceFolder = path.join(root, 'Thiết kế PNG');
  const templateFile = path.join(root, 'Ảnh nền MẪU.JPEG');
  const watermarkFile = path.join(root, 'Watermark TRONG SUỐT.PNG');
  await fs.mkdir(sourceFolder, { recursive: true });
  await fs.writeFile(templateFile, 'template');
  await fs.writeFile(watermarkFile, 'watermark');
  return { root, userDataPath, sourceFolder, templateFile, watermarkFile };
}

test('store mới trả về schema mặc định khi chưa có file', async (t) => {
  const { userDataPath } = await createFixturePaths(t);
  const store = createPathPreferencesStore({ userDataPath });

  assert.deepEqual(await store.load(), defaultPreferences());
  assert.equal(await store.getDefaultPath(PATH_KEYS.SOURCE_FOLDER), undefined);
});

test('lưu và nạp lại đủ ba đường dẫn trong userData', async (t) => {
  const fixture = await createFixturePaths(t);
  const store = createPathPreferencesStore({ userDataPath: fixture.userDataPath });

  await store.remember(PATH_KEYS.SOURCE_FOLDER, fixture.sourceFolder);
  await store.remember(PATH_KEYS.TEMPLATE_FILE, fixture.templateFile);
  await store.remember(PATH_KEYS.WATERMARK_FILE, fixture.watermarkFile);

  const reopened = createPathPreferencesStore({ userDataPath: fixture.userDataPath });
  assert.deepEqual(await reopened.load(), {
    schemaVersion: SCHEMA_VERSION,
    sourceFolder: path.normalize(fixture.sourceFolder),
    templateFile: path.normalize(fixture.templateFile),
    watermarkFile: path.normalize(fixture.watermarkFile),
  });
  assert.equal(await reopened.getDefaultPath(PATH_KEYS.SOURCE_FOLDER), path.normalize(fixture.sourceFolder));
  assert.equal(await reopened.getDefaultPath(PATH_KEYS.TEMPLATE_FILE), path.normalize(fixture.templateFile));
  assert.equal(await reopened.getDefaultPath(PATH_KEYS.WATERMARK_FILE), path.normalize(fixture.watermarkFile));
});

test('JSON hỏng hoặc schema không hỗ trợ không làm app bị lỗi', async (t) => {
  const { userDataPath } = await createFixturePaths(t);
  await fs.mkdir(userDataPath, { recursive: true });
  const preferencesPath = path.join(userDataPath, 'path-preferences.json');
  const warnings = [];
  await fs.writeFile(preferencesPath, '{"schemaVersion":1,"sourceFolder":');

  const malformed = createPathPreferencesStore({
    userDataPath,
    onWarning: (error) => warnings.push(error),
  });
  assert.deepEqual(await malformed.load(), defaultPreferences());
  assert.equal(warnings.length, 1);

  await fs.writeFile(preferencesPath, JSON.stringify({ schemaVersion: 99, sourceFolder: userDataPath }));
  const futureSchema = createPathPreferencesStore({ userDataPath });
  assert.deepEqual(await futureSchema.load(), defaultPreferences());
});

test('sanitize chỉ giữ key, kiểu dữ liệu và phần mở rộng hợp lệ', () => {
  const absoluteRoot = path.resolve(path.sep, 'fixtures');
  assert.deepEqual(
    sanitizePreferences({
      schemaVersion: SCHEMA_VERSION,
      sourceFolder: 42,
      templateFile: path.join(absoluteRoot, 'template.exe'),
      watermarkFile: path.join(absoluteRoot, 'watermark.PNG'),
      arbitraryPath: path.join(absoluteRoot, 'secret.txt'),
    }),
    {
      schemaVersion: SCHEMA_VERSION,
      sourceFolder: null,
      templateFile: null,
      watermarkFile: path.normalize(path.join(absoluteRoot, 'watermark.PNG')),
    },
  );
});

test('validation phân biệt file, thư mục và extension không phân biệt hoa thường', async (t) => {
  const fixture = await createFixturePaths(t);

  assert.equal(
    await validateRememberedPath(PATH_KEYS.SOURCE_FOLDER, fixture.sourceFolder),
    path.normalize(fixture.sourceFolder),
  );
  assert.equal(await validateRememberedPath(PATH_KEYS.SOURCE_FOLDER, fixture.templateFile), null);
  assert.equal(
    await validateRememberedPath(PATH_KEYS.TEMPLATE_FILE, fixture.templateFile),
    path.normalize(fixture.templateFile),
  );
  assert.equal(
    await validateRememberedPath(PATH_KEYS.WATERMARK_FILE, fixture.watermarkFile),
    path.normalize(fixture.watermarkFile),
  );
  assert.equal(await validateRememberedPath(PATH_KEYS.TEMPLATE_FILE, fixture.sourceFolder), null);

  const fakeWatermark = path.join(fixture.root, 'watermark.jpg');
  await fs.writeFile(fakeWatermark, 'not a png');
  assert.equal(await validateRememberedPath(PATH_KEYS.WATERMARK_FILE, fakeWatermark), null);
});

test('asset đã bị xóa sẽ fallback về thư mục cha còn tồn tại', async (t) => {
  const fixture = await createFixturePaths(t);
  const preferences = {
    schemaVersion: SCHEMA_VERSION,
    sourceFolder: fixture.sourceFolder,
    templateFile: fixture.templateFile,
    watermarkFile: fixture.watermarkFile,
  };
  await fs.rm(fixture.sourceFolder, { recursive: true });
  await fs.rm(fixture.templateFile);
  await fs.rm(fixture.watermarkFile);

  assert.equal(
    await resolveDialogDefaultPath(PATH_KEYS.SOURCE_FOLDER, preferences),
    path.normalize(fixture.root),
  );
  assert.equal(
    await resolveDialogDefaultPath(PATH_KEYS.TEMPLATE_FILE, preferences),
    path.normalize(fixture.root),
  );
  assert.equal(
    await resolveDialogDefaultPath(PATH_KEYS.WATERMARK_FILE, preferences),
    path.normalize(fixture.root),
  );
});

test('đường dẫn không hợp lệ không ghi đè lựa chọn tốt trước đó', async (t) => {
  const fixture = await createFixturePaths(t);
  const store = createPathPreferencesStore({ userDataPath: fixture.userDataPath });
  await store.remember(PATH_KEYS.WATERMARK_FILE, fixture.watermarkFile);

  const invalidFile = path.join(fixture.root, 'watermark.jpg');
  await fs.writeFile(invalidFile, 'not a png');
  await assert.rejects(
    () => store.remember(PATH_KEYS.WATERMARK_FILE, invalidFile),
    (error) => error.code === 'INVALID_PATH_PREFERENCE' && error.key === PATH_KEYS.WATERMARK_FILE,
  );
  assert.equal((await store.load()).watermarkFile, path.normalize(fixture.watermarkFile));
});

test('các lần ghi đồng thời tạo JSON hoàn chỉnh và không để lại file tạm', async (t) => {
  const fixture = await createFixturePaths(t);
  const store = createPathPreferencesStore({ userDataPath: fixture.userDataPath });

  await Promise.all([
    store.remember(PATH_KEYS.SOURCE_FOLDER, fixture.sourceFolder),
    store.remember(PATH_KEYS.TEMPLATE_FILE, fixture.templateFile),
    store.remember(PATH_KEYS.WATERMARK_FILE, fixture.watermarkFile),
  ]);

  const diskValue = JSON.parse(await fs.readFile(store.filePath, 'utf8'));
  assert.deepEqual(diskValue, await store.load());
  const entries = await fs.readdir(fixture.userDataPath);
  assert.deepEqual(entries, ['path-preferences.json']);
});

test('từ chối key lạ, đường dẫn tương đối và fileName chứa đường dẫn', async (t) => {
  const fixture = await createFixturePaths(t);
  const store = createPathPreferencesStore({ userDataPath: fixture.userDataPath });

  await assert.rejects(
    () => store.remember('unknown', fixture.sourceFolder),
    (error) => error.code === 'UNKNOWN_PATH_PREFERENCE',
  );
  await assert.rejects(
    () => store.remember(PATH_KEYS.SOURCE_FOLDER, 'relative-folder'),
    (error) => error.code === 'INVALID_PATH_PREFERENCE',
  );
  assert.throws(
    () => createPathPreferencesStore({ userDataPath: fixture.userDataPath, fileName: '../outside.json' }),
    /fileName/,
  );
});
