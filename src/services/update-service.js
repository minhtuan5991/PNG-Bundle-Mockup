'use strict';

const UPDATE_STATUS = Object.freeze({
  DISABLED: 'disabled',
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  UP_TO_DATE: 'up-to-date',
  ERROR: 'error',
});

function copyStatus(status) {
  return {
    ...status,
    ...(status.progress ? { progress: { ...status.progress } } : {}),
  };
}

function errorMessage(error) {
  try {
    if (typeof error === 'string' && error.trim()) return error;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  } catch {
    // Some third-party errors expose throwing getters. Never let diagnostics crash the app.
  }
  return 'Không thể cập nhật ứng dụng.';
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function updateDetails(info, fallbackVersion) {
  const details = {};
  let version;
  let releaseName;
  let releaseDate;

  try {
    version = stringValue(info?.version) || stringValue(fallbackVersion);
    releaseName = stringValue(info?.releaseName);
    releaseDate = stringValue(info?.releaseDate);
  } catch {
    version = stringValue(fallbackVersion);
  }

  if (version) details.version = version;
  if (releaseName) details.releaseName = releaseName;
  if (releaseDate) details.releaseDate = releaseDate;
  return details;
}

function progressDetails(progress) {
  const result = {};
  const fields = ['percent', 'bytesPerSecond', 'transferred', 'total'];

  for (const field of fields) {
    let value;
    try {
      value = progress?.[field];
    } catch {
      value = undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) result[field] = value;
  }

  return result;
}

/**
 * Create a small, renderer-agnostic wrapper around electron-updater.
 *
 * `send`, when present, receives one serializable status snapshot. The caller owns
 * the IPC channel so this module remains usable without an Electron BrowserWindow.
 */
function createUpdateService(options = {}) {
  const { autoUpdater, app, currentVersion = '', send } = options;
  if (!autoUpdater || typeof autoUpdater.on !== 'function') {
    throw new TypeError('createUpdateService cần một autoUpdater có hỗ trợ sự kiện.');
  }

  const isPackaged = typeof options.isPackaged === 'boolean'
    ? options.isPackaged
    : app?.isPackaged === true;
  const version = typeof currentVersion === 'string' ? currentVersion : String(currentVersion ?? '');
  let currentStatus = {
    status: isPackaged ? UPDATE_STATUS.IDLE : UPDATE_STATUS.DISABLED,
    currentVersion: version,
  };
  let activeManual = false;
  let availableVersion;
  let checkPromise = null;
  let downloadPromise = null;

  function notify(snapshot) {
    if (typeof send !== 'function') return;
    try {
      send(copyStatus(snapshot));
    } catch {
      // A closed/destroyed renderer must not take down the updater or the main process.
    }
  }

  function transition(status, details = {}) {
    const nextStatus = { status, currentVersion: version, ...details };
    if (JSON.stringify(nextStatus) === JSON.stringify(currentStatus)) return copyStatus(currentStatus);
    currentStatus = nextStatus;
    notify(currentStatus);
    return copyStatus(currentStatus);
  }

  function transitionError(error, manual = activeManual) {
    const message = errorMessage(error);
    if (
      currentStatus.status === UPDATE_STATUS.ERROR &&
      currentStatus.message === message &&
      currentStatus.manual === Boolean(manual)
    ) {
      return copyStatus(currentStatus);
    }
    return transition(UPDATE_STATUS.ERROR, { message, manual: Boolean(manual) });
  }

  function safelyHandle(handler) {
    return (...args) => {
      if (!isPackaged) return;
      try {
        handler(...args);
      } catch (error) {
        transitionError(error);
      }
    };
  }

  // Register the special EventEmitter error listener first: an updater error must
  // never become an uncaught EventEmitter exception.
  autoUpdater.on('error', safelyHandle((error) => {
    transitionError(error);
  }));
  autoUpdater.on('checking-for-update', safelyHandle(() => {
    transition(UPDATE_STATUS.CHECKING, { manual: activeManual });
  }));
  autoUpdater.on('update-available', safelyHandle((info) => {
    const details = updateDetails(info);
    availableVersion = details.version;
    transition(UPDATE_STATUS.AVAILABLE, { ...details, manual: activeManual });
  }));
  autoUpdater.on('update-not-available', safelyHandle((info) => {
    const details = updateDetails(info, version);
    availableVersion = undefined;
    transition(UPDATE_STATUS.UP_TO_DATE, { ...details, manual: activeManual });
  }));
  autoUpdater.on('download-progress', safelyHandle((progress) => {
    transition(UPDATE_STATUS.DOWNLOADING, {
      ...updateDetails(null, availableVersion),
      manual: activeManual,
      progress: progressDetails(progress),
    });
  }));
  autoUpdater.on('update-downloaded', safelyHandle((info) => {
    const details = updateDetails(info, availableVersion);
    availableVersion = details.version || availableVersion;
    transition(UPDATE_STATUS.DOWNLOADED, { ...details, manual: activeManual });
  }));

  try {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
  } catch (error) {
    if (isPackaged) transitionError(error, false);
  }

  function getStatus() {
    return copyStatus(currentStatus);
  }

  async function check(checkOptions = {}) {
    if (!isPackaged) return getStatus();
    if (checkPromise) return checkPromise;

    activeManual = checkOptions?.manual === true;
    transition(UPDATE_STATUS.CHECKING, { manual: activeManual });

    checkPromise = Promise.resolve()
      .then(() => autoUpdater.checkForUpdates())
      .catch((error) => transitionError(error, activeManual))
      .then(() => getStatus());

    try {
      return await checkPromise;
    } finally {
      checkPromise = null;
    }
  }

  async function download() {
    if (!isPackaged) return getStatus();
    if (downloadPromise) return downloadPromise;

    transition(UPDATE_STATUS.DOWNLOADING, {
      ...updateDetails(null, availableVersion),
      manual: activeManual,
      progress: {},
    });

    downloadPromise = Promise.resolve()
      .then(() => autoUpdater.downloadUpdate())
      .catch((error) => transitionError(error, activeManual))
      .then(() => getStatus());

    try {
      return await downloadPromise;
    } finally {
      downloadPromise = null;
    }
  }

  function install() {
    if (!isPackaged) return false;
    try {
      autoUpdater.quitAndInstall(false, true);
      return true;
    } catch (error) {
      transitionError(error, activeManual);
      return false;
    }
  }

  return Object.freeze({ getStatus, check, download, install });
}

module.exports = {
  UPDATE_STATUS,
  createUpdateService,
};
