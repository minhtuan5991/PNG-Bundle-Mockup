'use strict';

const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
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
  resolvePrintAreaDirectory,
  ensurePrintAreaDirectory,
  createPrintAreaStorageService,
} = require('./services/print-area-storage');
const {
  findPdfTemplates,
  createDownloadPdf,
} = require('./services/pdf-download-service');
const {
  SINGLE_MOCKUP_TEMPLATE_EXTENSIONS,
  listSingleMockupTemplates,
  findExistingSingleMockupOutputs,
  resolveTemplateRegions,
  generateSingleMockups,
} = require('./services/single-mockup-service');
const {
  createSingleMockupRegionStore,
} = require('./services/single-mockup-regions');
const {
  parseGroupShirtTemplateName,
  applyGroupShirtRenamePlan,
} = require('./services/group-shirt-filenames');
const {
  createGroupShirtRegionStore,
} = require('./services/group-shirt-regions');
const {
  selectLightGroupShirtSourceGroups,
} = require('./services/group-shirt-planner');
const {
  renderGroupShirtPreview,
  generateGroupShirtMockups,
} = require('./services/group-shirt-service');
const { cleanupAppArtifacts } = require('./services/app-cleanup-service');

const activeJobs = new Map();
const activeMutations = new Map();
const deferredCloseWindows = new Map();
const windowsAllowedToClose = new WeakSet();
const closeConfirmations = new Set();
const closingCleanupWindows = new Set();
const editorWindowStates = new Map();
const allowedShellPaths = new Set();
const authorizedSourcePaths = new Map();
const authorizedGroupTemplatePaths = new Map();
const authorizedSingleTemplatePaths = new Map();
const SUPPORTED_SINGLE_MOCKUP_FORMATS = new Set(['png', 'jpeg', 'webp', 'tiff']);
let updateInstallPending = false;
let pathPreferences = null;
let inputDirectory = null;
let inputBackupService = null;
let printAreaDirectory = null;
let printAreaStorageService = null;
let singleMockupRegionStore = null;
let groupShirtRegionStore = null;
let updateService = null;
let mainWindow = null;
let startupUpdateTimer = null;
let recurringUpdateTimer = null;
let cleanupPromise = null;
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

// CI/QA smoke runs only exercise renderer contracts. Disabling hardware
// acceleration here keeps those checks usable on Windows hosts without a
// working GPU process while leaving normal installed-app rendering unchanged.
if (smokeTest) app.disableHardwareAcceleration();

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

function replaceAuthorizedPaths(store, senderId, filePaths) {
  store.set(senderId, new Set(filePaths.map(shellPathKey)));
}

function addAuthorizedPaths(store, senderId, filePaths) {
  const authorized = store.get(senderId) || new Set();
  for (const filePath of filePaths) authorized.add(shellPathKey(filePath));
  store.set(senderId, authorized);
}

function assertAuthorizedPaths(store, senderId, filePaths, label) {
  const authorized = store.get(senderId) || new Set();
  const deniedPath = filePaths.find((filePath) => !authorized.has(shellPathKey(filePath)));
  if (!deniedPath) return;
  const error = new Error(`${label} chưa được người dùng chọn trong phiên làm việc hiện tại.`);
  error.code = 'UNAUTHORIZED_FILE_PATH';
  error.filePath = path.resolve(String(deniedPath));
  throw error;
}

