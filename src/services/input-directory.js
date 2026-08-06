'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function resolveInputDirectory(options = {}) {
  const { isPackaged = false, appPath, executablePath } = options;
  const candidatePath = isPackaged ? executablePath : appPath;
  if (typeof candidatePath !== 'string' || candidatePath.trim().length === 0) {
    throw new TypeError('Không thể xác định thư mục cài đặt để tạo Input.');
  }
  const basePath = isPackaged
    ? path.dirname(path.resolve(candidatePath))
    : path.resolve(candidatePath);

  if (!basePath || basePath === path.parse(basePath).root) {
    throw new TypeError('Không thể xác định thư mục cài đặt để tạo Input.');
  }
  return path.join(basePath, 'Input');
}

async function ensureInputDirectory(inputDirectory, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const resolvedPath = path.resolve(String(inputDirectory || ''));
  if (resolvedPath === path.parse(resolvedPath).root) {
    throw new TypeError('Đường dẫn Input không hợp lệ.');
  }
  await fsImpl.mkdir(resolvedPath, { recursive: true });
  return resolvedPath;
}

module.exports = {
  resolveInputDirectory,
  ensureInputDirectory,
};
