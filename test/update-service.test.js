'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  UPDATE_STATUS,
  createUpdateService,
} = require('../src/services/update-service');

class FakeAutoUpdater extends EventEmitter {
  constructor() {
    super();
    this.autoDownload = true;
    this.checkCalls = 0;
    this.downloadCalls = 0;
    this.installCalls = [];
    this.checkImplementation = async () => undefined;
    this.downloadImplementation = async () => undefined;
    this.installImplementation = () => undefined;
  }

  async checkForUpdates() {
    this.checkCalls += 1;
    return this.checkImplementation();
  }

  async downloadUpdate() {
    this.downloadCalls += 1;
    return this.downloadImplementation();
  }

  quitAndInstall(...args) {
    this.installCalls.push(args);
    return this.installImplementation(...args);
  }
}

function createPackagedService(options = {}) {
  const autoUpdater = options.autoUpdater || new FakeAutoUpdater();
  const messages = [];
  const service = createUpdateService({
    autoUpdater,
    app: { isPackaged: true },
    currentVersion: '1.2.0',
    send: options.send === undefined ? (message) => messages.push(message) : options.send,
  });
  return { autoUpdater, messages, service };
}

test('development build is disabled and never calls updater operations', async () => {
  const autoUpdater = new FakeAutoUpdater();
  const messages = [];
  const service = createUpdateService({
    autoUpdater,
    app: { isPackaged: false },
    currentVersion: '1.2.0',
    send: (message) => messages.push(message),
  });

  assert.equal(autoUpdater.autoDownload, false);
  assert.equal(autoUpdater.autoInstallOnAppQuit, false);
  assert.equal(autoUpdater.allowPrerelease, false);
  assert.deepEqual(service.getStatus(), {
    status: UPDATE_STATUS.DISABLED,
    currentVersion: '1.2.0',
  });

  assert.deepEqual(await service.check({ manual: true }), service.getStatus());
  assert.deepEqual(await service.download(), service.getStatus());
  assert.equal(service.install(), false);
  assert.equal(autoUpdater.checkCalls, 0);
  assert.equal(autoUpdater.downloadCalls, 0);
  assert.deepEqual(autoUpdater.installCalls, []);

  assert.doesNotThrow(() => autoUpdater.emit('update-available', { version: '2.0.0' }));
  assert.doesNotThrow(() => autoUpdater.emit('error', new Error('ignored in development')));
  assert.equal(service.getStatus().status, UPDATE_STATUS.DISABLED);
  assert.deepEqual(messages, []);
});

test('manual check, download progress, downloaded event, and install follow the full lifecycle', async () => {
  const { autoUpdater, messages, service } = createPackagedService();
  assert.equal(autoUpdater.autoDownload, false);
  assert.deepEqual(service.getStatus(), {
    status: UPDATE_STATUS.IDLE,
    currentVersion: '1.2.0',
  });

  autoUpdater.checkImplementation = async () => {
    autoUpdater.emit('checking-for-update');
    autoUpdater.emit('update-available', {
      version: '1.3.0',
      releaseName: 'Version 1.3',
      releaseDate: '2026-08-06T00:00:00.000Z',
      files: [{ url: 'not-forwarded-to-renderer.exe' }],
    });
  };

  assert.deepEqual(await service.check({ manual: true }), {
    status: UPDATE_STATUS.AVAILABLE,
    currentVersion: '1.2.0',
    version: '1.3.0',
    releaseName: 'Version 1.3',
    releaseDate: '2026-08-06T00:00:00.000Z',
    manual: true,
  });
  assert.equal(autoUpdater.checkCalls, 1);
  assert.deepEqual(messages.map((message) => message.status), [
    UPDATE_STATUS.CHECKING,
    UPDATE_STATUS.AVAILABLE,
  ]);

  autoUpdater.downloadImplementation = async () => {
    autoUpdater.emit('download-progress', {
      percent: 37.5,
      bytesPerSecond: 4096,
      transferred: 3,
      total: 8,
      extra: 'not-forwarded',
    });
    autoUpdater.emit('update-downloaded', { version: '1.3.0' });
  };

  assert.deepEqual(await service.download(), {
    status: UPDATE_STATUS.DOWNLOADED,
    currentVersion: '1.2.0',
    version: '1.3.0',
    manual: true,
  });
  assert.equal(autoUpdater.downloadCalls, 1);
  assert.deepEqual(messages.at(-2), {
    status: UPDATE_STATUS.DOWNLOADING,
    currentVersion: '1.2.0',
    version: '1.3.0',
    manual: true,
    progress: {
      percent: 37.5,
      bytesPerSecond: 4096,
      transferred: 3,
      total: 8,
    },
  });

  assert.equal(service.install(), true);
  assert.deepEqual(autoUpdater.installCalls, [[false, true]]);
});