async function scanInputAssets() {
  await ensureInputDirectory(inputDirectory);
  if (inputBackupService) await inputBackupService.synchronize();
  const warnings = [];
  const [pdfPaths, singleMockupTemplates] = await Promise.all([
    findPdfTemplates(inputDirectory),
    listSingleMockupTemplates(inputDirectory, {
      ignoreInvalid: true,
      warnings,
      templateMarker: 'bundle',
    }),
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

async function inspectPngPath(filePath) {
  const resolvedPath = path.resolve(String(filePath));
  const [stat, metadata] = await Promise.all([fs.stat(resolvedPath), inspectImage(resolvedPath)]);
  if (!stat.isFile() || path.extname(resolvedPath).toLocaleLowerCase('en-US') !== '.png') {
    const error = new Error(`“${path.basename(resolvedPath)}” không phải file PNG hợp lệ.`);
    error.code = 'GROUP_SHIRT_SOURCE_NOT_PNG';
    error.filePath = resolvedPath;
    throw error;
  }
  return {
    path: resolvedPath,
    directory: path.dirname(resolvedPath),
    url: toFileUrl(resolvedPath),
    name: path.basename(resolvedPath),
    size: stat.size,
    width: metadata.autoOrient?.width || metadata.width,
    height: metadata.autoOrient?.height || metadata.height,
    hasAlpha: metadata.hasAlpha,
    error: null,
  };
}

async function inspectGroupShirtTemplatePath(filePath) {
  const resolvedPath = path.resolve(String(filePath));
  const parsed = parseGroupShirtTemplateName(resolvedPath);
  const [stat, metadata, contents] = await Promise.all([
    fs.stat(resolvedPath),
    inspectImage(resolvedPath),
    fs.readFile(resolvedPath),
  ]);
  if (!stat.isFile()) {
    const error = new Error(`Ảnh nền “${path.basename(resolvedPath)}” không phải file.`);
    error.code = 'INVALID_GROUP_SHIRT_TEMPLATE';
    error.filePath = resolvedPath;
    throw error;
  }
  const template = {
    ...parsed,
    path: resolvedPath,
    url: toFileUrl(resolvedPath),
    name: path.basename(resolvedPath),
    displayGroup: parsed.group,
    size: stat.size,
    width: metadata.autoOrient?.width || metadata.width,
    height: metadata.autoOrient?.height || metadata.height,
    format: metadata.format,
    fingerprint: createHash('sha256').update(contents).digest('hex'),
  };
  return {
    ...template,
    regions: (await groupShirtRegionStore.get(template)) || [],
  };
}

async function inspectGroupShirtTemplatePaths(filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new TypeError('Cần chọn ít nhất một ảnh nền Group Shirt.');
  }
  const seen = new Set();
  const templates = [];
  for (const filePath of filePaths) {
    const template = await inspectGroupShirtTemplatePath(filePath);
    const key = shellPathKey(template.path);
    if (seen.has(key)) continue;
    seen.add(key);
    templates.push(template);
  }
  return templates;
}

async function inspectSingleMockupTemplatePath(filePath) {
  const resolvedPath = path.resolve(String(filePath));
  const extension = path.extname(resolvedPath).toLocaleLowerCase('en-US');
  if (!SINGLE_MOCKUP_TEMPLATE_EXTENSIONS.includes(extension)) {
    const error = new Error(`“${path.basename(resolvedPath)}” không phải định dạng ảnh mockup được hỗ trợ.`);
    error.code = 'UNSUPPORTED_SINGLE_MOCKUP_TEMPLATE';
    error.filePath = resolvedPath;
    throw error;
  }
  const [stat, metadata] = await Promise.all([fs.stat(resolvedPath), inspectImage(resolvedPath)]);
  if (!stat.isFile()) {
    const error = new Error(`Ảnh nền “${path.basename(resolvedPath)}” không phải file.`);
    error.code = 'INVALID_SINGLE_MOCKUP_TEMPLATE';
    error.filePath = resolvedPath;
    throw error;
  }
  if (!SUPPORTED_SINGLE_MOCKUP_FORMATS.has(metadata.format)) {
    const error = new Error(
      `Ảnh mockup “${path.basename(resolvedPath)}” không thuộc định dạng PNG, JPG, WEBP hoặc TIFF.`,
    );
    error.code = 'UNSUPPORTED_SINGLE_MOCKUP_TEMPLATE';
    error.filePath = resolvedPath;
    error.format = metadata.format;
    throw error;
  }
  const template = {
    path: resolvedPath,
    url: toFileUrl(resolvedPath),
    name: path.basename(resolvedPath),
    size: stat.size,
    width: metadata.autoOrient?.width || metadata.width,
    height: metadata.autoOrient?.height || metadata.height,
    format: metadata.format,
    density: metadata.density || null,
  };
  return {
    ...template,
    region: await singleMockupRegionStore.get(template),
  };
}

async function inspectSingleMockupTemplatePaths(filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new TypeError('Cần chọn ít nhất một ảnh nền mockup đơn.');
  }
  const seenPaths = new Set();
  const seenTemplateKeys = new Set();
  const templates = [];
  for (const filePath of filePaths) {
    const template = await inspectSingleMockupTemplatePath(filePath);
    const pathKey = shellPathKey(template.path);
    if (seenPaths.has(pathKey)) continue;
    seenPaths.add(pathKey);
    const templateKey = template.name.toLocaleLowerCase('en-US');
    if (seenTemplateKeys.has(templateKey)) {
      const error = new Error(
        `Có nhiều ảnh mockup đơn trùng tên “${template.name}”. Hãy đổi tên để vùng in được lưu riêng.`,
      );
      error.code = 'DUPLICATE_SINGLE_MOCKUP_TEMPLATE_KEY';
      error.filePath = template.path;
      throw error;
    }
    seenTemplateKeys.add(templateKey);
    templates.push(template);
  }
  return templates;
}

function validateGroupShirtSourcePayload(payload = {}, senderId = null) {
  if (!Array.isArray(payload.sourcePaths) || payload.sourcePaths.length === 0) {
    throw new TypeError('Cần chọn ít nhất một PNG Group Shirt.');
  }
  const sourcePaths = payload.sourcePaths.map((filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      const error = new TypeError('Đường dẫn PNG Group Shirt phải là đường dẫn tuyệt đối.');
      error.code = 'INVALID_GROUP_SHIRT_SOURCE_PATH';
      throw error;
    }
    const resolvedPath = path.resolve(filePath);
    if (path.extname(resolvedPath).toLocaleLowerCase('en-US') !== '.png') {
      const error = new TypeError(`“${path.basename(resolvedPath)}” không phải PNG.`);
      error.code = 'GROUP_SHIRT_SOURCE_NOT_PNG';
      throw error;
    }
    return resolvedPath;
  });
  if (senderId !== null) {
    assertAuthorizedPaths(
      authorizedSourcePaths,
      senderId,
      sourcePaths,
      'PNG Group Shirt',
    );
  }
  const directoryKeys = new Set(sourcePaths.map((filePath) => shellPathKey(path.dirname(filePath))));
  if (directoryKeys.size !== 1) {
    const error = new Error('Tất cả PNG Group Shirt phải nằm trong cùng một thư mục.');
    error.code = 'GROUP_SHIRT_MULTIPLE_SOURCE_DIRECTORIES';
    throw error;
  }
  const sourceDirectory = path.dirname(sourcePaths[0]);
  if (
    typeof payload.sourceDirectory !== 'string' ||
    shellPathKey(payload.sourceDirectory) !== shellPathKey(sourceDirectory)
  ) {
    const error = new Error('Thư mục nguồn Group Shirt không khớp với các PNG đã chọn.');
    error.code = 'GROUP_SHIRT_SOURCE_DIRECTORY_MISMATCH';
    throw error;
  }
  return { sourcePaths, sourceDirectory };
}

