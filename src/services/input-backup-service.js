'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const INPUT_MARKER_FILE_NAME = '.png-bundle-input-marker';
const INPUT_BACKUP_DIRECTORY_NAME = 'input-backup';
const EXCLUDED_INPUT_FILE_NAMES = new Set([
  INPUT_MARKER_FILE_NAME.toLocaleLowerCase('en-US'),
  'readme.txt',
]);

class InputBackupError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'InputBackupError';
    this.code = code;
    Object.assign(this, details);
  }
}

function normalizeDirectory(directoryPath, optionName) {
  if (typeof directoryPath !== 'string' || directoryPath.trim().length === 0) {
    throw new InputBackupError(`Thiếu ${optionName}.`, 'MISSING_INPUT_BACKUP_PATH', {
      optionName,
    });
  }
  const resolvedPath = path.resolve(directoryPath);
  if (resolvedPath === path.parse(resolvedPath).root) {
    throw new InputBackupError(
      `${optionName} không được là thư mục gốc.`,
      'UNSAFE_INPUT_BACKUP_PATH',
      { optionName, directoryPath: resolvedPath },
    );
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

function validateSeparateDirectories(inputDirectory, backupDirectory) {
  if (
    pathContains(inputDirectory, backupDirectory) ||
    pathContains(backupDirectory, inputDirectory)
  ) {
    throw new InputBackupError(
      'Input và thư mục backup phải nằm tách biệt.',
      'OVERLAPPING_INPUT_BACKUP_PATHS',
      { inputDirectory, backupDirectory },
    );
  }
}

function isExcludedRootEntry(relativePath) {
  if (relativePath.includes(path.sep)) return false;
  const normalizedName = relativePath.toLocaleLowerCase('en-US');
  return EXCLUDED_INPUT_FILE_NAMES.has(normalizedName) ||
    normalizedName.startsWith(`${INPUT_MARKER_FILE_NAME.toLocaleLowerCase('en-US')}.tmp-`);
}

async function readDirectoryState(directoryPath, fsImpl) {
  try {
    const stat = await fsImpl.stat(directoryPath);
    if (!stat.isDirectory()) {
      throw new InputBackupError(
        `“${directoryPath}” không phải thư mục.`,
        'INPUT_BACKUP_PATH_NOT_DIRECTORY',
        { directoryPath },
      );
    }
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function readMarkerState(markerPath, fsImpl) {
  try {
    const stat = await fsImpl.lstat(markerPath);
    if (!stat.isFile()) {
      throw new InputBackupError(
        'Marker trong Input không phải file hợp lệ.',
        'INVALID_INPUT_MARKER',
        { markerPath },
      );
    }
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function removeExcludedBackupEntries(backupDirectory, fsImpl) {
  if (!await readDirectoryState(backupDirectory, fsImpl)) return;
  const entries = await fsImpl.readdir(backupDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!isExcludedRootEntry(entry.name)) continue;
    await fsImpl.rm(path.join(backupDirectory, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function collectManagedEntries(rootDirectory, fsImpl) {
  const entries = new Map();

  async function visit(relativeDirectory = '') {
    const directoryPath = relativeDirectory
      ? path.join(rootDirectory, relativeDirectory)
      : rootDirectory;
    const children = await fsImpl.readdir(directoryPath, { withFileTypes: true });
    for (const child of children) {
      const relativePath = relativeDirectory
        ? path.join(relativeDirectory, child.name)
        : child.name;
      if (isExcludedRootEntry(relativePath)) continue;
      if (child.isDirectory()) {
        entries.set(relativePath, { type: 'directory' });
        await visit(relativePath);
      } else if (child.isFile()) {
        entries.set(relativePath, { type: 'file' });
      } else {
        entries.set(relativePath, { type: 'unsupported' });
      }
    }
  }

  await visit();
  return entries;
}

function pathDepth(relativePath) {
  return relativePath.split(path.sep).length;
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

async function mirrorManagedEntries(sourceDirectory, targetDirectory, fsImpl) {
  await fsImpl.mkdir(sourceDirectory, { recursive: true });
  await fsImpl.mkdir(targetDirectory, { recursive: true });
  const [sourceEntries, targetEntries] = await Promise.all([
    collectManagedEntries(sourceDirectory, fsImpl),
    collectManagedEntries(targetDirectory, fsImpl),
  ]);

  const removableEntries = [...targetEntries.entries()]
    .filter(([relativePath, targetEntry]) => {
      const sourceEntry = sourceEntries.get(relativePath);
      return !sourceEntry || sourceEntry.type !== targetEntry.type || sourceEntry.type === 'unsupported';
    })
    .sort(([leftPath], [rightPath]) => pathDepth(rightPath) - pathDepth(leftPath));
  for (const [relativePath] of removableEntries) {
    await fsImpl.rm(path.join(targetDirectory, relativePath), {
      recursive: true,
      force: true,
    });
  }

  const directories = [...sourceEntries.entries()]
    .filter(([, entry]) => entry.type === 'directory')
    .sort(([leftPath], [rightPath]) => pathDepth(leftPath) - pathDepth(rightPath));
  for (const [relativePath] of directories) {
    await fsImpl.mkdir(path.join(targetDirectory, relativePath), { recursive: true });
  }

  let copiedFiles = 0;
  for (const [relativePath, entry] of sourceEntries) {
    if (entry.type !== 'file') continue;
    await copyFileSafely(
      path.join(sourceDirectory, relativePath),
      path.join(targetDirectory, relativePath),
      fsImpl,
    );
    copiedFiles += 1;
  }

  return {
    copiedFiles,
    removedEntries: removableEntries.length,
  };
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
    const details = await mirrorManagedEntries(sourceDirectory, stagingDirectory, fsImpl);
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
    await fsImpl.writeFile(
      temporaryPath,
      'PNG Bundle Mockup managed Input v1\n',
      { encoding: 'utf8', flag: 'wx' },
    );
    await fsImpl.rename(temporaryPath, markerPath);
  } finally {
    await fsImpl.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

function createInputBackupService(options = {}) {
  const fsImpl = options.fsImpl || fs;
  const inputDirectory = normalizeDirectory(options.inputDirectory, 'inputDirectory');
  const userDataPath = normalizeDirectory(options.userDataPath, 'userDataPath');
  const backupDirectory = options.backupDirectory
    ? normalizeDirectory(options.backupDirectory, 'backupDirectory')
    : path.join(userDataPath, INPUT_BACKUP_DIRECTORY_NAME);
  validateSeparateDirectories(inputDirectory, backupDirectory);
  const markerPath = path.join(inputDirectory, INPUT_MARKER_FILE_NAME);
  let synchronizationQueue = Promise.resolve();

  async function synchronizeNow() {
    await fsImpl.mkdir(inputDirectory, { recursive: true });
    await recoverBackupSnapshot(backupDirectory, fsImpl);
    const [markerExists, backupExists] = await Promise.all([
      readMarkerState(markerPath, fsImpl),
      readDirectoryState(backupDirectory, fsImpl),
    ]);
    if (backupExists) await removeExcludedBackupEntries(backupDirectory, fsImpl);

    if (!markerExists && backupExists) {
      const details = await mirrorManagedEntries(backupDirectory, inputDirectory, fsImpl);
      await writeMarker(markerPath, fsImpl);
      return {
        action: 'restored',
        inputDirectory,
        backupDirectory,
        markerPath,
        ...details,
      };
    }

    const details = await replaceBackupSnapshot(inputDirectory, backupDirectory, fsImpl);
    if (!markerExists) await writeMarker(markerPath, fsImpl);
    return {
      action: markerExists ? 'mirrored' : 'initialized',
      inputDirectory,
      backupDirectory,
      markerPath,
      ...details,
    };
  }

  function synchronize() {
    const operation = synchronizationQueue.catch(() => {}).then(synchronizeNow);
    synchronizationQueue = operation;
    return operation;
  }

  return {
    inputDirectory,
    backupDirectory,
    markerPath,
    synchronize,
  };
}

module.exports = {
  INPUT_MARKER_FILE_NAME,
  INPUT_BACKUP_DIRECTORY_NAME,
  InputBackupError,
  createInputBackupService,
  mirrorManagedEntries,
};
