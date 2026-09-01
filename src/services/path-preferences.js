'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const DEFAULT_FILE_NAME = 'path-preferences.json';
const MAX_PATH_LENGTH = 32767;

const PATH_KEYS = Object.freeze({
  SOURCE_FOLDER: 'sourceFolder',
  TEMPLATE_FILE: 'templateFile',
  GROUP_TEMPLATE_FILE: 'groupTemplateFile',
  GROUP_SINGLE_TEMPLATE_FILE: 'groupSingleTemplateFile',
  WATERMARK_FILE: 'watermarkFile',
});

const VALID_KEYS = new Set(Object.values(PATH_KEYS));
const FILE_EXTENSIONS = Object.freeze({
  [PATH_KEYS.TEMPLATE_FILE]: new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']),
  [PATH_KEYS.GROUP_TEMPLATE_FILE]: new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']),
  [PATH_KEYS.GROUP_SINGLE_TEMPLATE_FILE]: new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']),
  [PATH_KEYS.WATERMARK_FILE]: new Set(['.png']),
});

class PathPreferenceError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PathPreferenceError';
    this.code = code;
    Object.assign(this, details);
  }
}

function defaultPreferences() {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceFolder: null,
    templateFile: null,
    groupTemplateFile: null,
    groupSingleTemplateFile: null,
    watermarkFile: null,
  };
}

function assertKnownKey(key) {
  if (!VALID_KEYS.has(key)) {
    throw new PathPreferenceError(
      `Khóa đường dẫn không được hỗ trợ: ${String(key)}`,
      'UNKNOWN_PATH_PREFERENCE',
      { key },
    );
  }
}

function normalizeCandidate(key, candidatePath) {
  assertKnownKey(key);
  if (typeof candidatePath !== 'string') return null;
  if (candidatePath.trim().length === 0 || candidatePath.length > MAX_PATH_LENGTH) return null;
  if (!path.isAbsolute(candidatePath)) return null;

  const normalized = path.normalize(candidatePath);
  const allowedExtensions = FILE_EXTENSIONS[key];
  if (allowedExtensions && !allowedExtensions.has(path.extname(normalized).toLowerCase())) return null;
  return normalized;
}

function sanitizePreferences(rawPreferences) {
  const sanitized = defaultPreferences();
  if (
    !rawPreferences ||
    typeof rawPreferences !== 'object' ||
    Array.isArray(rawPreferences) ||
    rawPreferences.schemaVersion !== SCHEMA_VERSION
  ) {
    return sanitized;
  }

  for (const key of VALID_KEYS) {
    sanitized[key] = normalizeCandidate(key, rawPreferences[key]);
  }
  return sanitized;
}

async function statOrNull(candidatePath, fsImpl = fs) {
  try {
    return await fsImpl.stat(candidatePath);
  } catch {
    return null;
  }
}

async function validateRememberedPath(key, candidatePath, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const normalized = normalizeCandidate(key, candidatePath);
  if (!normalized) return null;

  const stat = await statOrNull(normalized, fsImpl);
  if (!stat) return null;
  if (key === PATH_KEYS.SOURCE_FOLDER) return stat.isDirectory() ? normalized : null;
  return stat.isFile() ? normalized : null;
}

async function resolveDialogDefaultPath(key, rawPreferences, options = {}) {
  assertKnownKey(key);
  const fsImpl = options.fsImpl || fs;
  const preferences = sanitizePreferences(rawPreferences);
  const candidatePath = preferences[key];
  if (!candidatePath) return undefined;

  const exactPath = await validateRememberedPath(key, candidatePath, { fsImpl });
  if (exactPath) return exactPath;

  const parentPath = path.dirname(candidatePath);
  if (parentPath === candidatePath) return undefined;
  const parentStat = await statOrNull(parentPath, fsImpl);
  return parentStat?.isDirectory() ? parentPath : undefined;
}

function createPathPreferencesStore(options = {}) {
  const { userDataPath, fileName = DEFAULT_FILE_NAME, fsImpl = fs, onWarning = () => {} } = options;
  if (typeof userDataPath !== 'string' || userDataPath.trim().length === 0) {
    throw new TypeError('createPathPreferencesStore cần một userDataPath hợp lệ.');
  }
  if (typeof fileName !== 'string' || fileName.length === 0 || path.basename(fileName) !== fileName) {
    throw new TypeError('fileName phải là tên file, không được chứa đường dẫn.');
  }
  if (typeof onWarning !== 'function') throw new TypeError('onWarning phải là một hàm.');

  const directoryPath = path.resolve(userDataPath);
  const filePath = path.join(directoryPath, fileName);
  let cachedPreferences = null;
  let loadPromise = null;
  let writeQueue = Promise.resolve();
  let temporarySequence = 0;

  function warn(error) {
    try {
      onWarning(error);
    } catch {
      // A diagnostics callback must never prevent the app from opening a dialog.
    }
  }

  async function readFromDisk() {
    try {
      const contents = await fsImpl.readFile(filePath, 'utf8');
      return sanitizePreferences(JSON.parse(contents));
    } catch (error) {
      if (error?.code !== 'ENOENT') warn(error);
      return defaultPreferences();
    }
  }

  async function ensureLoaded() {
    if (cachedPreferences) return cachedPreferences;
    if (!loadPromise) {
      loadPromise = readFromDisk().then((preferences) => {
        cachedPreferences = preferences;
        return preferences;
      });
    }
    return loadPromise;
  }

  async function writeAtomically(preferences) {
    await fsImpl.mkdir(directoryPath, { recursive: true });
    temporarySequence += 1;
    const temporaryPath = `${filePath}.tmp-${process.pid}-${temporarySequence}`;
    try {
      await fsImpl.writeFile(
        temporaryPath,
        `${JSON.stringify(preferences, null, 2)}\n`,
        { encoding: 'utf8', mode: 0o600 },
      );
      await fsImpl.rename(temporaryPath, filePath);
    } finally {
      await fsImpl.unlink(temporaryPath).catch(() => {});
    }
  }

  async function load() {
    return { ...(await ensureLoaded()) };
  }

  async function remember(key, candidatePath) {
    assertKnownKey(key);
    const validatedPath = await validateRememberedPath(key, candidatePath, { fsImpl });
    if (!validatedPath) {
      throw new PathPreferenceError(
        `Không thể lưu đường dẫn ${key} vì file hoặc thư mục không hợp lệ.`,
        'INVALID_PATH_PREFERENCE',
        { key },
      );
    }

    const operation = writeQueue.catch(() => {}).then(async () => {
      const current = await ensureLoaded();
      const next = { ...current, [key]: validatedPath };
      await writeAtomically(next);
      cachedPreferences = next;
      return { ...next };
    });
    writeQueue = operation;
    return operation;
  }

  async function getDefaultPath(key) {
    return resolveDialogDefaultPath(key, await ensureLoaded(), { fsImpl });
  }

  return Object.freeze({
    filePath,
    load,
    remember,
    getDefaultPath,
  });
}

module.exports = {
  SCHEMA_VERSION,
  PATH_KEYS,
  PathPreferenceError,
  defaultPreferences,
  sanitizePreferences,
  validateRememberedPath,
  resolveDialogDefaultPath,
  createPathPreferencesStore,
};
