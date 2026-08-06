'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  INPUT_MARKER_FILE_NAME,
  createInputBackupService,
} = require('../src/services/input-backup-service');

async function createFixture(t, prefix = 'png-bundle-input-backup-') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const inputDirectory = path.join(root, 'Installed App', 'Input');
  const userDataPath = path.join(root, 'UserData');
  await fs.mkdir(inputDirectory, { recursive: true });
  return {
    root,
    inputDirectory,
    userDataPath,
    service: createInputBackupService({ inputDirectory, userDataPath }),
  };
}

async function listRelativeFiles(directoryPath) {
  const files = [];
  async function visit(relativeDirectory = '') {
    const currentDirectory = relativeDirectory
      ? path.join(directoryPath, relativeDirectory)
      : directoryPath;
    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? path.join(relativeDirectory, entry.name)
        : entry.name;
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile()) files.push(relativePath);
    }
  }
  await visit();
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

test('lần chạy đầu tạo marker và snapshot Input dưới userData', async (t) => {
  const fixture = await createFixture(t);
  await fs.mkdir(path.join(fixture.inputDirectory, 'shirts'));
  await Promise.all([
    fs.writeFile(path.join(fixture.inputDirectory, 'README.txt'), 'bundled instructions'),
    fs.writeFile(path.join(fixture.inputDirectory, 'download.pdf'), 'bundled pdf'),
    fs.writeFile(path.join(fixture.inputDirectory, 'shirts', 'front.png'), 'shirt template'),
  ]);

  const result = await fixture.service.synchronize();

  assert.equal(result.action, 'initialized');
  assert.equal(await fs.readFile(fixture.service.markerPath, 'utf8'), 'PNG Bundle Mockup managed Input v1\n');
  assert.deepEqual(await listRelativeFiles(fixture.service.backupDirectory), [
    'download.pdf',
    path.join('shirts', 'front.png'),
  ]);
  assert.equal(
    await fs.readFile(path.join(fixture.service.backupDirectory, 'download.pdf'), 'utf8'),
    'bundled pdf',
  );
});

test('marker còn thì mirror cả sửa và xóa có chủ ý sang backup', async (t) => {
  const fixture = await createFixture(t);
  await Promise.all([
    fs.writeFile(path.join(fixture.inputDirectory, 'README.txt'), 'instructions'),
    fs.writeFile(path.join(fixture.inputDirectory, 'download.pdf'), 'old pdf'),
    fs.writeFile(path.join(fixture.inputDirectory, 'shirt.png'), 'old shirt'),
  ]);
  await fixture.service.synchronize();

  await Promise.all([
    fs.rm(path.join(fixture.inputDirectory, 'download.pdf')),
    fs.writeFile(path.join(fixture.inputDirectory, 'shirt.png'), 'edited shirt'),
    fs.writeFile(path.join(fixture.inputDirectory, 'cup.jpg'), 'new cup'),
    fs.writeFile(path.join(fixture.service.backupDirectory, 'README.txt'), 'must be excluded'),
    fs.writeFile(
      path.join(fixture.service.backupDirectory, INPUT_MARKER_FILE_NAME),
      'must be excluded',
    ),
  ]);

  const result = await fixture.service.synchronize();

  assert.equal(result.action, 'mirrored');
  assert.deepEqual(await listRelativeFiles(fixture.service.backupDirectory), [
    'cup.jpg',
    'shirt.png',
  ]);
  assert.equal(
    await fs.readFile(path.join(fixture.service.backupDirectory, 'shirt.png'), 'utf8'),
    'edited shirt',
  );
});

test('marker mất sau update hoặc cài lại thì backup thay thế bundled defaults', async (t) => {
  const fixture = await createFixture(t);
  await Promise.all([
    fs.writeFile(path.join(fixture.inputDirectory, 'README.txt'), 'old instructions'),
    fs.writeFile(path.join(fixture.inputDirectory, 'download.pdf'), 'old bundled pdf'),
    fs.writeFile(path.join(fixture.inputDirectory, 'shirt.png'), 'user shirt'),
  ]);
  await fixture.service.synchronize();
  await fs.rm(path.join(fixture.inputDirectory, 'download.pdf'));
  await fs.writeFile(path.join(fixture.inputDirectory, 'shirt.png'), 'edited user shirt');
  await fixture.service.synchronize();

  await fs.rm(fixture.inputDirectory, { recursive: true, force: true });
  await fs.mkdir(fixture.inputDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(fixture.inputDirectory, 'README.txt'), 'new installer instructions'),
    fs.writeFile(path.join(fixture.inputDirectory, 'download.pdf'), 'recreated bundled pdf'),
    fs.writeFile(path.join(fixture.inputDirectory, 'installer-only.png'), 'new bundled default'),
  ]);

  const result = await fixture.service.synchronize();

  assert.equal(result.action, 'restored');
  assert.deepEqual(await listRelativeFiles(fixture.inputDirectory), [
    INPUT_MARKER_FILE_NAME,
    'README.txt',
    'shirt.png',
  ].sort((left, right) => left.localeCompare(right, 'en')));
  assert.equal(
    await fs.readFile(path.join(fixture.inputDirectory, 'README.txt'), 'utf8'),
    'new installer instructions',
  );
  assert.equal(
    await fs.readFile(path.join(fixture.inputDirectory, 'shirt.png'), 'utf8'),
    'edited user shirt',
  );
});

