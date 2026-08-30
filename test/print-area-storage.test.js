'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  PRINT_AREA_MARKER_FILE_NAME,
  PRINT_AREA_REGION_FILE_NAMES,
  resolvePrintAreaDirectory,
  ensurePrintAreaDirectory,
  createPrintAreaStorageService,
} = require('../src/services/print-area-storage');
const { createSingleMockupRegionStore } = require('../src/services/single-mockup-regions');
const { createGroupShirtRegionStore } = require('../src/services/group-shirt-regions');

async function createFixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-print-area-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const printAreaDirectory = path.join(root, 'Installed App', 'Print Area');
  const userDataPath = path.join(root, 'User Data');
  await Promise.all([
    fs.mkdir(printAreaDirectory, { recursive: true }),
    fs.mkdir(userDataPath, { recursive: true }),
  ]);
  return {
    root,
    printAreaDirectory,
    userDataPath,
    service: createPrintAreaStorageService({ printAreaDirectory, userDataPath }),
  };
}

async function exists(targetPath) {
  return fs.stat(targetPath).then(() => true, () => false);
}

test('phân giải Print Area tại project root hoặc cạnh EXE và tự tạo thư mục', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'print-area-directory-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const executablePath = path.join(root, 'Installed', 'PNG Bundle Mockup.exe');
  assert.equal(resolvePrintAreaDirectory({ appPath: root }), path.join(root, 'Print Area'));
  assert.equal(
    resolvePrintAreaDirectory({ isPackaged: true, executablePath }),
    path.join(root, 'Installed', 'Print Area'),
  );
  const target = path.join(root, 'New App', 'Print Area');
  assert.equal(await ensurePrintAreaDirectory(target), path.resolve(target));
  assert.equal((await fs.stat(target)).isDirectory(), true);
});

test('di chuyển hai JSON cũ từ userData sang Print Area ở lần chạy đầu', async (t) => {
  const fixture = await createFixture(t);
  for (const [index, fileName] of PRINT_AREA_REGION_FILE_NAMES.entries()) {
    await fs.writeFile(path.join(fixture.userDataPath, fileName), `legacy-${index}`);
  }
  const result = await fixture.service.synchronize();
  assert.equal(result.action, 'migrated');
  assert.equal(await exists(fixture.service.markerPath), true);
  for (const [index, fileName] of PRINT_AREA_REGION_FILE_NAMES.entries()) {
    assert.equal(await fs.readFile(path.join(fixture.printAreaDirectory, fileName), 'utf8'), `legacy-${index}`);
    assert.equal(await fs.readFile(path.join(fixture.service.backupDirectory, fileName), 'utf8'), `legacy-${index}`);
  }
});

test('JSON người dùng copy vào Print Area được ưu tiên và mirror để bảo vệ update', async (t) => {
  const fixture = await createFixture(t);
  const [singleFile, groupFile] = PRINT_AREA_REGION_FILE_NAMES;
  await Promise.all([
    fs.writeFile(path.join(fixture.printAreaDirectory, singleFile), 'copied-from-other-machine'),
    fs.writeFile(path.join(fixture.userDataPath, singleFile), 'stale-legacy'),
    fs.writeFile(path.join(fixture.userDataPath, groupFile), 'stale-group'),
  ]);
  const result = await fixture.service.synchronize();
  assert.equal(result.action, 'imported');
  assert.equal(
    await fs.readFile(path.join(fixture.service.backupDirectory, singleFile), 'utf8'),
    'copied-from-other-machine',
  );
  assert.equal(await exists(path.join(fixture.service.backupDirectory, groupFile)), false);
});

test('sau update mất Print Area runtime thì tự khôi phục snapshot JSON', async (t) => {
  const fixture = await createFixture(t);
  const [singleFile, groupFile] = PRINT_AREA_REGION_FILE_NAMES;
  await Promise.all([
    fs.writeFile(path.join(fixture.printAreaDirectory, 'README.txt'), 'old readme'),
    fs.writeFile(path.join(fixture.printAreaDirectory, singleFile), 'single-v1'),
    fs.writeFile(path.join(fixture.printAreaDirectory, groupFile), 'group-v1'),
  ]);
  await fixture.service.synchronize();
  await fs.rm(fixture.printAreaDirectory, { recursive: true, force: true });
  await fs.mkdir(fixture.printAreaDirectory, { recursive: true });
  await fs.writeFile(path.join(fixture.printAreaDirectory, 'README.txt'), 'new installer readme');
  const result = await fixture.service.synchronize();
  assert.equal(result.action, 'restored');
  assert.equal(await fs.readFile(path.join(fixture.printAreaDirectory, singleFile), 'utf8'), 'single-v1');
  assert.equal(await fs.readFile(path.join(fixture.printAreaDirectory, groupFile), 'utf8'), 'group-v1');
  assert.equal(await fs.readFile(path.join(fixture.printAreaDirectory, 'README.txt'), 'utf8'), 'new installer readme');
});

test('marker còn thì sửa và xóa JSON có chủ ý được mirror vào snapshot', async (t) => {
  const fixture = await createFixture(t);
  const [singleFile, groupFile] = PRINT_AREA_REGION_FILE_NAMES;
  await Promise.all([
    fs.writeFile(path.join(fixture.printAreaDirectory, singleFile), 'single-v1'),
    fs.writeFile(path.join(fixture.printAreaDirectory, groupFile), 'group-v1'),
  ]);
  await fixture.service.synchronize();
  await Promise.all([
    fs.writeFile(path.join(fixture.printAreaDirectory, singleFile), 'single-v2'),
    fs.rm(path.join(fixture.printAreaDirectory, groupFile)),
  ]);
  const result = await fixture.service.synchronize();
  assert.equal(result.action, 'mirrored');
  assert.equal(await fs.readFile(path.join(fixture.service.backupDirectory, singleFile), 'utf8'), 'single-v2');
  assert.equal(await exists(path.join(fixture.service.backupDirectory, groupFile)), false);
  assert.equal(
    await fs.readFile(path.join(fixture.printAreaDirectory, PRINT_AREA_MARKER_FILE_NAME), 'utf8'),
    'PNG Bundle Mockup managed Print Area v1\n',
  );
});

test('từ chối backup lồng trong Print Area', async (t) => {
  const fixture = await createFixture(t);
  assert.throws(
    () => createPrintAreaStorageService({
      printAreaDirectory: fixture.printAreaDirectory,
      userDataPath: fixture.userDataPath,
      backupDirectory: path.join(fixture.printAreaDirectory, 'backup'),
    }),
    (error) => error.code === 'OVERLAPPING_PRINT_AREA_BACKUP_PATHS',
  );
});

test('hai region store dùng đúng file JSON trong storageDirectory', async (t) => {
  const fixture = await createFixture(t);
  const singleStore = createSingleMockupRegionStore({ storageDirectory: fixture.printAreaDirectory });
  const groupStore = createGroupShirtRegionStore({ storageDirectory: fixture.printAreaDirectory });
  assert.equal(singleStore.filePath, path.join(fixture.printAreaDirectory, PRINT_AREA_REGION_FILE_NAMES[0]));
  assert.equal(groupStore.filePath, path.join(fixture.printAreaDirectory, PRINT_AREA_REGION_FILE_NAMES[1]));
});