function validateAuthorizedGroupTemplatePaths(filePaths, senderId) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new TypeError('Cần chọn ít nhất một ảnh nền Group Shirt.');
  }
  const resolvedPaths = filePaths.map((filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      const error = new TypeError(
        'Đường dẫn ảnh nền Group Shirt phải là đường dẫn tuyệt đối.',
      );
      error.code = 'INVALID_GROUP_SHIRT_TEMPLATE_PATH';
      throw error;
    }
    return path.resolve(filePath);
  });
  assertAuthorizedPaths(
    authorizedGroupTemplatePaths,
    senderId,
    resolvedPaths,
    'Ảnh nền Group Shirt',
  );
  return resolvedPaths;
}

function validateAuthorizedSingleTemplatePaths(filePaths, senderId, options = {}) {
  if (!Array.isArray(filePaths) || (filePaths.length === 0 && options.allowEmpty !== true)) {
    throw new TypeError('Cần chọn ít nhất một ảnh nền mockup đơn.');
  }
  const resolvedPaths = filePaths.map((filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      const error = new TypeError('Đường dẫn ảnh nền mockup đơn phải là đường dẫn tuyệt đối.');
      error.code = 'INVALID_SINGLE_MOCKUP_TEMPLATE_PATH';
      throw error;
    }
    return path.resolve(filePath);
  });
  assertAuthorizedPaths(
    authorizedSingleTemplatePaths,
    senderId,
    resolvedPaths,
    'Ảnh nền mockup đơn',
  );
  return resolvedPaths;
}

async function preflightGroupSingleMockupSources(options = {}) {
  const { sourcePaths, sourceDirectory, isCancelled } = options;
  if (typeof isCancelled === 'function' && isCancelled()) {
    throw new GenerationCancelledError();
  }
  const lightSourceGroups = selectLightGroupShirtSourceGroups(sourcePaths);
  if (lightSourceGroups.length > 0) return lightSourceGroups;

  const existingPaths = await findExistingSingleMockupOutputs(
    path.join(sourceDirectory, 'Done'),
  );
  if (typeof isCancelled === 'function' && isCancelled()) {
    throw new GenerationCancelledError();
  }
  if (existingPaths.length > 0) {
    // generateSingleMockups performs the authoritative Done check again and
    // skips before validating this intentionally-empty source list.
    return [];
  }

  const error = new Error(
    'Tạo mockup đơn trong chế độ Group Shirt cần ít nhất một PNG áo sáng màu (.wh hoặc không có tag màu).',
  );
  error.code = 'NO_LIGHT_SINGLE_MOCKUP_SOURCES';
  throw error;
}

function cleanupSourceDirectories(senderId = null) {
  const authorizedSets = senderId === null
    ? [...authorizedSourcePaths.values()]
    : [authorizedSourcePaths.get(senderId)];
  const directories = new Set();
  for (const authorized of authorizedSets) {
    for (const filePath of authorized || []) directories.add(path.dirname(filePath));
  }
  return [...directories];
}