test('automatic no-update event reports up-to-date with manual false', async () => {
  const { autoUpdater, messages, service } = createPackagedService();
  autoUpdater.checkImplementation = async () => {
    autoUpdater.emit('update-not-available', { version: '1.2.0' });
  };

  assert.deepEqual(await service.check(), {
    status: UPDATE_STATUS.UP_TO_DATE,
    currentVersion: '1.2.0',
    version: '1.2.0',
    manual: false,
  });
  assert.deepEqual(messages.at(-1), service.getStatus());
});

test('check failures are safe and preserve whether the request was manual', async () => {
  const { autoUpdater, messages, service } = createPackagedService();
  autoUpdater.checkImplementation = async () => {
    throw new Error('automatic network failure');
  };

  await assert.doesNotReject(() => service.check({ manual: false }));
  assert.deepEqual(service.getStatus(), {
    status: UPDATE_STATUS.ERROR,
    currentVersion: '1.2.0',
    message: 'automatic network failure',
    manual: false,
  });

  autoUpdater.checkImplementation = async () => {
    throw new Error('manual network failure');
  };
  await assert.doesNotReject(() => service.check({ manual: true }));
  assert.deepEqual(messages.at(-1), {
    status: UPDATE_STATUS.ERROR,
    currentVersion: '1.2.0',
    message: 'manual network failure',
    manual: true,
  });
});

test('updater events work without a renderer sender and never expose unsafe error objects', async () => {
  const autoUpdater = new FakeAutoUpdater();
  const service = createUpdateService({
    autoUpdater,
    isPackaged: true,
    currentVersion: '1.2.0',
  });

  assert.doesNotThrow(() => autoUpdater.emit('update-available', { version: '2.0.0' }));
  assert.equal(service.getStatus().status, UPDATE_STATUS.AVAILABLE);

  const hostileError = {};
  Object.defineProperty(hostileError, 'message', {
    get() {
      throw new Error('getter should stay contained');
    },
  });
  assert.doesNotThrow(() => autoUpdater.emit('error', hostileError));
  assert.deepEqual(service.getStatus(), {
    status: UPDATE_STATUS.ERROR,
    currentVersion: '1.2.0',
    message: 'Không thể cập nhật ứng dụng.',
    manual: false,
  });

  autoUpdater.downloadImplementation = async () => {
    throw new Error('download failed');
  };
  await assert.doesNotReject(() => service.download());
  assert.equal(service.getStatus().message, 'download failed');
});

test('closed renderer and synchronous install errors are contained', () => {
  const { autoUpdater, service } = createPackagedService({
    send: () => {
      throw new Error('webContents was destroyed');
    },
  });

  assert.doesNotThrow(() => autoUpdater.emit('download-progress', { percent: 50 }));
  assert.equal(service.getStatus().progress.percent, 50);

  autoUpdater.emit('update-downloaded', { version: '1.3.0' });
  autoUpdater.installImplementation = () => {
    throw new Error('install failed');
  };
  assert.equal(service.install(), false);
  assert.deepEqual(service.getStatus(), {
    status: UPDATE_STATUS.ERROR,
    currentVersion: '1.2.0',
    message: 'install failed',
    manual: false,
  });
});

test('install trả false khi quitAndInstall phát lỗi đồng bộ hoặc chưa tải xong', () => {
  const { autoUpdater, service } = createPackagedService();
  assert.equal(service.install(), false);
  assert.deepEqual(autoUpdater.installCalls, []);

  autoUpdater.emit('update-downloaded', { version: '1.3.0' });
  autoUpdater.installImplementation = () => {
    autoUpdater.emit('error', new Error('cached installer missing'));
  };

  assert.equal(service.install(), false);
  assert.deepEqual(service.getStatus(), {
    status: UPDATE_STATUS.ERROR,
    currentVersion: '1.2.0',
    message: 'cached installer missing',
    manual: false,
  });
});
