'use strict';

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fsSync = require('node:fs');
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
const { inspectDroppedPngFiles } = require('./services/dropped-png-files');
const { createUpdateService } = require('./services/update-service');
const {
  resolveInputDirectory,
  ensureInputDirectory,
} = require('./services/input-directory');
const { createInputBackupService } = require('./services/input-backup-service');
const {
  findPdfTemplates,
  resolvePdfTemplate,
  createDownloadPdf,
  normalizeDownloadUrl,
} = require('./services/pdf-download-service');
const {
  listSingleMockupTemplates,
  resolveTemplateRegions,
  generateSingleMockups,
} = require('./services/single-mockup-service');
const {
  createSingleMockupRegionStore,
} = require('./services/single-mockup-regions');

const activeJobs = new Map();
const activeMutations = new Map();
const deferredCloseWindows = new Map();
const windowsAllowedToClose = new WeakSet();
const closeConfirmations = new Set();
const editorWindowStates = new Map();
const allowedShellPaths = new Set();
let updateInstallPending = false;
let pathPreferences = null;
let inputDirectory = null;
let inputBackupService = null;
let singleMockupRegionStore = null;
let updateService = null;
let mainWindow = null;
let startupUpdateTimer = null;
let recurringUpdateTimer = null;
const smokeTest = process.argv.includes('--smoke-test') || process.env.PNG_BUNDLE_SMOKE_TEST === '1';
const captureArgument = process.argv.find((argument) => argument.startsWith('--capture-ui='));
const capturePathFromEnvironment = process.env.PNG_BUNDLE_CAPTURE_UI;
const smokeResultPath = process.env.PNG_BUNDLE_SMOKE_RESULT;
const smokePicker = process.env.PNG_BUNDLE_SMOKE_PICKER === '1';
const smokeRegionEditor = process.env.PNG_BUNDLE_SMOKE_REGION === '1';
const smokeScroll = Number(process.env.PNG_BUNDLE_SMOKE_SCROLL || 0);
const smokeUpdateStatus = process.env.PNG_BUNDLE_SMOKE_UPDATE || '';
const syncInputBackupOnly = process.argv.includes('--sync-input-backup');
const qaUserDataArgument = process.argv.find((argument) => argument.startsWith('--qa-user-data='));

if (qaUserDataArgument && (smokeTest || syncInputBackupOnly)) {
  const rawQaPath = qaUserDataArgument.slice('--qa-user-data='.length);
  if (!path.isAbsolute(rawQaPath)) throw new TypeError('QA userData path must be absolute.');
  const qaUserDataPath = path.resolve(rawQaPath);
  if (qaUserDataPath === path.parse(qaUserDataPath).root) {
    throw new TypeError('QA userData path must not be a filesystem root.');
  }
  fsSync.mkdirSync(qaUserDataPath, { recursive: true });
  app.setPath('userData', qaUserDataPath);
}

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

function shellPathKey(filePath) {
  const resolvedPath = path.resolve(String(filePath));
  return process.platform === 'win32'
    ? resolvedPath.toLocaleLowerCase('en-US')
    : resolvedPath;
}

function allowShellPath(filePath) {
  allowedShellPaths.add(shellPathKey(filePath));
}

async function scanInputAssets() {
  await ensureInputDirectory(inputDirectory);
  if (inputBackupService) await inputBackupService.synchronize();
  const warnings = [];
  const [pdfPaths, singleMockupTemplates] = await Promise.all([
    findPdfTemplates(inputDirectory),
    listSingleMockupTemplates(inputDirectory, { ignoreInvalid: true, warnings }),
  ]);
  const pdfTemplates = await Promise.all(pdfPaths.map(async (filePath) => {
    const stat = await fs.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
    };
  }));
  const templatesWithRegions = await Promise.all(singleMockupTemplates.map(async (template) => ({
    ...template,
    url: toFileUrl(template.path),
    region: await singleMockupRegionStore.get(template),
  })));
  return {
    inputDirectory,
    pdfTemplates,
    singleMockupTemplates: templatesWithRegions,
    warnings,
  };
}

function scaledProgress(sendProgress, start, end) {
  const span = Math.max(0, end - start);
  return (payload = {}) => sendProgress({
    ...payload,
    fraction: start + span * Math.max(0, Math.min(1, Number(payload.fraction) || 0)),
  });
}

