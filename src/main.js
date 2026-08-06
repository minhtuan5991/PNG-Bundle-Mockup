'use strict';

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  inspectImage,
  inspectWatermark,
  generateMockups,
  renderPreview,
  GenerationCancelledError,
} = require('./engine/image-engine');
const {
  createPathPreferencesStore,
  PATH_KEYS,
} = require('./services/path-preferences');
const { createUpdateService } = require('./services/update-service');

const activeJobs = new Map();
let pathPreferences = null;
let updateService = null;
let mainWindow = null;
let startupUpdateTimer = null;
let recurringUpdateTimer = null;
const smokeTest = process.argv.includes('--smoke-test') || process.env.PNG_BUNDLE_SMOKE_TEST === '1';
const captureArgument = process.argv.find((argument) => argument.startsWith('--capture-ui='));
const capturePathFromEnvironment = process.env.PNG_BUNDLE_CAPTURE_UI;
const smokePicker = process.env.PNG_BUNDLE_SMOKE_PICKER === '1';
const smokeScroll = Number(process.env.PNG_BUNDLE_SMOKE_SCROLL || 0);
const smokeUpdateStatus = process.env.PNG_BUNDLE_SMOKE_UPDATE || '';

async function getRememberedDialogPath(key) {
  if (!pathPreferences) return undefined;
  try {
    return await pathPreferences.getDefaultPath(key);
  } catch (error) {
    console.warn('PATH_PREFERENCES_DEFAULT', error);
    return undefined;
  }
}

async function rememberPath(key, selectedPath) {
  if (!pathPreferences) return;
  try {
    await pathPreferences.remember(key, selectedPath);
  } catch (error) {
    console.warn('PATH_PREFERENCES_SAVE', error);
  }
}

function serializeError(error) {
  return {
    message: error?.message || 'Đã xảy ra lỗi không xác định.',
    code: error?.code || 'UNKNOWN_ERROR',
    filePath: error?.filePath || null,
    cancelled: error instanceof GenerationCancelledError || error?.code === 'CANCELLED',
  };
}

async function safeCall(callback) {
  try {
    return { ok: true, data: await callback() };
  } catch (error) {
    console.error(error);
    return { ok: false, error: serializeError(error) };
  }
}

function toFileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

function sendUpdateStatus(payload) {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
  if (payload.status === 'downloading' && Number.isFinite(payload.progress?.percent)) {
    mainWindow.setProgressBar(Math.max(0, Math.min(100, payload.progress.percent)) / 100);
  } else {
    mainWindow.setProgressBar(-1);
  }
  mainWindow.webContents.send('update:status', payload);
}

function scheduleUpdateChecks() {
  if (!app.isPackaged || smokeTest || !updateService) return;
  startupUpdateTimer = setTimeout(() => {
    updateService.check({ manual: false });
  }, 5000);
  startupUpdateTimer.unref?.();

  recurringUpdateTimer = setInterval(() => {
    updateService.check({ manual: false });
  }, 6 * 60 * 60 * 1000);
  recurringUpdateTimer.unref?.();
}

async function scanPngFolder(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const pngEntries = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLocaleLowerCase() === '.png')
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }),
    );

  const files = [];
  for (const entry of pngEntries) {
    const filePath = path.join(folderPath, entry.name);
    try {
      const [stat, metadata] = await Promise.all([fs.stat(filePath), inspectImage(filePath)]);
      files.push({
        path: filePath,
        url: toFileUrl(filePath),
        name: entry.name,
        size: stat.size,
        width: metadata.width,
        height: metadata.height,
        hasAlpha: metadata.hasAlpha,
        error: null,
      });
    } catch (error) {
      const stat = await fs.stat(filePath).catch(() => ({ size: 0 }));
      files.push({
        path: filePath,
        url: toFileUrl(filePath),
        name: entry.name,
        size: stat.size,
        width: null,
        height: null,
        hasAlpha: null,
        error: error.message,
      });
    }
  }
  return files;
}

