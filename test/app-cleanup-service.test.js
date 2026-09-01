'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  cleanupAppArtifacts,
} = require('../src/services/app-cleanup-service');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-cleanup-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const userDataPath = path.join(root, 'User Data');
  const inputDirectory = path.join(root, 'Input');
  const printAreaDirectory = path.join(root, 'Print Area');
  const sourceDirectory = path.join(root, 'Source');
  const outputDirectory = path.join(sourceDirectory, 'Done');
  await Promise.all([
    fs.mkdir(path.join(userDataPath, 'Cache'), { recursive: true }),
    fs.mkdir(path.join(userDataPath, 'input-backup.staging'), { recursive: true }),
    fs.mkdir(inputDirectory, { recursive: true }),
    fs.mkdir(printAreaDirectory, { recursive: true }),
    fs.mkdir(outputDirectory, { recursive: true }),
  ]);
  return { root, userDataPath, inputDirectory, printAreaDirectory, sourceDirectory, outputDirectory };
}

test('chỉ xóa cache và đúng mẫu file tạm do app tạo', async (t) => {
  const paths = await fixture(t);
  const uuid = '12345678-1234-1234-1234-123456789abc';
  const removable = [
    path.join(paths.userDataPath, 'Cache', 'cache.bin'),
    path.join(paths.userDataPath, 'input-backup.staging', 'partial.png'),
    path.join(paths.userDataPath, 'path-preferences.json.tmp-123-1'),
    path.join(paths.inputDirectory, `.png-bundle-input-marker.tmp-123-${uuid}`),
    path.join(paths.printAreaDirectory, 'single-mockup-regions.json.tmp-123-2'),
    path.join(paths.sourceDirectory, `.design.png.group-shirt-rename-${uuid}-1.tmp`),
    path.join(paths.outputDirectory, `.group-shirt-${uuid}-001.tmp`),
    path.join(paths.outputDirectory, `.pdf-download-123-${uuid}.tmp`),
  ];
  await Promise.all(removable.map((filePath) => fs.writeFile(filePath, 'garbage')));

  const protectedPaths = [
    path.join(paths.inputDirectory, 'shirt bundle.png'),
    path.join(paths.printAreaDirectory, 'single-mockup-regions.json'),
    path.join(paths.printAreaDirectory, 'group-shirt-regions.json'),
    path.join(paths.outputDirectory, 'group-shirt_001.png'),
    path.join(paths.outputDirectory, '.customer-file.tmp'),
    path.join(paths.userDataPath, 'path-preferences.json'),
  ];
  await Promise.all(protectedPaths.map((filePath) => fs.writeFile(filePath, 'keep')));

  const result = await cleanupAppArtifacts({
    userDataPath: paths.userDataPath,
    inputDirectory: paths.inputDirectory,
    printAreaDirectory: paths.printAreaDirectory,
    sourceDirectories: [paths.sourceDirectory],
    outputDirectories: [paths.outputDirectory],
  });

  assert.equal(result.removedEntries, 8);
  assert.ok(result.reclaimedBytes > 0);
  assert.deepEqual(result.warnings, []);
  for (const filePath of removable) {
    await assert.rejects(fs.access(filePath), (error) => error.code === 'ENOENT');
  }
  for (const filePath of protectedPaths) await fs.access(filePath);
});

test('từ chối dọn thư mục gốc và bỏ qua thư mục chưa tồn tại', async (t) => {
  const paths = await fixture(t);
  await assert.rejects(
    cleanupAppArtifacts({ userDataPath: path.parse(paths.root).root }),
    (error) => error.code === 'UNSAFE_CLEANUP_DIRECTORY',
  );
  const result = await cleanupAppArtifacts({
    userDataPath: paths.userDataPath,
    sourceDirectories: [path.join(paths.root, 'missing-source')],
  });
  assert.equal(result.warnings.length, 0);
});

test('main xác nhận trước khi dọn thủ công và chờ dọn xong trước khi đóng cửa sổ', () => {
  const main = require('node:fs').readFileSync(
    path.resolve(__dirname, '..', 'src', 'main.js'),
    'utf8',
  );
  assert.match(
    main,
    /ipcMain\.handle\('maintenance:cleanup'[\s\S]*?buttons:\s*\['Hủy',\s*'Xóa dữ liệu rác'\]/,
  );
  const closeStart = main.indexOf('function closeWindowAfterWork');
  const closeEnd = main.indexOf('\nfunction confirmDiscardEditorChanges', closeStart);
  const closeHandler = main.slice(closeStart, closeEnd);
  assert.ok(closeStart >= 0 && closeEnd > closeStart);
  assert.ok(
    closeHandler.indexOf('runAppCleanup(') < closeHandler.indexOf('windowsAllowedToClose.add('),
    'phải hoàn tất cleanup trước khi cho phép BrowserWindow đóng',
  );
});