function sendUpdateStatus(payload) {
  if (payload?.status === 'error') updateInstallPending = false;
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
          } else if (smokeRegionEditor) {
            await window.webContents.executeJavaScript(`(async () => {
              const advanced = document.querySelector('#advancedSettings');
              const toggle = document.querySelector('#editSingleMockupRegions');
              advanced.open = true;
              for (let attempt = 0; attempt < 60 && toggle.disabled; attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              if (toggle.disabled) throw new Error('Region editor did not become available.');
              toggle.click();
              const frame = document.querySelector('#imageFrame');
              const region = document.querySelector('#printRegion');
              const previewImage = document.querySelector('#previewImage');
              for (
                let attempt = 0;
                attempt < 60 &&
                  (
                    frame.classList.contains('is-hidden') ||
                    region.classList.contains('is-hidden') ||
                    !previewImage.complete ||
                    previewImage.naturalWidth < 1
                  );
                attempt += 1
              ) {
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              document.querySelector('#controlsPanel').scrollTop = advanced.offsetTop - 80;
            })()`);
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
            dropApi: typeof window.bundleApi?.inspectDroppedPngFiles === 'function' && typeof window.bundleApi?.getDroppedFilePath === 'function',
            inputApi: typeof window.bundleApi?.getInputAssets === 'function' && typeof window.bundleApi?.saveSingleMockupRegions === 'function',
            v121Controls: Boolean(document.querySelector('#createPdfDownload') && document.querySelector('#downloadUrl') && document.querySelector('#createSingleMockups') && document.querySelector('#editSingleMockupRegions')),
            updateApi: typeof window.bundleApi?.checkForUpdates === 'function' && typeof window.bundleApi?.onUpdateStatus === 'function',
            updateUi: Boolean(document.querySelector('#checkUpdateButton') && document.querySelector('#updateDialog')),
            version: document.title === '${displayName}',
            updateDialog: ${smokeUpdateStatus === 'available' ? "document.querySelector('#updateDialog')?.open === true" : 'true'},
            picker: ${smokePicker ? "document.querySelector('#sourcePickerDialog')?.open === true" : 'true'},
            regionEditor: ${smokeRegionEditor ? "document.querySelector('#imageFrame')?.classList.contains('is-hidden') === false && document.querySelector('#printRegion')?.classList.contains('is-hidden') === false && document.querySelector('#previewImage')?.naturalWidth > 0 && document.querySelector('#previewTitle')?.textContent.includes('Chỉnh vùng in')" : 'true'}
          }))()`);
          const passed = Object.values(checks).every(Boolean);
          if (smokeResultPath) {
            await fs.mkdir(path.dirname(path.resolve(smokeResultPath)), { recursive: true });
            await fs.writeFile(
              path.resolve(smokeResultPath),
              `${JSON.stringify({ passed, checks }, null, 2)}\n`,
              'utf8',
            );
          }
          if (captureArgument || capturePathFromEnvironment) {
            if (!window.isVisible()) {
              window.showInactive();
              await new Promise((resolve) => setTimeout(resolve, 180));
            }
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
  window.removeMenu();
  window.once('ready-to-show', () => {
    if (!smokeTest) window.show();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('before-input-event', (event, input) => {
    if (!app.isPackaged || smokeTest) return;
    const key = String(input?.key || '').toLocaleLowerCase('en-US');
    if (key === 'f5' || ((input?.control || input?.meta) && key === 'r')) {
      event.preventDefault();
    }
  });
  window.webContents.on('render-process-gone', () => {
    const key = window.webContents.id;
    const job = activeJobs.get(key);
    if (job) job.cancelled = true;
    editorWindowStates.delete(key);
  });
  window.on('close', (event) => {
    const key = window.webContents.id;
    if (windowsAllowedToClose.has(window)) {
      windowsAllowedToClose.delete(window);
      deferredCloseWindows.delete(key);
      return;
    }
    const job = activeJobs.get(key);
    const editorDirty = editorWindowStates.get(key)?.dirty === true;
    if (!job && !activeMutations.has(key) && !editorDirty) return;
    event.preventDefault();
    if (job) job.cancelled = true;
    deferredCloseWindows.set(key, window);
    if (!job && !activeMutations.has(key)) finishDeferredClose(key);
  });
  mainWindow = window;
  window.once('closed', () => {
    const key = window.webContents.id;
    deferredCloseWindows.delete(key);
    closeConfirmations.delete(key);
    editorWindowStates.delete(key);
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function closeWindowAfterWork(key, window) {
  if (window.isDestroyed() || !deferredCloseWindows.has(key)) return;
  windowsAllowedToClose.add(window);
  setImmediate(() => {
    if (!window.isDestroyed() && deferredCloseWindows.has(key)) window.close();
  });
}

function confirmDiscardEditorChanges(key, window) {
  if (closeConfirmations.has(key)) return;
  closeConfirmations.add(key);
  dialog.showMessageBox(window, {
    type: 'warning',
    title: 'Vùng in chưa được lưu',
    message: 'Bạn có thay đổi vùng in mockup đơn chưa được lưu.',
    detail: 'Thoát lúc này sẽ bỏ các thay đổi đó.',
    buttons: ['Tiếp tục chỉnh sửa', 'Thoát không lưu'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  }).then((result) => {
    closeConfirmations.delete(key);
    if (window.isDestroyed() || !deferredCloseWindows.has(key)) return;
    if (result.response === 1) {
      const state = editorWindowStates.get(key);
      if (state) editorWindowStates.set(key, { ...state, dirty: false });
      closeWindowAfterWork(key, window);
    } else {
      deferredCloseWindows.delete(key);
    }
  }).catch((error) => {
    closeConfirmations.delete(key);
    deferredCloseWindows.delete(key);
    console.error('EDITOR_CLOSE_CONFIRMATION_FAILED', error);
  });
}

function finishDeferredClose(key) {
  if (activeJobs.has(key) || activeMutations.has(key)) return;
  const window = deferredCloseWindows.get(key);
  if (!window) return;
  if (window.isDestroyed()) {
    deferredCloseWindows.delete(key);
    return;
  }
  if (editorWindowStates.get(key)?.dirty === true) {
    confirmDiscardEditorChanges(key, window);
    return;
  }
  closeWindowAfterWork(key, window);
}

function beginJob(event, type) {
  const key = event.sender.id;
  if (updateInstallPending || deferredCloseWindows.has(key)) {
    const error = new Error('Ứng dụng đang chuẩn bị đóng hoặc cài cập nhật. Không thể bắt đầu tác vụ mới.');
    error.code = 'APP_CLOSING';
    throw error;
  }
  if (activeJobs.has(key)) {
    const error = new Error('Một thao tác khác đang chạy. Hãy đợi thao tác đó hoàn tất.');
    error.code = 'JOB_ALREADY_RUNNING';
    throw error;
  }
  const job = { type, cancelled: false };
  activeJobs.set(key, job);
  return {
    job,
    finish: () => {
      activeJobs.delete(key);
      finishDeferredClose(key);
    },
    sendProgress: (payload) => {
      if (!event.sender.isDestroyed()) event.sender.send('job:progress', { type, ...payload });
    },
  };
}

function beginMutation(event, options = {}) {
  const key = event.sender.id;
  if (
    deferredCloseWindows.has(key) ||
    (updateInstallPending && options.allowDuringUpdateInstall !== true)
  ) {
    const error = new Error('Ứng dụng đang chuẩn bị đóng hoặc cài cập nhật. Không thể ghi dữ liệu mới.');
    error.code = 'APP_CLOSING';
    throw error;
  }
  activeMutations.set(key, (activeMutations.get(key) || 0) + 1);
  let finished = false;
  return {
    finish: () => {
      if (finished) return;
      finished = true;
      const remaining = (activeMutations.get(key) || 1) - 1;
      if (remaining > 0) activeMutations.set(key, remaining);
      else activeMutations.delete(key);
      finishDeferredClose(key);
    },
  };
}

function registerIpc() {
  ipcMain.on('window:set-editor-state', (event, value = {}) => {
    const key = event.sender.id;
    editorWindowStates.set(key, {
      open: value?.open === true,
      dirty: value?.open === true && value?.dirty === true,
    });
    if (deferredCloseWindows.has(key) && value?.dirty !== true) finishDeferredClose(key);
  });

  ipcMain.handle('app:get-info', () =>
    safeCall(async () => ({
      name: 'PNG Bundle Mockup',
      version: app.getVersion(),
      displayName: `PNG Bundle Mockup v${app.getVersion()}`,
      isPackaged: app.isPackaged,
      updateSupported: app.isPackaged && process.platform === 'win32' && !smokeTest,
      repositoryUrl: 'https://github.com/minhtuan5991/PNG-Bundle-Mockup',
      inputDirectory,
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

  ipcMain.handle('update:install', (event) =>
    safeCall(async () => {
      const editorOpen = [...editorWindowStates.values()].some((state) => state.open);
      if (updateInstallPending || activeJobs.size > 0 || activeMutations.size > 0 || editorOpen) {
        const error = new Error('Hãy chờ tác vụ hiện tại hoàn tất và lưu hoặc đóng phần chỉnh vùng in trước khi cài cập nhật.');
        error.code = 'UPDATE_INSTALL_JOB_ACTIVE';
        throw error;
      }
      updateInstallPending = true;
      let mutation;
      try {
        mutation = beginMutation(event, { allowDuringUpdateInstall: true });
        if (inputBackupService) await inputBackupService.synchronize();
      } catch (error) {
        updateInstallPending = false;
        throw error;
      } finally {
        if (mutation) mutation.finish();
      }
      const installing = updateService.install();
      if (!installing) updateInstallPending = false;
      return { installing };
    }),
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

  ipcMain.handle('source:inspect-dropped-png-files', (_event, filePaths) =>
    safeCall(() => inspectDroppedPngFiles(filePaths, { inspectImage })),
  );

  ipcMain.handle('input:get-assets', (event) =>
    safeCall(async () => {
      const mutation = beginMutation(event);
      try {
        return await scanInputAssets();
      } finally {
        mutation.finish();
      }
    }),
  );

  ipcMain.handle('input:save-single-mockup-regions', (event, entries) =>
    safeCall(async () => {
      const mutation = beginMutation(event);
      try {
        if (!Array.isArray(entries)) throw new TypeError('Danh sách vùng in không hợp lệ.');
        if (inputBackupService) await inputBackupService.synchronize();
        const templates = await listSingleMockupTemplates(inputDirectory, { ignoreInvalid: true });
        const byName = new Map(templates.map((template) => [
          template.name.toLocaleLowerCase('en-US'),
          template,
        ]));
        if (entries.length !== templates.length) {
          throw new Error('Hãy thiết lập vùng in cho toàn bộ ảnh mockup trong Input.');
        }
        const safeEntries = entries.map((entry) => {
          const key = String(entry?.templateName || '').toLocaleLowerCase('en-US');
          const template = byName.get(key);
          if (!template) throw new Error(`Không tìm thấy ảnh mockup “${entry?.templateName || ''}” trong Input.`);
          return { template, region: entry.region };
        });
        await singleMockupRegionStore.replaceAll(safeEntries);
        const editorState = editorWindowStates.get(event.sender.id);
        if (editorState) {
          editorWindowStates.set(event.sender.id, { ...editorState, dirty: false });
        }
        return scanInputAssets();
      } finally {
        mutation.finish();
      }
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
      const createdPaths = [];
      try {
        const createPdfDownload = payload?.createPdfDownload === true;
        const createSingleMockups = payload?.createSingleMockups === true;
        let pdfTemplatePath = null;
        let normalizedDownloadUrl = null;
        let singleMockupTemplates = null;

        if ((createPdfDownload || createSingleMockups) && inputBackupService) {
          await inputBackupService.synchronize();
        }

        if (createPdfDownload) {
          normalizedDownloadUrl = normalizeDownloadUrl(payload?.downloadUrl);
          pdfTemplatePath = await resolvePdfTemplate(inputDirectory);
        }
        if (createSingleMockups) {
          singleMockupTemplates = await listSingleMockupTemplates(inputDirectory, {
            ignoreInvalid: true,
          });
          if (singleMockupTemplates.length === 0) {
            const error = new Error('Thư mục Input chưa có ảnh để tạo mockup đơn.');
            error.code = 'NO_SINGLE_MOCKUP_TEMPLATES';
            throw error;
          }
          await resolveTemplateRegions(singleMockupTemplates, {
            regionStore: singleMockupRegionStore,
          });
        }

        const bundleEnd = createSingleMockups
          ? (createPdfDownload ? 0.68 : 0.75)
          : (createPdfDownload ? 0.86 : 1);
        const singleEnd = createPdfDownload ? 0.92 : 1;
        const result = await generateMockups({
          ...payload,
          isCancelled: () => jobControl.job.cancelled,
          onProgress: scaledProgress(jobControl.sendProgress, 0, bundleEnd),
        });
        createdPaths.push(...result.outputPaths);
        allowShellPath(result.outputDir);

        if (jobControl.job.cancelled) throw new GenerationCancelledError();

        let singleResult = null;
        if (createSingleMockups) {
          singleResult = await generateSingleMockups({
            sourcePaths: payload.sourcePaths,
            inputDirectory,
            outputDirectory: result.outputDir,
            templates: singleMockupTemplates,
            regionStore: singleMockupRegionStore,
            settings: payload.settings,
            alphaThreshold: payload.settings?.alphaThreshold,
            watermarkPath: payload.watermarkPath || null,
            removeMetadata: payload.removeMetadata !== false,
            isCancelled: () => jobControl.job.cancelled,
            onProgress: scaledProgress(jobControl.sendProgress, bundleEnd, singleEnd),
          });
          createdPaths.push(...singleResult.outputPaths);
        }

        if (jobControl.job.cancelled) throw new GenerationCancelledError();

        let pdfResult = null;
        if (createPdfDownload) {
          jobControl.sendProgress({
            fraction: singleEnd,
            message: 'Đang cập nhật link tải trong PDF mẫu…',
            stage: 'pdf-download',
          });
          pdfResult = await createDownloadPdf({
            templatePath: pdfTemplatePath,
            outputDirectory: result.outputDir,
            downloadUrl: normalizedDownloadUrl,
            isCancelled: () => jobControl.job.cancelled,
          });
          createdPaths.push(pdfResult.outputPath);
          if (jobControl.job.cancelled) throw new GenerationCancelledError();
          jobControl.sendProgress({
            fraction: 1,
            message: 'Đã tạo xong mockup và các file bổ sung.',
            stage: 'complete',
          });
        }

        return {
          ...result,
          outputFiles: result.outputPaths.map((filePath) => ({
            path: filePath,
            url: toFileUrl(filePath),
            name: path.basename(filePath),
          })),
          singleMockupFiles: (singleResult?.outputPaths || []).map((filePath) => ({
            path: filePath,
            url: toFileUrl(filePath),
            name: path.basename(filePath),
          })),
          singleMockupCount: singleResult?.outputPaths.length || 0,
          pdfDownload: pdfResult
            ? {
                ...pdfResult,
                path: pdfResult.outputPath,
                url: toFileUrl(pdfResult.outputPath),
                name: path.basename(pdfResult.outputPath),
                outputPath: undefined,
              }
            : null,
          outputPaths: undefined,
        };
      } catch (error) {
        await Promise.allSettled(createdPaths.map((filePath) => fs.rm(filePath, { force: true })));
        throw error;
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
      const resolvedPath = path.resolve(String(targetPath));
      if (!allowedShellPaths.has(shellPathKey(resolvedPath))) {
        const error = new Error('Ứng dụng chỉ cho phép mở thư mục Input hoặc thư mục kết quả Done.');
        error.code = 'SHELL_PATH_NOT_ALLOWED';
        throw error;
      }
      const stat = await fs.stat(resolvedPath);
      if (!stat.isDirectory()) {
        const error = new Error('Đường dẫn cần mở không phải là thư mục.');
        error.code = 'SHELL_PATH_NOT_DIRECTORY';
        throw error;
      }
      const errorMessage = await shell.openPath(resolvedPath);
      if (errorMessage) throw new Error(errorMessage);
      return { opened: true };
    }),
  );
}

async function initializeApplication() {
  let userDataPath;
  try {
    inputDirectory = resolveInputDirectory({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      executablePath: app.getPath('exe'),
    });
    await ensureInputDirectory(inputDirectory);
    userDataPath = app.getPath('userData');
    inputBackupService = createInputBackupService({
      inputDirectory,
      userDataPath,
    });
    allowShellPath(inputDirectory);
    const inputSync = await inputBackupService.synchronize();
    if (inputSync.action === 'restored') {
      console.info('INPUT_BACKUP_RESTORED', inputSync.backupDirectory);
    }
  } catch (error) {
    console.error('INPUT_DIRECTORY_STARTUP_FAILED', error);
    if (syncInputBackupOnly) {
      app.exit(2);
      return;
    }
    try {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Không thể khởi động PNG Bundle Mockup',
        message: 'Ứng dụng không thể ghi hoặc bảo vệ thư mục Input.',
        detail: `${error?.message || error}\n\nHãy cài ứng dụng cho tài khoản hiện tại vào thư mục có quyền ghi rồi mở lại.`,
        buttons: ['Đóng ứng dụng'],
        defaultId: 0,
        noLink: true,
      });
    } catch (dialogError) {
      console.error('INPUT_DIRECTORY_STARTUP_DIALOG_FAILED', dialogError);
    }
    app.quit();
    return;
  }
  if (syncInputBackupOnly) {
    app.exit(0);
    return;
  }
  singleMockupRegionStore = createSingleMockupRegionStore({
    userDataPath,
    onWarning: (error) => console.warn('SINGLE_MOCKUP_REGIONS_LOAD', error),
  });
  pathPreferences = createPathPreferencesStore({
    userDataPath,
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
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  // The uninstall/update hook must fail closed while the interactive app is
  // still using Input. A regular second launch can exit quietly because the
  // primary instance receives the second-instance event below.
  app.exit(syncInputBackupOnly ? 3 : 0);
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (commandLine.includes('--sync-input-backup')) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(initializeApplication);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (startupUpdateTimer) clearTimeout(startupUpdateTimer);
  if (recurringUpdateTimer) clearInterval(recurringUpdateTimer);
});
