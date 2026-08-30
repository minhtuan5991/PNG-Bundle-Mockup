'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DEFAULT_REGION_FILE_NAME } = require('./single-mockup-regions');
const { DEFAULT_GROUP_SHIRT_REGION_FILE_NAME } = require('./group-shirt-regions');

const PRINT_AREA_DIRECTORY_NAME = 'Print Area';
const PRINT_AREA_MARKER_FILE_NAME = '.png-bundle-print-area-marker';
const PRINT_AREA_BACKUP_DIRECTORY_NAME = 'print-area-backup';
const PRINT_AREA_REGION_FILE_NAMES = Object.freeze([
  DEFAULT_REGION_FILE_NAME,
  DEFAULT_GROUP_SHIRT_REGION_FILE_NAME,
]);

class PrintAreaStorageError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PrintAreaStorageError';
    this.code = code;
    Object.assign(this, details);
  }
}

function normalizeDirectory(directoryPath, optionName) {
  if (typeof directoryPath !== 'string' || directoryPath.trim().length === 0) {
    throw new PrintAreaStorageError(`Thiếu ${optionName}.`, 'MISSING_PRINT_AREA_PATH', { optionName });
  }
  const resolvedPath = path.resolve(directoryPath);
  if (resolvedPath === path.parse(resolvedPath).root) {
    throw new PrintAreaStorageError(`${optionName} không được là thư mục gốc.`, 'UNSAFE_PRINT_AREA_PATH', {
      optionName,
      directoryPath: resolvedPath,
    });
  }
  return resolvedPath;
}

