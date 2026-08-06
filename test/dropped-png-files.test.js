'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  inspectDroppedPngFiles,
  normalizeDroppedPngPaths,
} = require('../src/services/dropped-png-files');

async function withTempDirectory(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-drop-'));
  try {
    return await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('kiểm tra và đọc PNG kéo từ nhiều thư mục', async () => {
  await withTempDirectory(async (directory) => {
    const firstDirectory = path.join(directory, 'one');
    const secondDirectory = path.join(directory, 'two');
    await Promise.all([
      fs.mkdir(firstDirectory),
      fs.mkdir(secondDirectory),
    ]);
    const firstPath = path.join(firstDirectory, 'a.png');
    const secondPath = path.join(secondDirectory, 'b.PNG');
    await Promise.all([
      fs.writeFile(firstPath, 'first'),
      fs.writeFile(secondPath, 'second'),
    ]);

    const result = await inspectDroppedPngFiles(
      [firstPath, secondPath, firstPath.toUpperCase()],
      {
        inspectImage: async () => ({ width: 1200, height: 1000, hasAlpha: true }),
      },
    );

    assert.equal(result.files.length, 2);
    assert.equal(result.directories.length, 2);
    assert.equal(result.duplicateCount, 1);
    assert.equal(result.folderPath, firstDirectory);
    assert.deepEqual(
      result.files.map((file) => [file.name, file.width, file.height, file.hasAlpha, file.error]),
      [
        ['a.png', 1200, 1000, true, null],
        ['b.PNG', 1200, 1000, true, null],
      ],
    );
  });
});

test('giữ file PNG hỏng trong gallery với trạng thái lỗi', async () => {
  await withTempDirectory(async (directory) => {
    const filePath = path.join(directory, 'broken.png');
    await fs.writeFile(filePath, 'not-an-image');

    const result = await inspectDroppedPngFiles([filePath], {
      inspectImage: async () => {
        throw new Error('Ảnh PNG không hợp lệ');
      },
    });

    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].error, 'Ảnh PNG không hợp lệ');
    assert.equal(result.files[0].width, null);
  });
});

test('dùng thư mục của PNG hợp lệ đầu tiên làm nơi tạo Done', async () => {
  await withTempDirectory(async (directory) => {
    const brokenDirectory = path.join(directory, 'broken');
    const validDirectory = path.join(directory, 'valid');
    await Promise.all([fs.mkdir(brokenDirectory), fs.mkdir(validDirectory)]);
    const brokenPath = path.join(brokenDirectory, 'a.png');
    const validPath = path.join(validDirectory, 'b.png');
    await Promise.all([fs.writeFile(brokenPath, 'broken'), fs.writeFile(validPath, 'valid')]);

    const result = await inspectDroppedPngFiles([brokenPath, validPath], {
      inspectImage: async (filePath) => {
        if (filePath === brokenPath) throw new Error('Ảnh PNG không hợp lệ');
        return { width: 800, height: 900, hasAlpha: true };
      },
    });

    assert.equal(result.files[0].error, 'Ảnh PNG không hợp lệ');
    assert.equal(result.files[1].error, null);
    assert.equal(result.folderPath, validDirectory);
  });
});

test('từ chối đường dẫn tương đối và file không phải PNG', () => {
  assert.throws(
    () => normalizeDroppedPngPaths(['relative.png']),
    { code: 'INVALID_DROPPED_PATH' },
  );
  assert.throws(
    () => normalizeDroppedPngPaths([path.join(os.tmpdir(), 'image.jpg')]),
    { code: 'NOT_PNG' },
  );
});

test('từ chối thư mục có tên kết thúc bằng .png', async () => {
  await withTempDirectory(async (directory) => {
    const fakeFilePath = path.join(directory, 'folder.png');
    await fs.mkdir(fakeFilePath);
    await assert.rejects(
      inspectDroppedPngFiles([fakeFilePath], {
        inspectImage: async () => ({ width: 1, height: 1, hasAlpha: true }),
      }),
      { code: 'DROPPED_PATH_NOT_FILE' },
    );
  });
});
