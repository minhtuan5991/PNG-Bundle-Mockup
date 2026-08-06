'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MAX_DROPPED_FILES = 2000;

class DroppedPngInputError extends Error {
  constructor(message, code = 'INVALID_DROPPED_FILES', filePath = null) {
    super(message);
    this.name = 'DroppedPngInputError';
    this.code = code;
    this.filePath = filePath;
  }
}

function normalizeDroppedPngPaths(filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new DroppedPngInputError('Không tìm thấy file PNG hợp lệ để thêm.', 'NO_DROPPED_FILES');
  }
  if (filePaths.length > MAX_DROPPED_FILES) {
    throw new DroppedPngInputError(
      `Chỉ có thể thêm tối đa ${MAX_DROPPED_FILES} file PNG mỗi lần.`,
      'TOO_MANY_DROPPED_FILES',
    );
  }

  const paths = [];
  const seen = new Set();
  let duplicateCount = 0;

  for (const candidate of filePaths) {
    if (typeof candidate !== 'string' || candidate.length === 0 || !path.isAbsolute(candidate)) {
      throw new DroppedPngInputError(
        'Đường dẫn file kéo thả không hợp lệ.',
        'INVALID_DROPPED_PATH',
      );
    }

    const resolvedPath = path.resolve(candidate);
    if (path.extname(resolvedPath).toLocaleLowerCase() !== '.png') {
      throw new DroppedPngInputError(
        `“${path.basename(resolvedPath)}” không phải file PNG.`,
        'NOT_PNG',
        resolvedPath,
      );
    }

    const key = resolvedPath.toLocaleLowerCase();
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    paths.push(resolvedPath);
  }

  return { paths, duplicateCount };
}

async function inspectDroppedPngFiles(filePaths, { inspectImage }) {
  if (typeof inspectImage !== 'function') {
    throw new TypeError('inspectImage phải là một hàm.');
  }

  const { paths, duplicateCount } = normalizeDroppedPngPaths(filePaths);
  const files = [];

  for (const filePath of paths) {
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      throw new DroppedPngInputError(
        `Không thể truy cập file “${path.basename(filePath)}”.`,
        'DROPPED_FILE_UNAVAILABLE',
        filePath,
      );
    }
    if (!stat.isFile()) {
      throw new DroppedPngInputError(
        `“${path.basename(filePath)}” không phải là file.`,
        'DROPPED_PATH_NOT_FILE',
        filePath,
      );
    }

    try {
      const metadata = await inspectImage(filePath);
      files.push({
        path: filePath,
        url: pathToFileURL(filePath).href,
        directory: path.dirname(filePath),
        name: path.basename(filePath),
        size: stat.size,
        width: metadata.width,
        height: metadata.height,
        hasAlpha: metadata.hasAlpha,
        error: null,
      });
    } catch (error) {
      files.push({
        path: filePath,
        url: pathToFileURL(filePath).href,
        directory: path.dirname(filePath),
        name: path.basename(filePath),
        size: stat.size,
        width: null,
        height: null,
        hasAlpha: null,
        error: error?.message || 'Không đọc được file PNG.',
      });
    }
  }

  const directories = [...new Set(files.map((file) => file.directory))];
  const firstUsableFile = files.find((file) => !file.error);
  return {
    folderPath: firstUsableFile?.directory || directories[0] || null,
    directories,
    files,
    duplicateCount,
  };
}

module.exports = {
  DroppedPngInputError,
  inspectDroppedPngFiles,
  normalizeDroppedPngPaths,
};
