'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const CACHE_DIRECTORY_NAMES = Object.freeze([
  'Cache',
  'Code Cache',
  'GPUCache',
  'DawnCache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'GrShaderCache',
  'ShaderCache',
]);

const USER_DATA_WORK_DIRECTORY_NAMES = Object.freeze([
  'input-backup.staging',
  'input-backup.previous',
  'print-area-backup.staging',
  'print-area-backup.previous',
]);

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const OUTPUT_TEMP_PATTERNS = Object.freeze([
  new RegExp(`^\\.(?:bundle|single|group-shirt)-${UUID_PATTERN}-\\d{3}\\.tmp$`, 'i'),
  new RegExp(`^\\.pdf-download-\\d+-${UUID_PATTERN}\\.tmp$`, 'i'),
  new RegExp(
    `^\\.(?:bundle|single|group-shirt)-${UUID_PATTERN}-\\d{3}\\.tmp\\.${UUID_PATTERN}\\.metadata-clean$`,
    'i',
  ),
]);
const SOURCE_TEMP_PATTERNS = Object.freeze([
  new RegExp(`^\\..+\\.group-shirt-rename-[a-z0-9-]+-\\d+\\.tmp$`, 'i'),
]);
const STORAGE_TEMP_PATTERNS = Object.freeze([
  /^(?:path-preferences|single-mockup-regions|group-shirt-regions)\.json\.tmp-\d+-\d+$/i,
  new RegExp(`^\\.png-bundle-(?:input|print-area)-marker\\.tmp-\\d+-${UUID_PATTERN}$`, 'i'),
]);

class AppCleanupError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AppCleanupError';
    this.code = code;
    Object.assign(this, details);
  }
}

function normalizeSafeDirectory(directoryPath, optionName) {
  if (typeof directoryPath !== 'string' || directoryPath.trim().length === 0) return null;
  const resolvedPath = path.resolve(directoryPath);
  if (resolvedPath === path.parse(resolvedPath).root) {
    throw new AppCleanupError(
      `${optionName} không được là thư mục gốc.`,
      'UNSAFE_CLEANUP_DIRECTORY',
      { directoryPath: resolvedPath, optionName },
    );
  }
  return resolvedPath;
}

function uniqueDirectories(directoryPaths, optionName) {
  const seen = new Set();
  const directories = [];
  for (const directoryPath of directoryPaths || []) {
    const resolvedPath = normalizeSafeDirectory(directoryPath, optionName);
    if (!resolvedPath) continue;
    const key = process.platform === 'win32'
      ? resolvedPath.toLocaleLowerCase('en-US')
      : resolvedPath;
    if (seen.has(key)) continue;
    seen.add(key);
    directories.push(resolvedPath);
  }
  return directories;
}

async function entrySize(targetPath, fsImpl) {
  let stat;
  try {
    stat = await fsImpl.lstat(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  if (!stat.isDirectory()) return stat.isFile() ? stat.size : 0;
  let total = 0;
  const entries = await fsImpl.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    total += await entrySize(path.join(targetPath, entry.name), fsImpl);
  }
  return total;
}

async function removeEntry(targetPath, result, fsImpl) {
  try {
    const size = await entrySize(targetPath, fsImpl);
    if (size === null) return;
    await fsImpl.rm(targetPath, { recursive: true, force: true });
    result.removedEntries += 1;
    result.reclaimedBytes += size;
    result.removedPaths.push(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    result.warnings.push({
      path: targetPath,
      message: error?.message || String(error),
    });
  }
}

async function removeMatchingFiles(directoryPath, patterns, result, fsImpl) {
  if (!directoryPath) return;
  let entries;
  try {
    entries = await fsImpl.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    result.warnings.push({ path: directoryPath, message: error?.message || String(error) });
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !patterns.some((pattern) => pattern.test(entry.name))) continue;
    await removeEntry(path.join(directoryPath, entry.name), result, fsImpl);
  }
}

async function cleanupAppArtifacts(options = {}) {
  const fsImpl = options.fsImpl || fs;
  const userDataPath = normalizeSafeDirectory(options.userDataPath, 'userDataPath');
  const inputDirectory = normalizeSafeDirectory(options.inputDirectory, 'inputDirectory');
  const printAreaDirectory = normalizeSafeDirectory(
    options.printAreaDirectory,
    'printAreaDirectory',
  );
  if (!userDataPath) {
    throw new AppCleanupError('Thiếu thư mục dữ liệu ứng dụng.', 'MISSING_CLEANUP_USER_DATA');
  }

  const result = {
    removedEntries: 0,
    reclaimedBytes: 0,
    removedPaths: [],
    warnings: [],
  };

  for (const directoryName of [...CACHE_DIRECTORY_NAMES, ...USER_DATA_WORK_DIRECTORY_NAMES]) {
    await removeEntry(path.join(userDataPath, directoryName), result, fsImpl);
  }
  await removeMatchingFiles(userDataPath, STORAGE_TEMP_PATTERNS, result, fsImpl);
  await removeMatchingFiles(inputDirectory, STORAGE_TEMP_PATTERNS, result, fsImpl);
  await removeMatchingFiles(printAreaDirectory, STORAGE_TEMP_PATTERNS, result, fsImpl);

  for (const directoryPath of uniqueDirectories(options.sourceDirectories, 'sourceDirectory')) {
    await removeMatchingFiles(directoryPath, SOURCE_TEMP_PATTERNS, result, fsImpl);
  }
  for (const directoryPath of uniqueDirectories(options.outputDirectories, 'outputDirectory')) {
    await removeMatchingFiles(directoryPath, OUTPUT_TEMP_PATTERNS, result, fsImpl);
  }

  return result;
}

module.exports = {
  CACHE_DIRECTORY_NAMES,
  USER_DATA_WORK_DIRECTORY_NAMES,
  AppCleanupError,
  cleanupAppArtifacts,
};