function pathContains(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === '' || (
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function validateSeparateDirectories(printAreaDirectory, backupDirectory) {
  if (pathContains(printAreaDirectory, backupDirectory) || pathContains(backupDirectory, printAreaDirectory)) {
    throw new PrintAreaStorageError(
      'Print Area và thư mục backup phải nằm tách biệt.',
      'OVERLAPPING_PRINT_AREA_BACKUP_PATHS',
      { printAreaDirectory, backupDirectory },
    );
  }
}

function resolvePrintAreaDirectory(options = {}) {
  const { isPackaged = false, appPath, executablePath } = options;
  const candidatePath = isPackaged ? executablePath : appPath;
  if (typeof candidatePath !== 'string' || candidatePath.trim().length === 0) {
    throw new TypeError('Không thể xác định thư mục cài đặt để tạo Print Area.');
  }
  const basePath = isPackaged
    ? path.dirname(path.resolve(candidatePath))
    : path.resolve(candidatePath);
  if (!basePath || basePath === path.parse(basePath).root) {
    throw new TypeError('Không thể xác định thư mục cài đặt để tạo Print Area.');
  }
  return path.join(basePath, PRINT_AREA_DIRECTORY_NAME);
}

async function ensurePrintAreaDirectory(printAreaDirectory, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const resolvedPath = normalizeDirectory(printAreaDirectory, 'printAreaDirectory');
  await fsImpl.mkdir(resolvedPath, { recursive: true });
  return resolvedPath;
}

async function pathType(targetPath, fsImpl) {
  try {
    const stat = await fsImpl.lstat(targetPath);
    if (stat.isFile()) return 'file';
    if (stat.isDirectory()) return 'directory';
    return 'unsupported';
  } catch (error) {
    if (error?.code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function readDirectoryState(directoryPath, fsImpl) {
  const type = await pathType(directoryPath, fsImpl);
  if (type === 'missing') return false;
  if (type !== 'directory') {
    throw new PrintAreaStorageError(`“${directoryPath}” không phải thư mục.`, 'PRINT_AREA_PATH_NOT_DIRECTORY', {
      directoryPath,
    });
  }
  return true;
}

async function readMarkerState(markerPath, fsImpl) {
  const type = await pathType(markerPath, fsImpl);
  if (type === 'missing') return false;
  if (type !== 'file') {
    throw new PrintAreaStorageError('Marker trong Print Area không phải file hợp lệ.', 'INVALID_PRINT_AREA_MARKER', {
      markerPath,
    });
  }
  return true;
}

async function managedFileNames(directoryPath, fsImpl) {
  const names = [];
  for (const fileName of PRINT_AREA_REGION_FILE_NAMES) {
    const filePath = path.join(directoryPath, fileName);
    const type = await pathType(filePath, fsImpl);
    if (type === 'missing') continue;
    if (type !== 'file') {
      throw new PrintAreaStorageError(`“${filePath}” phải là file JSON.`, 'INVALID_PRINT_AREA_REGION_FILE', {
        filePath,
      });
    }
    names.push(fileName);
  }
  return names;
}

async function copyFileSafely(sourcePath, targetPath, fsImpl) {
  await fsImpl.mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.tmp-${process.pid}-${randomUUID()}`,
  );
  try {
    await fsImpl.copyFile(sourcePath, temporaryPath);
    await fsImpl.rm(targetPath, { recursive: true, force: true });
    await fsImpl.rename(temporaryPath, targetPath);
  } finally {
    await fsImpl.rm(temporaryPath, { recursive: true, force: true }).catch(() => {});
  }
}

async function mirrorRegionFiles(sourceDirectory, targetDirectory, fsImpl) {
  await fsImpl.mkdir(sourceDirectory, { recursive: true });
  await fsImpl.mkdir(targetDirectory, { recursive: true });
  const sourceFiles = new Set(await managedFileNames(sourceDirectory, fsImpl));
  let copiedFiles = 0;
  let removedFiles = 0;
  for (const fileName of PRINT_AREA_REGION_FILE_NAMES) {
    const sourcePath = path.join(sourceDirectory, fileName);
    const targetPath = path.join(targetDirectory, fileName);
    if (sourceFiles.has(fileName)) {
      await copyFileSafely(sourcePath, targetPath, fsImpl);
      copiedFiles += 1;
    } else if (await pathType(targetPath, fsImpl) !== 'missing') {
      await fsImpl.rm(targetPath, { recursive: true, force: true });
      removedFiles += 1;
    }
  }
  return { copiedFiles, removedFiles };
}

function backupWorkPaths(backupDirectory) {
  return {
    stagingDirectory: `${backupDirectory}.staging`,
    previousDirectory: `${backupDirectory}.previous`,
  };
}

async function recoverBackupSnapshot(backupDirectory, fsImpl) {
  const { stagingDirectory, previousDirectory } = backupWorkPaths(backupDirectory);
  const [backupExists, previousExists] = await Promise.all([
    readDirectoryState(backupDirectory, fsImpl),
    readDirectoryState(previousDirectory, fsImpl),
  ]);
  if (!backupExists && previousExists) {
    await fsImpl.rename(previousDirectory, backupDirectory);
  } else if (backupExists && previousExists) {
    await fsImpl.rm(previousDirectory, { recursive: true, force: true });
  }
  await fsImpl.rm(stagingDirectory, { recursive: true, force: true });
}

async function replaceBackupSnapshot(sourceDirectory, backupDirectory, fsImpl) {
  const { stagingDirectory, previousDirectory } = backupWorkPaths(backupDirectory);
  await fsImpl.mkdir(path.dirname(backupDirectory), { recursive: true });
  await fsImpl.rm(stagingDirectory, { recursive: true, force: true });
  await fsImpl.mkdir(stagingDirectory, { recursive: true });
  let previousMoved = false;
  try {
    const details = await mirrorRegionFiles(sourceDirectory, stagingDirectory, fsImpl);
    if (await readDirectoryState(backupDirectory, fsImpl)) {
      await fsImpl.rm(previousDirectory, { recursive: true, force: true });
      await fsImpl.rename(backupDirectory, previousDirectory);
      previousMoved = true;
    }
    await fsImpl.rename(stagingDirectory, backupDirectory);
    await fsImpl.rm(previousDirectory, { recursive: true, force: true });
    return details;
  } catch (error) {
    const backupExists = await readDirectoryState(backupDirectory, fsImpl).catch(() => false);
    if (previousMoved && !backupExists) {
      await fsImpl.rename(previousDirectory, backupDirectory).catch(() => {});
    }
    throw error;
  } finally {
    await fsImpl.rm(stagingDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

async function writeMarker(markerPath, fsImpl) {
  const temporaryPath = `${markerPath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await fsImpl.writeFile(temporaryPath, 'PNG Bundle Mockup managed Print Area v1\n', {
      encoding: 'utf8',
      flag: 'wx',
    });
    await fsImpl.rename(temporaryPath, markerPath);
  } finally {
    await fsImpl.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

function createPrintAreaStorageService(options = {}) {
  const fsImpl = options.fsImpl || fs;
  const printAreaDirectory = normalizeDirectory(options.printAreaDirectory, 'printAreaDirectory');
  const userDataPath = normalizeDirectory(options.userDataPath, 'userDataPath');
  const backupDirectory = options.backupDirectory
    ? normalizeDirectory(options.backupDirectory, 'backupDirectory')
    : path.join(userDataPath, PRINT_AREA_BACKUP_DIRECTORY_NAME);
  validateSeparateDirectories(printAreaDirectory, backupDirectory);
  const markerPath = path.join(printAreaDirectory, PRINT_AREA_MARKER_FILE_NAME);
  let synchronizationQueue = Promise.resolve();

  async function synchronizeNow() {
    await fsImpl.mkdir(printAreaDirectory, { recursive: true });
    await recoverBackupSnapshot(backupDirectory, fsImpl);
    const [markerExists, backupExists, printAreaFiles, legacyFiles] = await Promise.all([
      readMarkerState(markerPath, fsImpl),
      readDirectoryState(backupDirectory, fsImpl),
      managedFileNames(printAreaDirectory, fsImpl),
      managedFileNames(userDataPath, fsImpl),
    ]);

    if (markerExists || printAreaFiles.length > 0) {
      const details = await replaceBackupSnapshot(printAreaDirectory, backupDirectory, fsImpl);
      if (!markerExists) await writeMarker(markerPath, fsImpl);
      return {
        action: markerExists ? 'mirrored' : 'imported',
        printAreaDirectory,
        backupDirectory,
        markerPath,
        ...details,
      };
    }

    if (backupExists) {
      const details = await mirrorRegionFiles(backupDirectory, printAreaDirectory, fsImpl);
      await writeMarker(markerPath, fsImpl);
      return { action: 'restored', printAreaDirectory, backupDirectory, markerPath, ...details };
    }

    if (legacyFiles.length > 0) {
      const migrated = await mirrorRegionFiles(userDataPath, printAreaDirectory, fsImpl);
      const backedUp = await replaceBackupSnapshot(printAreaDirectory, backupDirectory, fsImpl);
      await writeMarker(markerPath, fsImpl);
      return {
        action: 'migrated',
        printAreaDirectory,
        backupDirectory,
        markerPath,
        copiedFiles: migrated.copiedFiles,
        removedFiles: migrated.removedFiles + backedUp.removedFiles,
      };
    }

    const details = await replaceBackupSnapshot(printAreaDirectory, backupDirectory, fsImpl);
    await writeMarker(markerPath, fsImpl);
    return { action: 'initialized', printAreaDirectory, backupDirectory, markerPath, ...details };
  }

  function synchronize() {
    const operation = synchronizationQueue.catch(() => {}).then(synchronizeNow);
    synchronizationQueue = operation;
    return operation;
  }

  return Object.freeze({ printAreaDirectory, backupDirectory, markerPath, synchronize });
}

module.exports = {
  PRINT_AREA_DIRECTORY_NAME,
  PRINT_AREA_MARKER_FILE_NAME,
  PRINT_AREA_BACKUP_DIRECTORY_NAME,
  PRINT_AREA_REGION_FILE_NAMES,
  PrintAreaStorageError,
  resolvePrintAreaDirectory,
  ensurePrintAreaDirectory,
  createPrintAreaStorageService,
  mirrorRegionFiles,
};