test('backup rỗng vẫn khôi phục đúng trạng thái người dùng đã xóa hết tài sản', async (t) => {
  const fixture = await createFixture(t);
  const bundledPdf = path.join(fixture.inputDirectory, 'download.pdf');
  await fs.writeFile(bundledPdf, 'bundled pdf');
  await fixture.service.synchronize();
  await fs.rm(bundledPdf);
  await fixture.service.synchronize();
  assert.deepEqual(await listRelativeFiles(fixture.service.backupDirectory), []);

  await fs.rm(fixture.service.markerPath);
  await fs.writeFile(bundledPdf, 'installer recreated pdf');
  const result = await fixture.service.synchronize();

  assert.equal(result.action, 'restored');
  assert.equal(await fs.stat(bundledPdf).then(() => true, () => false), false);
  assert.equal(await fs.stat(fixture.service.markerPath).then((stat) => stat.isFile()), true);
});

test('backup lần đầu lỗi không tạo marker hoặc biến snapshot dở dang thành nguồn restore', async (t) => {
  const fixture = await createFixture(t);
  const userAssetPath = path.join(fixture.inputDirectory, 'user-shirt.png');
  await fs.writeFile(userAssetPath, 'irreplaceable user asset');
  const failingFs = Object.create(fs);
  failingFs.copyFile = async () => {
    const error = new Error('simulated backup failure');
    error.code = 'EIO';
    throw error;
  };
  const failingService = createInputBackupService({
    inputDirectory: fixture.inputDirectory,
    userDataPath: fixture.userDataPath,
    fsImpl: failingFs,
  });

  await assert.rejects(() => failingService.synchronize(), { code: 'EIO' });
  assert.equal(await fs.stat(failingService.markerPath).then(() => true, () => false), false);
  assert.equal(await fs.stat(failingService.backupDirectory).then(() => true, () => false), false);
  assert.equal(await fs.readFile(userAssetPath, 'utf8'), 'irreplaceable user asset');

  const retryService = createInputBackupService({
    inputDirectory: fixture.inputDirectory,
    userDataPath: fixture.userDataPath,
  });
  const retry = await retryService.synchronize();
  assert.equal(retry.action, 'initialized');
  assert.equal(
    await fs.readFile(path.join(retryService.backupDirectory, 'user-shirt.png'), 'utf8'),
    'irreplaceable user asset',
  );
});

test('phục hồi snapshot cũ nếu app dừng giữa lúc hoán đổi backup', async (t) => {
  const fixture = await createFixture(t);
  const assetPath = path.join(fixture.inputDirectory, 'shirt.png');
  await fs.writeFile(assetPath, 'old shirt');
  await fixture.service.synchronize();
  await fs.writeFile(assetPath, 'new shirt');

  const previousDirectory = `${fixture.service.backupDirectory}.previous`;
  const stagingDirectory = `${fixture.service.backupDirectory}.staging`;
  await fs.rename(fixture.service.backupDirectory, previousDirectory);
  await fs.mkdir(stagingDirectory);
  await fs.writeFile(path.join(stagingDirectory, 'partial.png'), 'partial snapshot');

  const result = await fixture.service.synchronize();

  assert.equal(result.action, 'mirrored');
  assert.equal(
    await fs.readFile(path.join(fixture.service.backupDirectory, 'shirt.png'), 'utf8'),
    'new shirt',
  );
  assert.equal(await fs.stat(previousDirectory).then(() => true, () => false), false);
  assert.equal(await fs.stat(stagingDirectory).then(() => true, () => false), false);
});

test('từ chối đặt backup lồng bên trong Input', async (t) => {
  const fixture = await createFixture(t);
  assert.throws(
    () => createInputBackupService({
      inputDirectory: fixture.inputDirectory,
      userDataPath: path.join(fixture.inputDirectory, 'UserData'),
    }),
    (error) => error.code === 'OVERLAPPING_INPUT_BACKUP_PATHS',
  );
});