function createWindow() {
  const displayName = `PNG Bundle Mockup v${app.getVersion()}`;
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#0b1020',
    show: false,
    title: displayName,
    icon: path.join(__dirname, '..', 'assets', 'app-icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (smokeTest) {
    window.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          if (smokePicker) {
            const demoUrl = pathToFileURL(path.join(__dirname, '..', 'assets', 'app-icon.png')).href;
            const demoFiles = Array.from({ length: 18 }, (_, index) => ({
              path: `D:\\PNG Demo\\design-${String(index + 1).padStart(2, '0')}.png`,
              url: demoUrl,
              name: `design-${String(index + 1).padStart(2, '0')}.png`,
              size: 128000 + index * 931,
              width: 1200,
              height: 1200,
              hasAlpha: true,
              error: null,
            }));
            await window.webContents.executeJavaScript(
              `openSourcePicker(${JSON.stringify({ folderPath: 'D:\\PNG Demo', files: demoFiles })})`,
            );
          } else if (Number.isFinite(smokeScroll) && smokeScroll > 0) {
            await window.webContents.executeJavaScript(
              `document.querySelector('#controlsPanel').scrollTop = ${Math.floor(smokeScroll)}`,
            );
          }
          if (smokeUpdateStatus === 'available') {
            await window.webContents.executeJavaScript(
              `renderUpdateStatus({ status: 'available', currentVersion: '${app.getVersion()}', version: '9.9.9', manual: false })`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 350));
          const checks = await window.webContents.executeJavaScript(`(() => ({
            api: Boolean(window.bundleApi),
            title: document.querySelector('h1')?.textContent === '${displayName}',
            controls: Boolean(document.querySelector('#chooseFolderButton') && document.querySelector('#generateButton')),
            preview: Boolean(document.querySelector('#previewStage') && document.querySelector('#safeZone')),
            initialized: document.querySelector('#selectionCount')?.textContent === 'Đã chọn 0/0 PNG',
            metadataDefault: document.querySelector('#removeMetadata')?.checked === true,
            watermarkApi: typeof window.bundleApi?.selectWatermark === 'function',
            updateApi: typeof window.bundleApi?.checkForUpdates === 'function' && typeof window.bundleApi?.onUpdateStatus === 'function',
            updateUi: Boolean(document.querySelector('#checkUpdateButton') && document.querySelector('#updateDialog')),
            version: document.title === '${displayName}',
            updateDialog: ${smokeUpdateStatus === 'available' ? "document.querySelector('#updateDialog')?.open === true" : 'true'},
            picker: ${smokePicker ? "document.querySelector('#sourcePickerDialog')?.open === true" : 'true'}
          }))()`);
          const passed = Object.values(checks).every(Boolean);
          if (captureArgument || capturePathFromEnvironment) {
            const capturePath = path.resolve(
              captureArgument ? captureArgument.slice('--capture-ui='.length) : capturePathFromEnvironment,
            );
            const image = await window.webContents.capturePage();
            await fs.writeFile(capturePath, image.toPNG());
          }
          console.log(`RENDERER_SMOKE ${passed ? 'PASS' : 'FAIL'} ${JSON.stringify(checks)}`);
          app.exit(passed ? 0 : 1);
        } catch (error) {
          console.error('RENDERER_SMOKE FAIL', error);
          app.exit(1);
        }
      }, 500);
    });
  }

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  window.once('ready-to-show', () => {
    if (!smokeTest) window.show();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow = window;
  window.once('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function beginJob(event, type) {
  const key = event.sender.id;
  if (activeJobs.has(key)) {
    const error = new Error('Một thao tác khác đang chạy. Hãy đợi thao tác đó hoàn tất.');
    error.code = 'JOB_ALREADY_RUNNING';
    throw error;
  }
  const job = { type, cancelled: false };
  activeJobs.set(key, job);
  return {
    job,
    finish: () => activeJobs.delete(key),
    sendProgress: (payload) => {
      if (!event.sender.isDestroyed()) event.sender.send('job:progress', { type, ...payload });
    },
  };
}

function registerIpc() {
  ipcMain.handle('app:get-info', () =>
    safeCall(async () => ({
      name: 'PNG Bundle Mockup',
      version: app.getVersion(),
      displayName: `PNG Bundle Mockup v${app.getVersion()}`,
      isPackaged: app.isPackaged,
      updateSupported: app.isPackaged && process.platform === 'win32' && !smokeTest,
      repositoryUrl: 'https://github.com/minhtuan5991/PNG-Bundle-Mockup',
    })),
  );

  ipcMain.handle('update:get-status', () =>
    safeCall(async () => updateService.getStatus()),
  );

  ipcMain.handle('update:check', (_event, options = {}) =>
    safeCall(async () => updateService.check({ manual: options?.manual === true })),
  );

  ipcMain.handle('update:download', () =>
    safeCall(async () => updateService.download()),
  );

  ipcMain.handle('update:install', () =>
    safeCall(async () => ({ installing: updateService.install() })),
  );

  ipcMain.handle('dialog:select-source-folder', (event) =>
    safeCall(async () => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const defaultPath = await getRememberedDialogPath(PATH_KEYS.SOURCE_FOLDER);
      const result = await dialog.showOpenDialog(owner, {
        title: 'Chọn thư mục chứa PNG',
        properties: ['openDirectory', 'createDirectory'],
        ...(defaultPath ? { defaultPath } : {}),
      });
      if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
      const folderPath = result.filePaths[0];
      const files = await scanPngFolder(folderPath);
      await rememberPath(PATH_KEYS.SOURCE_FOLDER, folderPath);
      return {
        cancelled: false,
        folderPath,
        files,
      };
    }),
  );

  ipcMain.handle('dialog:select-template', (event) =>
    safeCall(async () => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const defaultPath = await getRememberedDialogPath(PATH_KEYS.TEMPLATE_FILE);
      const result = await dialog.showOpenDialog(owner, {
        title: 'Chọn ảnh nền mẫu',
        properties: ['openFile'],
        ...(defaultPath ? { defaultPath } : {}),
        filters: [
          { name: 'Ảnh nền', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'] },
          { name: 'Tất cả file', extensions: ['*'] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
      const filePath = result.filePaths[0];
      const [metadata, stat] = await Promise.all([inspectImage(filePath), fs.stat(filePath)]);
      await rememberPath(PATH_KEYS.TEMPLATE_FILE, filePath);
      return {
        cancelled: false,
        template: {
          path: filePath,
          url: toFileUrl(filePath),
          name: path.basename(filePath),
          size: stat.size,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
        },
      };
    }),
  );

  ipcMain.handle('dialog:select-watermark', (event) =>
    safeCall(async () => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const defaultPath = await getRememberedDialogPath(PATH_KEYS.WATERMARK_FILE);
      const result = await dialog.showOpenDialog(owner, {
        title: 'Chọn watermark PNG nền trong suốt',
        properties: ['openFile'],
        ...(defaultPath ? { defaultPath } : {}),
        filters: [
          { name: 'Watermark PNG', extensions: ['png'] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
      const filePath = result.filePaths[0];
      const [metadata, stat] = await Promise.all([inspectWatermark(filePath), fs.stat(filePath)]);
      await rememberPath(PATH_KEYS.WATERMARK_FILE, filePath);
      return {
        cancelled: false,
        watermark: {
          path: filePath,
          url: toFileUrl(filePath),
          name: path.basename(filePath),
          size: stat.size,
          width: metadata.width,
          height: metadata.height,
          hasAlpha: metadata.hasAlpha,
        },
      };
    }),
  );

  ipcMain.handle('preview:render', (event, payload) =>
    safeCall(async () => {
      const jobControl = beginJob(event, 'preview');
      try {
        const result = await renderPreview({
          ...payload,
          isCancelled: () => jobControl.job.cancelled,
          onProgress: jobControl.sendProgress,
        });
        return {
          ...result,
          buffer: undefined,
          dataUrl: `data:image/png;base64,${result.buffer.toString('base64')}`,
        };
      } finally {
        jobControl.finish();
      }
    }),
  );

  ipcMain.handle('mockup:generate', (event, payload) =>
    safeCall(async () => {
      const jobControl = beginJob(event, 'generate');
      try {
        const result = await generateMockups({
          ...payload,
          isCancelled: () => jobControl.job.cancelled,
          onProgress: jobControl.sendProgress,
        });
        return {
          ...result,
          outputFiles: result.outputPaths.map((filePath) => ({
            path: filePath,
            url: toFileUrl(filePath),
            name: path.basename(filePath),
          })),
          outputPaths: undefined,
        };
      } finally {
        jobControl.finish();
      }
    }),
  );

  ipcMain.handle('job:cancel', (event) =>
    safeCall(async () => {
      const job = activeJobs.get(event.sender.id);
      if (job) job.cancelled = true;
      return { cancelled: Boolean(job) };
    }),
  );

  ipcMain.handle('shell:open-path', (_event, targetPath) =>
    safeCall(async () => {
      const errorMessage = await shell.openPath(path.resolve(String(targetPath)));
      if (errorMessage) throw new Error(errorMessage);
      return { opened: true };
    }),
  );
}

app.whenReady().then(() => {
  pathPreferences = createPathPreferencesStore({
    userDataPath: app.getPath('userData'),
    onWarning: (error) => console.warn('PATH_PREFERENCES_LOAD', error),
  });
  updateService = createUpdateService({
    autoUpdater,
    app,
    currentVersion: app.getVersion(),
    send: sendUpdateStatus,
  });
  registerIpc();
  createWindow();
  scheduleUpdateChecks();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (startupUpdateTimer) clearTimeout(startupUpdateTimer);
  if (recurringUpdateTimer) clearInterval(recurringUpdateTimer);
});