async function runAppCleanup(options = {}) {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async () => {
    if (inputBackupService) await inputBackupService.synchronize();
    if (printAreaStorageService) await printAreaStorageService.synchronize();
    const warnings = [];
    if (session.defaultSession && !session.defaultSession.isDestroyed?.()) {
      try {
        await session.defaultSession.clearCache();
      } catch (error) {
        warnings.push({
          path: app.getPath('userData'),
          message: error?.message || String(error),
        });
      }
    }
    const sourceDirectories = cleanupSourceDirectories(options.senderId ?? null);
    const result = await cleanupAppArtifacts({
      userDataPath: app.getPath('userData'),
      inputDirectory,
      printAreaDirectory,
      sourceDirectories,
      outputDirectories: sourceDirectories.map((directoryPath) => path.join(directoryPath, 'Done')),
    });
    result.warnings.unshift(...warnings);
    return result;
  })();
  try {
    return await cleanupPromise;
  } finally {
    cleanupPromise = null;
  }
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
  // BrowserWindow.webContents throws after the native window has emitted
  // `closed`. Capture the stable id while the window is alive so cleanup can
  // still remove per-window state without touching a destroyed wrapper.
  const windowWebContentsId = window.webContents.id;

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
            printRegionCornerScale: (() => {
              if (typeof printRegionResize?.resizeFromCorner !== 'function') return false;
              const resized = printRegionResize.resizeFromCorner(
                { centerX: 300, centerY: 300, width: 140, height: 160, rotation: 0 },
                'se', { x: 70, y: 80 }, { width: 1000, height: 1000 },
              );
              return resized.width === 210 && resized.height === 240 &&
                resized.centerX - resized.width / 2 === 230 &&
                resized.centerY - resized.height / 2 === 220;
            })(),
            metadataDefault: document.querySelector('#removeMetadata')?.checked === true,
            watermarkApi: typeof window.bundleApi?.selectWatermark === 'function',
            dropApi: typeof window.bundleApi?.inspectDroppedPngFiles === 'function' && typeof window.bundleApi?.getDroppedFilePath === 'function',
            inputApi: typeof window.bundleApi?.getInputAssets === 'function' && typeof window.bundleApi?.saveSingleMockupRegions === 'function',
            v121Controls: Boolean(document.querySelector('#createPdfDownload') && document.querySelector('#downloadUrl') && document.querySelector('#createSingleMockups') && document.querySelector('#editSingleMockupRegions')),
            v140Api: typeof window.bundleApi?.selectGroupShirtTemplates === 'function' && typeof window.bundleApi?.renameGroupShirtPngFiles === 'function' && typeof window.bundleApi?.saveGroupShirtRegions === 'function' && typeof window.bundleApi?.renderGroupShirtPreview === 'function' && typeof window.bundleApi?.generateGroupShirtMockups === 'function',
            v140Controls: Boolean(document.querySelector('#mockupModeBundle') && document.querySelector('#mockupModeGroup') && document.querySelector('#chooseGroupTemplatesButton') && document.querySelector('#renamePngButton') && document.querySelector('#addFrontRegionButton') && document.querySelector('#addBackRegionButton') && document.querySelector('#groupRegionColorLight') && document.querySelector('#groupRegionColorDark') && document.querySelector('#groupRegionGenderMale') && document.querySelector('#groupRegionGenderFemale') && document.querySelector('#renameGenderMale') && document.querySelector('#renameGenderFemale')),
            v1410Api: typeof window.bundleApi?.selectGroupSingleMockupTemplates === 'function' && typeof window.bundleApi?.saveGroupSingleMockupRegions === 'function' && typeof window.bundleApi?.cleanupAppData === 'function',
            v1410Controls: Boolean(document.querySelector('#chooseGroupSingleTemplatesButton') && document.querySelector('#cleanupDataButton')),
            v140SourceDirectory: typeof groupSourceDirectory === 'function' && groupSourceDirectory({ directory: 'C:/Group Source' }) === 'C:/Group Source',
            v142SharedMgs: typeof analyzeGroupShirtSetup === 'function' &&
              !analyzeGroupShirtSetup.toString().includes('templatesByGroup') &&
              !analyzeGroupShirtSetup.toString().includes('missingTemplateGroups') &&
              analyzeGroupShirtSetup.toString().includes('state.groupTemplates'),
            renameDialogActions: Boolean(document.querySelector('#renamePngApply') &&
              document.querySelector('#renamePngConfirm')?.textContent === 'Đổi tên và Đóng' &&
              document.querySelector('#renamePngCancel')?.textContent === 'Hủy'),
            renameSelectionOnly: typeof openRenamePngDialog === 'function' &&
              openRenamePngDialog.toString().includes('selected: new Set()') &&
              typeof selectedRenameFiles === 'function' &&
              applyRenamePngFiles.toString().includes('selectedRenameFiles()'),
            v140ModeSwitch: (() => {
              const bundle = document.querySelector('#mockupModeBundle');
              const group = document.querySelector('#mockupModeGroup');
              const bundlePanel = document.querySelector('#bundleTemplatePanel');
              const groupPanel = document.querySelector('#groupTemplatePanel');
              const pdfBlock = document.querySelector('#pdfOptionBlock');
              if (!bundle || !group || !bundlePanel || !groupPanel || !pdfBlock) return false;
              group.click();
              const groupVisible = group.checked && !bundle.checked &&
                bundlePanel.classList.contains('is-hidden') &&
                !groupPanel.classList.contains('is-hidden') &&
                !pdfBlock.classList.contains('is-hidden');
              bundle.click();
              const bundleVisible = bundle.checked && !group.checked &&
                !bundlePanel.classList.contains('is-hidden') &&
                groupPanel.classList.contains('is-hidden') &&
                !pdfBlock.classList.contains('is-hidden');
              return groupVisible && bundleVisible;
            })(),
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
    const key = windowWebContentsId;
    const job = activeJobs.get(key);
    if (job) job.cancelled = true;
    editorWindowStates.delete(key);
    authorizedSourcePaths.delete(key);
    authorizedGroupTemplatePaths.delete(key);
    authorizedSingleTemplatePaths.delete(key);
  });
  window.on('close', (event) => {
    const key = windowWebContentsId;
    if (windowsAllowedToClose.has(window)) {
      windowsAllowedToClose.delete(window);
      deferredCloseWindows.delete(key);
      return;
    }
    event.preventDefault();
    const job = activeJobs.get(key);
    if (job) job.cancelled = true;
    deferredCloseWindows.set(key, window);
    finishDeferredClose(key);
  });
  mainWindow = window;
  window.once('closed', () => {
    const key = windowWebContentsId;
    deferredCloseWindows.delete(key);
    closeConfirmations.delete(key);
    closingCleanupWindows.delete(key);
    editorWindowStates.delete(key);
    authorizedSourcePaths.delete(key);
    authorizedGroupTemplatePaths.delete(key);
    authorizedSingleTemplatePaths.delete(key);
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function closeWindowAfterWork(key, window) {
  if (
    window.isDestroyed() ||
    !deferredCloseWindows.has(key) ||
    closingCleanupWindows.has(key)
  ) return;
  closingCleanupWindows.add(key);
  runAppCleanup({ senderId: key }).catch((error) => {
    console.warn('APP_EXIT_CLEANUP_FAILED', error);
  }).finally(() => {
    closingCleanupWindows.delete(key);
    if (window.isDestroyed() || !deferredCloseWindows.has(key)) return;
    windowsAllowedToClose.add(window);
    setImmediate(() => {
      if (!window.isDestroyed() && deferredCloseWindows.has(key)) window.close();
    });
  });
}

function confirmDiscardEditorChanges(key, window) {
  if (closeConfirmations.has(key)) return;
  closeConfirmations.add(key);
  dialog.showMessageBox(window, {
    type: 'warning',
    title: 'Vùng in chưa được lưu',
    message: 'Bạn có thay đổi vùng in chưa được lưu.',
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
  if (activeJobs.has(key) || activeMutations.has(key)) {
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
    (updateInstallPending && options.allowDuringUpdateInstall !== true) ||
    activeJobs.has(key)
  ) {
    const error = new Error(
      activeJobs.has(key)
        ? 'Hãy chờ tác vụ tạo ảnh hiện tại hoàn tất trước khi thay đổi dữ liệu.'
        : 'Ứng dụng đang chuẩn bị đóng hoặc cài cập nhật. Không thể ghi dữ liệu mới.',
    );
    error.code = activeJobs.has(key) ? 'JOB_ALREADY_RUNNING' : 'APP_CLOSING';
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
        if (printAreaStorageService) await printAreaStorageService.synchronize();
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
      replaceAuthorizedPaths(
        authorizedSourcePaths,
        event.sender.id,
        files.map((file) => file.path),
      );
      await rememberPath(PATH_KEYS.SOURCE_FOLDER, folderPath);
      return {
        cancelled: false,
        folderPath,
        files,
      };
    }),
  );

  ipcMain.handle('source:inspect-dropped-png-files', (event, filePaths) =>
    safeCall(async () => {
      const result = await inspectDroppedPngFiles(filePaths, { inspectImage });
      addAuthorizedPaths(
        authorizedSourcePaths,
        event.sender.id,
        result.files.map((file) => file.path),
      );
      return result;
    }),
  );

  ipcMain.handle('source:clear-authorization', (event) =>
    safeCall(async () => {
      authorizedSourcePaths.delete(event.sender.id);
      return { cleared: true };
    }),
  );

  ipcMain.handle('source:rename-group-shirt-png-files', (event, payload = {}) =>
    safeCall(async () => {
      const mutation = beginMutation(event);
      try {
        if (!Array.isArray(payload.filePaths) || payload.filePaths.length === 0) {
          throw new TypeError('Hãy chọn ít nhất một PNG để đổi tên.');
        }
        assertAuthorizedPaths(
          authorizedSourcePaths,
          event.sender.id,
          payload.filePaths,
          'PNG cần đổi tên',
        );
        const beforeByPath = new Map();
        for (const filePath of payload.filePaths) {
          const inspected = await inspectPngPath(filePath);
          beforeByPath.set(shellPathKey(filePath), inspected);
        }
        const operations = payload.filePaths.map((filePath) => ({
          path: filePath,
          color: payload.color || null,
          side: payload.side || null,
          gender: payload.gender || null,
        }));
        const renamed = await applyGroupShirtRenamePlan(operations);
        const mappings = [];
        for (const item of renamed.renamed) {
          const before = beforeByPath.get(shellPathKey(item.from));
          const file = {
            ...before,
            path: item.to,
            directory: path.dirname(item.to),
            url: toFileUrl(item.to),
            name: path.basename(item.to),
          };
          mappings.push({ oldPath: item.from, file });
        }
        for (const item of renamed.unchanged) {
          mappings.push({
            oldPath: item.path,
            file: beforeByPath.get(shellPathKey(item.path)),
          });
        }
        const authorized = authorizedSourcePaths.get(event.sender.id) || new Set();
        for (const mapping of mappings) {
          authorized.delete(shellPathKey(mapping.oldPath));
          authorized.add(shellPathKey(mapping.file.path));
        }
        authorizedSourcePaths.set(event.sender.id, authorized);
        return { mappings };
      } finally {
        mutation.finish();
      }
    }),
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
        const templates = await listSingleMockupTemplates(inputDirectory, {
          ignoreInvalid: true,
          templateMarker: 'bundle',
        });
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
        if (printAreaStorageService) await printAreaStorageService.synchronize();
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

  ipcMain.handle('group-shirt:save-single-mockup-regions', (event, entries) =>
    safeCall(async () => {
      const mutation = beginMutation(event);
      try {
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new TypeError('Danh sách vùng in mockup đơn Group Shirt không hợp lệ.');
        }
        const templatePaths = validateAuthorizedSingleTemplatePaths(
          entries.map((entry) => entry?.templatePath),
          event.sender.id,
        );
        const templates = await inspectSingleMockupTemplatePaths(templatePaths);
        if (templates.length !== entries.length) {
          throw new Error('Hãy thiết lập vùng in cho toàn bộ ảnh mockup đơn đã chọn.');
        }
        const templatesByPath = new Map(templates.map((template) => [
          shellPathKey(template.path),
          template,
        ]));
        const safeEntries = entries.map((entry) => {
          const template = templatesByPath.get(shellPathKey(entry.templatePath));
          if (!template) {
            throw new Error(`Không tìm thấy ảnh mockup đơn “${path.basename(entry?.templatePath || '')}”.`);
          }
          return { template, region: entry.region };
        });
        await singleMockupRegionStore.replaceAll(safeEntries);
        if (printAreaStorageService) await printAreaStorageService.synchronize();
        const refreshedTemplates = await Promise.all(templates.map(async (template) => ({
          ...template,
          region: await singleMockupRegionStore.get(template),
        })));
        const editorState = editorWindowStates.get(event.sender.id);
        if (editorState) editorWindowStates.set(event.sender.id, { ...editorState, dirty: false });
        return { templates: refreshedTemplates };
      } finally {
        mutation.finish();
      }
    }),
  );

  ipcMain.handle('group-shirt:save-regions', (event, entries) =>
    safeCall(async () => {
      const mutation = beginMutation(event);
      try {
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new TypeError('Danh sách vùng in Group Shirt không hợp lệ.');
        }
        const templatePaths = entries.map((entry) => entry?.templatePath);
        assertAuthorizedPaths(
          authorizedGroupTemplatePaths,
          event.sender.id,
          templatePaths,
          'Ảnh nền Group Shirt',
        );
        const safeEntries = [];
        for (const entry of entries) {
          const template = await inspectGroupShirtTemplatePath(entry?.templatePath);
          safeEntries.push({ template, regions: entry?.regions });
        }
        await groupShirtRegionStore.replaceAll(safeEntries);
        if (printAreaStorageService) await printAreaStorageService.synchronize();
        const templates = await Promise.all(safeEntries.map(async (entry) => ({
          ...entry.template,
          regions: (await groupShirtRegionStore.get(entry.template)) || [],
        })));
        const editorState = editorWindowStates.get(event.sender.id);
        if (editorState) editorWindowStates.set(event.sender.id, { ...editorState, dirty: false });
        return { templates };
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

  ipcMain.handle('dialog:select-group-shirt-templates', (event) =>
    safeCall(async () => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const defaultPath = await getRememberedDialogPath(PATH_KEYS.GROUP_TEMPLATE_FILE);
      const result = await dialog.showOpenDialog(owner, {
        title: 'Chọn ảnh nền Mockup Group Shirt',
        properties: ['openFile', 'multiSelections'],
        ...(defaultPath ? { defaultPath } : {}),
        filters: [
          { name: 'Ảnh nền mgs', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'] },
          { name: 'Tất cả file', extensions: ['*'] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
      const templates = await inspectGroupShirtTemplatePaths(result.filePaths);
      replaceAuthorizedPaths(
        authorizedGroupTemplatePaths,
        event.sender.id,
        templates.map((template) => template.path),
      );
      await rememberPath(PATH_KEYS.GROUP_TEMPLATE_FILE, result.filePaths[0]);
      return { cancelled: false, templates };
    }),
  );

  ipcMain.handle('dialog:select-group-single-mockup-templates', (event) =>
    safeCall(async () => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const defaultPath = await getRememberedDialogPath(PATH_KEYS.GROUP_SINGLE_TEMPLATE_FILE);
      const result = await dialog.showOpenDialog(owner, {
        title: 'Chọn ảnh nền mockup đơn cho Group Shirt',
        properties: ['openFile', 'multiSelections'],
        ...(defaultPath ? { defaultPath } : {}),
        filters: [
          { name: 'Ảnh mockup đơn', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'] },
          { name: 'Tất cả file', extensions: ['*'] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
      const templates = await inspectSingleMockupTemplatePaths(result.filePaths);
      replaceAuthorizedPaths(
        authorizedSingleTemplatePaths,
        event.sender.id,
        templates.map((template) => template.path),
      );
      await rememberPath(PATH_KEYS.GROUP_SINGLE_TEMPLATE_FILE, result.filePaths[0]);
      return { cancelled: false, templates };
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
      if (payload?.mode && payload.mode !== 'bundle') {
        const error = new Error('Hãy dùng luồng preview Mockup Group Shirt cho chế độ đã chọn.');
        error.code = 'INVALID_MOCKUP_MODE';
        throw error;
      }
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

  ipcMain.handle('group-shirt:preview', (event, payload = {}) =>
    safeCall(async () => {
      if (payload?.mode && payload.mode !== 'group-shirt') {
        const error = new Error('Sai chế độ preview Mockup Group Shirt.');
        error.code = 'INVALID_MOCKUP_MODE';
        throw error;
      }
      const jobControl = beginJob(event, 'preview');
      try {
        const { sourcePaths, sourceDirectory } = validateGroupShirtSourcePayload(
          payload,
          event.sender.id,
        );
        const templatePaths = validateAuthorizedGroupTemplatePaths(
          payload.templatePaths,
          event.sender.id,
        );
        const templates = await inspectGroupShirtTemplatePaths(templatePaths);
        const result = await renderGroupShirtPreview({
          sourcePaths,
          sourceDirectory,
          templates,
          settings: payload.settings,
          watermarkPath: payload.watermarkPath || null,
          pageIndex: payload.pageIndex,
          isCancelled: () => jobControl.job.cancelled,
          onProgress: jobControl.sendProgress,
        });
        const activeTemplate = templates.find(
          (template) => shellPathKey(template.path) === shellPathKey(result.template.path),
        );
        return {
          ...result,
          buffer: undefined,
          dataUrl: `data:image/png;base64,${result.buffer.toString('base64')}`,
          sourceCount: result.assignmentCount,
          regionCount: activeTemplate?.regions.length || result.assignmentCount,
        };
      } finally {
        jobControl.finish();
      }
    }),
  );

  ipcMain.handle('group-shirt:generate', (event, payload = {}) =>
    safeCall(async () => {
      if (payload?.mode && payload.mode !== 'group-shirt') {
        const error = new Error('Sai chế độ tạo Mockup Group Shirt.');
        error.code = 'INVALID_MOCKUP_MODE';
        throw error;
      }
      const jobControl = beginJob(event, 'generate');
      const createdPaths = [];
      try {
        const { sourcePaths, sourceDirectory } = validateGroupShirtSourcePayload(
          payload,
          event.sender.id,
        );
        const templatePaths = validateAuthorizedGroupTemplatePaths(
          payload.templatePaths,
          event.sender.id,
        );
        const createSingleMockups = payload?.createSingleMockups === true;
        const createPdfDownload = payload?.createPdfDownload === true;
        const singleTemplatePaths = createSingleMockups
          ? validateAuthorizedSingleTemplatePaths(
              payload?.singleTemplatePaths || [],
              event.sender.id,
              { allowEmpty: true },
            )
          : [];
        const lightSourceGroups = createSingleMockups
          ? await preflightGroupSingleMockupSources({
              sourcePaths,
              sourceDirectory,
              isCancelled: () => jobControl.job.cancelled,
            })
          : null;
        const templates = await inspectGroupShirtTemplatePaths(templatePaths);
        const singleTemplates = singleTemplatePaths.length > 0
          ? await inspectSingleMockupTemplatePaths(singleTemplatePaths)
          : [];
        if ((createSingleMockups || createPdfDownload) && inputBackupService) {
          await inputBackupService.synchronize();
        }
        const groupEnd = createSingleMockups
          ? (createPdfDownload ? 0.68 : 0.78)
          : (createPdfDownload ? 0.86 : 1);
        const singleEnd = createPdfDownload ? 0.92 : 1;
        const result = await generateGroupShirtMockups({
          sourcePaths,
          sourceDirectory,
          templates,
          settings: payload.settings,
          watermarkPath: payload.watermarkPath || null,
          removeMetadata: payload.removeMetadata !== false,
          isCancelled: () => jobControl.job.cancelled,
          onProgress: scaledProgress(jobControl.sendProgress, 0, groupEnd),
        });
        createdPaths.push(...result.outputPaths);
        allowShellPath(result.outputDir);
        if (jobControl.job.cancelled) throw new GenerationCancelledError();

        let singleResult = null;
        if (createSingleMockups) {
          singleResult = await generateSingleMockups({
            sourceGroups: lightSourceGroups,
            templates: singleTemplates,
            outputDirectory: result.outputDir,
            regionStore: singleMockupRegionStore,
            settings: payload.settings,
            alphaThreshold: payload.settings?.alphaThreshold,
            watermarkPath: payload.watermarkPath || null,
            removeMetadata: payload.removeMetadata !== false,
            isCancelled: () => jobControl.job.cancelled,
            onProgress: scaledProgress(jobControl.sendProgress, groupEnd, singleEnd),
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
            inputDirectory,
            outputDirectory: result.outputDir,
            downloadUrl: payload?.downloadUrl,
            isCancelled: () => jobControl.job.cancelled,
          });
          if (!pdfResult.skipped) createdPaths.push(pdfResult.outputPath);
          if (jobControl.job.cancelled) throw new GenerationCancelledError();
          jobControl.sendProgress({
            fraction: 1,
            message: pdfResult.skipped
              ? 'Đã bỏ qua PDF Download vì thư mục Done đã có file PDF.'
              : 'Đã tạo xong Group Shirt và các file bổ sung.',
            stage: 'complete',
          });
        }

        const outputFiles = result.outputs.map((output) => ({
          path: output.path,
          url: toFileUrl(output.path),
          name: output.name,
          width: output.template.width,
          height: output.template.height,
          templateName: output.template.name,
          groupKey: output.groupKey,
          color: output.color,
          sourceCount: output.assignmentCount,
          regionCount: templates.find(
            (template) => shellPathKey(template.path) === shellPathKey(output.template.path),
          )?.regions.length || output.assignmentCount,
        }));
        return {
          ...result,
          mode: 'group-shirt',
          outputFiles,
          assignedSourceCount: result.outputs.reduce(
            (total, output) => total + output.assignmentCount,
            0,
          ),
          singleMockupFiles: (singleResult?.outputPaths || []).map((filePath) => ({
            path: filePath,
            url: toFileUrl(filePath),
            name: path.basename(filePath),
          })),
          singleMockupCount: singleResult?.outputPaths.length || 0,
          singleMockupSkipped: singleResult?.skipped
            ? {
                reason: singleResult.skipReason,
                existingNames: (singleResult.existingPaths || []).map((filePath) => path.basename(filePath)),
              }
            : null,
          pdfDownload: pdfResult && !pdfResult.skipped
            ? {
                ...pdfResult,
                path: pdfResult.outputPath,
                url: toFileUrl(pdfResult.outputPath),
                name: path.basename(pdfResult.outputPath),
                outputPath: undefined,
              }
            : null,
          pdfDownloadSkipped: pdfResult?.skipped
            ? {
                reason: pdfResult.skipReason,
                existingName: path.basename(pdfResult.existingPath || pdfResult.outputPath),
              }
            : null,
          outputPaths: undefined,
          outputs: undefined,
        };
      } catch (error) {
        await Promise.allSettled(createdPaths.map((filePath) => fs.rm(filePath, { force: true })));
        throw error;
      } finally {
        jobControl.finish();
      }
    }),
  );

  ipcMain.handle('mockup:generate', (event, payload) =>
    safeCall(async () => {
      if (payload?.mode && payload.mode !== 'bundle') {
        const error = new Error('Hãy dùng luồng tạo Mockup Group Shirt cho chế độ đã chọn.');
        error.code = 'INVALID_MOCKUP_MODE';
        throw error;
      }
      const jobControl = beginJob(event, 'generate');
      const createdPaths = [];
      try {
        const createPdfDownload = payload?.createPdfDownload === true;
        const createSingleMockups = payload?.createSingleMockups === true;
        if ((createPdfDownload || createSingleMockups) && inputBackupService) {
          await inputBackupService.synchronize();
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
            templateMarker: 'bundle',
            outputDirectory: result.outputDir,
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
            inputDirectory,
            outputDirectory: result.outputDir,
            downloadUrl: payload?.downloadUrl,
            isCancelled: () => jobControl.job.cancelled,
          });
          if (!pdfResult.skipped) createdPaths.push(pdfResult.outputPath);
          if (jobControl.job.cancelled) throw new GenerationCancelledError();
          jobControl.sendProgress({
            fraction: 1,
            message: pdfResult.skipped
              ? 'Đã bỏ qua PDF Download vì thư mục Done đã có file PDF.'
              : 'Đã tạo xong mockup và các file bổ sung.',
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
          singleMockupSkipped: singleResult?.skipped
            ? {
                reason: singleResult.skipReason,
                existingNames: (singleResult.existingPaths || []).map((filePath) =>
                  path.basename(filePath)),
              }
            : null,
          pdfDownload: pdfResult && !pdfResult.skipped
            ? {
                ...pdfResult,
                path: pdfResult.outputPath,
                url: toFileUrl(pdfResult.outputPath),
                name: path.basename(pdfResult.outputPath),
                outputPath: undefined,
              }
            : null,
          pdfDownloadSkipped: pdfResult?.skipped
            ? {
                reason: pdfResult.skipReason,
                existingName: path.basename(pdfResult.existingPath || pdfResult.outputPath),
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

  ipcMain.handle('maintenance:cleanup', (event) =>
    safeCall(async () => {
      const mutation = beginMutation(event);
      try {
        const owner = BrowserWindow.fromWebContents(event.sender);
        const confirmation = await dialog.showMessageBox(owner, {
          type: 'warning',
          title: 'Xóa dữ liệu rác',
          message: 'Xóa cache và các file tạm do PNG Bundle Mockup tạo?',
          detail:
            'Thao tác này không xóa ảnh trong Input, file JSON trong Print Area, ảnh nền đã chọn, kết quả trong Done hoặc cài đặt đường dẫn.',
          buttons: ['Hủy', 'Xóa dữ liệu rác'],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
        });
        if (confirmation.response !== 1) return { cancelled: true };
        return {
          cancelled: false,
          ...(await runAppCleanup({ senderId: event.sender.id })),
        };
      } finally {
        mutation.finish();
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
    printAreaDirectory = resolvePrintAreaDirectory({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      executablePath: app.getPath('exe'),
    });
    await ensurePrintAreaDirectory(printAreaDirectory);
    inputBackupService = createInputBackupService({
      inputDirectory,
      userDataPath,
    });
    printAreaStorageService = createPrintAreaStorageService({
      printAreaDirectory,
      userDataPath,
    });
    allowShellPath(inputDirectory);
    const inputSync = await inputBackupService.synchronize();
    if (inputSync.action === 'restored') {
      console.info('INPUT_BACKUP_RESTORED', inputSync.backupDirectory);
    }
    const printAreaSync = await printAreaStorageService.synchronize();
    if (printAreaSync.action === 'restored' || printAreaSync.action === 'migrated') {
      console.info('PRINT_AREA_STORAGE_SYNCED', printAreaSync.action, printAreaSync.printAreaDirectory);
    }
  } catch (error) {
    console.error('MUTABLE_STORAGE_STARTUP_FAILED', error);
    if (syncInputBackupOnly) {
      app.exit(2);
      return;
    }
    try {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Không thể khởi động PNG Bundle Mockup',
        message: 'Ứng dụng không thể ghi hoặc bảo vệ thư mục Input/Print Area.',
        detail: `${error?.message || error}\n\nHãy cài ứng dụng cho tài khoản hiện tại vào thư mục có quyền ghi rồi mở lại.`,
        buttons: ['Đóng ứng dụng'],
        defaultId: 0,
        noLink: true,
      });
    } catch (dialogError) {
      console.error('MUTABLE_STORAGE_STARTUP_DIALOG_FAILED', dialogError);
    }
    app.quit();
    return;
  }
  if (syncInputBackupOnly) {
    app.exit(0);
    return;
  }
  singleMockupRegionStore = createSingleMockupRegionStore({
    storageDirectory: printAreaDirectory,
    onWarning: (error) => console.warn('SINGLE_MOCKUP_REGIONS_LOAD', error),
  });
  groupShirtRegionStore = createGroupShirtRegionStore({
    storageDirectory: printAreaDirectory,
    onWarning: (error) => console.warn('GROUP_SHIRT_REGIONS_LOAD', error),
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
  // still using mutable Input/Print Area data. A regular second launch can
  // exit quietly because the primary instance receives the event below.
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
