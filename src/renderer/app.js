'use strict';

const api = window.bundleApi;

const elements = {
  appTitle: document.querySelector('#appTitle'),
  appStatus: document.querySelector('#appStatus'),
  checkUpdateButton: document.querySelector('#checkUpdateButton'),
  controlsPanel: document.querySelector('#controlsPanel'),
  chooseFolderButton: document.querySelector('#chooseFolderButton'),
  sourcePath: document.querySelector('#sourcePath'),
  fileSearch: document.querySelector('#fileSearch'),
  selectAllButton: document.querySelector('#selectAllButton'),
  selectNoneButton: document.querySelector('#selectNoneButton'),
  fileList: document.querySelector('#fileList'),
  selectionCount: document.querySelector('#selectionCount'),
  selectionHint: document.querySelector('#selectionHint'),
  chooseTemplateButton: document.querySelector('#chooseTemplateButton'),
  templateThumb: document.querySelector('#templateThumb'),
  templateName: document.querySelector('#templateName'),
  templateMeta: document.querySelector('#templateMeta'),
  removeMetadata: document.querySelector('#removeMetadata'),
  metadataGroups: document.querySelector('#metadataGroups'),
  useWatermark: document.querySelector('#useWatermark'),
  watermarkFile: document.querySelector('#watermarkFile'),
  watermarkThumb: document.querySelector('#watermarkThumb'),
  watermarkName: document.querySelector('#watermarkName'),
  watermarkMeta: document.querySelector('#watermarkMeta'),
  inputAssetSummary: document.querySelector('#inputAssetSummary'),
  openInputFolderButton: document.querySelector('#openInputFolderButton'),
  createPdfDownload: document.querySelector('#createPdfDownload'),
  pdfDownloadFields: document.querySelector('#pdfDownloadFields'),
  downloadUrl: document.querySelector('#downloadUrl'),
  pdfTemplateSummary: document.querySelector('#pdfTemplateSummary'),
  createSingleMockups: document.querySelector('#createSingleMockups'),
  singleMockupSummary: document.querySelector('#singleMockupSummary'),
  editSingleMockupRegions: document.querySelector('#editSingleMockupRegions'),
  saveSingleMockupRegions: document.querySelector('#saveSingleMockupRegions'),
  singleRegionStatus: document.querySelector('#singleRegionStatus'),
  mockupCount: document.querySelector('#mockupCount'),
  gap: document.querySelector('#gap'),
  topMargin: document.querySelector('#topMargin'),
  bottomMargin: document.querySelector('#bottomMargin'),
  sideMargin: document.querySelector('#sideMargin'),
  alphaThreshold: document.querySelector('#alphaThreshold'),
  advancedSettings: document.querySelector('#advancedSettings'),
  distribution: document.querySelector('#distribution'),
  previewButton: document.querySelector('#previewButton'),
  generateButton: document.querySelector('#generateButton'),
  cancelButton: document.querySelector('#cancelButton'),
  openOutputButton: document.querySelector('#openOutputButton'),
  previewTitle: document.querySelector('#previewTitle'),
  pageNavigation: document.querySelector('#pageNavigation'),
  previousPageButton: document.querySelector('#previousPageButton'),
  nextPageButton: document.querySelector('#nextPageButton'),
  pageLabel: document.querySelector('#pageLabel'),
  previewStage: document.querySelector('#previewStage'),
  previewPlaceholder: document.querySelector('#previewPlaceholder'),
  imageFrame: document.querySelector('#imageFrame'),
  previewImage: document.querySelector('#previewImage'),
  safeZone: document.querySelector('#safeZone'),
  printRegion: document.querySelector('#printRegion'),
  workingOverlay: document.querySelector('#workingOverlay'),
  workingTitle: document.querySelector('#workingTitle'),
  workingMessage: document.querySelector('#workingMessage'),
  progressFill: document.querySelector('#progressFill'),
  progressMessage: document.querySelector('#progressMessage'),
  statSelected: document.querySelector('#statSelected'),
  statTemplate: document.querySelector('#statTemplate'),
  statLayout: document.querySelector('#statLayout'),
  statOutput: document.querySelector('#statOutput'),
  toastRegion: document.querySelector('#toastRegion'),
  sourcePickerDialog: document.querySelector('#sourcePickerDialog'),
  sourcePickerPath: document.querySelector('#sourcePickerPath'),
  sourcePickerClose: document.querySelector('#sourcePickerClose'),
  sourcePickerSearch: document.querySelector('#sourcePickerSearch'),
  sourcePickerSelectAll: document.querySelector('#sourcePickerSelectAll'),
  sourcePickerSelectNone: document.querySelector('#sourcePickerSelectNone'),
  sourcePickerGrid: document.querySelector('#sourcePickerGrid'),
  sourcePickerCount: document.querySelector('#sourcePickerCount'),
  sourcePickerCancel: document.querySelector('#sourcePickerCancel'),
  sourcePickerConfirm: document.querySelector('#sourcePickerConfirm'),
  resultDialog: document.querySelector('#resultDialog'),
  dialogTitle: document.querySelector('#dialogTitle'),
  dialogMessage: document.querySelector('#dialogMessage'),
  dialogDetails: document.querySelector('#dialogDetails'),
  dialogOpenFolder: document.querySelector('#dialogOpenFolder'),
  updateDialog: document.querySelector('#updateDialog'),
  updateIcon: document.querySelector('#updateIcon'),
  updateTitle: document.querySelector('#updateTitle'),
  updateMessage: document.querySelector('#updateMessage'),
  updateVersion: document.querySelector('#updateVersion'),
  updateDownload: document.querySelector('#updateDownload'),
  updateProgressFill: document.querySelector('#updateProgressFill'),
  updateProgressText: document.querySelector('#updateProgressText'),
  updateCloseButton: document.querySelector('#updateCloseButton'),
  updatePrimaryButton: document.querySelector('#updatePrimaryButton'),
};

const settingInputs = [
  elements.mockupCount,
  elements.gap,
  elements.topMargin,
  elements.bottomMargin,
  elements.sideMargin,
  elements.alphaThreshold,
];

const state = {
  appInfo: null,
  update: null,
  sourceDirectory: null,
  sourceDirectories: new Set(),
  files: [],
  selected: new Set(),
  template: null,
  watermark: null,
  sourcePicker: null,
  folderScanning: false,
  dropScanning: false,
  busy: false,
  busyType: null,
  display: null,
  viewMode: 'empty',
  pageIndex: 0,
  pageCount: 1,
  previewLayout: null,
  output: null,
  inputAssets: {
    inputDirectory: null,
    pdfTemplates: [],
    singleMockupTemplates: [],
    warnings: [],
  },
  inputAssetsLoaded: false,
  inputAssetsLoading: false,
  inputAssetsSaving: false,
  regionEditor: null,
};

async function initializeAppInfo() {
  try {
    const info = unwrap(await api.getAppInfo());
    state.appInfo = info;
    elements.appTitle.textContent = info.displayName;
    document.title = info.displayName;
    elements.checkUpdateButton.title = info.updateSupported
      ? 'Kiểm tra bản cập nhật mới'
      : 'Cập nhật online khả dụng trong bản cài Windows';
    const updateStatus = unwrap(await api.getUpdateStatus());
    renderUpdateStatus(updateStatus);
  } catch (error) {
    console.warn('Không thể đọc thông tin phiên bản.', error);
  }
}

function normalizePath(filePath) {
  return String(filePath || '').toLocaleLowerCase();
}

function isTemplateFile(file) {
  return Boolean(state.template && normalizePath(file.path) === normalizePath(state.template.path));
}

function isWatermarkFile(file) {
  return Boolean(
    elements.useWatermark.checked &&
    state.watermark &&
    normalizePath(file.path) === normalizePath(state.watermark.path)
  );
}

function unwrap(response) {
  if (response?.ok) return response.data;
  const error = new Error(response?.error?.message || 'Ứng dụng không nhận được phản hồi hợp lệ.');
  Object.assign(error, response?.error || {});
  throw error;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function readDownloadUrl(markInvalid = true) {
  const rawValue = elements.downloadUrl.value.trim();
  let normalized = null;
  try {
    if (!rawValue) throw new Error('Hãy nhập link tải cho file PDF Download.');
    const parsed = new URL(rawValue);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Link tải PDF chỉ hỗ trợ HTTP hoặc HTTPS.');
    }
    normalized = parsed.href;
    if (normalized.length > 2048) {
      throw new Error('Link tải PDF không được vượt quá 2048 ký tự.');
    }
  } catch (error) {
    if (markInvalid) elements.downloadUrl.classList.add('is-invalid');
    if (error instanceof TypeError) throw new Error('Link tải PDF không hợp lệ.');
    throw error;
  }
  if (markInvalid) elements.downloadUrl.classList.remove('is-invalid');
  return normalized;
}

function templatesMissingRegions() {
  return state.inputAssets.singleMockupTemplates.filter((template) => !template.region);
}

function renderInputAssets() {
  const {
    inputDirectory,
    pdfTemplates,
    singleMockupTemplates,
    warnings = [],
  } = state.inputAssets;
  const pdfCount = pdfTemplates.length;
  const singleCount = singleMockupTemplates.length;
  const configuredCount = singleMockupTemplates.filter((template) => template.region).length;
  elements.inputAssetSummary.title = inputDirectory || '';

  if (!state.inputAssetsLoaded && state.inputAssetsLoading) {
    elements.inputAssetSummary.textContent = 'Đang kiểm tra PDF và ảnh mockup đơn…';
  } else if (!state.inputAssetsLoaded) {
    elements.inputAssetSummary.textContent = 'Chưa đọc được thư mục Input.';
  } else {
    const warningSuffix = warnings.length > 0 ? ` · ${warnings.length} ảnh lỗi` : '';
    elements.inputAssetSummary.textContent =
      `${pdfCount} PDF · ${singleCount} ảnh mockup đơn${warningSuffix}`;
  }

  if (pdfCount === 0) {
    elements.pdfTemplateSummary.textContent = 'Chưa tìm thấy PDF mẫu trong Input.';
  } else if (pdfCount === 1) {
    const template = pdfTemplates[0];
    elements.pdfTemplateSummary.textContent = `${template.name} · ${formatBytes(template.size)}`;
  } else {
    elements.pdfTemplateSummary.textContent = `Có ${pdfCount} PDF. Hãy chỉ giữ lại 1 file PDF mẫu trong Input.`;
  }

  if (singleCount === 0) {
    elements.singleMockupSummary.textContent = warnings.length > 0
      ? `Không có ảnh mockup hợp lệ. Ảnh lỗi: ${warnings.map((item) => item.name).join(', ')}.`
      : 'Chưa có ảnh mockup đơn trong Input.';
  } else {
    const names = singleMockupTemplates.slice(0, 3).map((template) => template.name).join(', ');
    const remainder = singleCount > 3 ? ` và ${singleCount - 3} ảnh khác` : '';
    elements.singleMockupSummary.textContent =
      `${singleCount} ảnh · đã thiết lập ${configuredCount}/${singleCount}: ${names}${remainder}.`;
    if (warnings.length > 0) {
      elements.singleMockupSummary.textContent +=
        ` Đã bỏ qua ${warnings.length} ảnh lỗi: ${warnings.map((item) => item.name).join(', ')}.`;
    }
  }

  if (!state.regionEditor) {
    elements.singleRegionStatus.textContent = singleCount === 0
      ? 'Thêm ảnh mockup đơn vào Input để thiết lập vùng in.'
      : configuredCount === singleCount
        ? `Đã lưu vùng in cho ${singleCount}/${singleCount} ảnh mockup.`
        : `Còn ${singleCount - configuredCount} ảnh chưa có vùng in.`;
  }

  elements.pdfDownloadFields.classList.toggle('is-hidden', !elements.createPdfDownload.checked);
  updateControls();
}

async function refreshInputAssets({ silent = false } = {}) {
  if (state.inputAssetsLoading || state.inputAssetsSaving || state.regionEditor) return null;
  state.inputAssetsLoading = true;
  renderInputAssets();
  try {
    state.inputAssets = unwrap(await api.getInputAssets());
    state.inputAssetsLoaded = true;
    renderInputAssets();
    return state.inputAssets;
  } catch (error) {
    if (!state.inputAssetsLoaded) renderInputAssets();
    if (!silent) showError(error);
    return null;
  } finally {
    state.inputAssetsLoading = false;
    renderInputAssets();
  }
}

async function openInputFolder() {
  if (state.busy || state.inputAssetsLoading || state.inputAssetsSaving || state.regionEditor) return;
  if (!state.inputAssets.inputDirectory) await refreshInputAssets();
  if (!state.inputAssets.inputDirectory) return;
  try {
    unwrap(await api.openPath(state.inputAssets.inputDirectory));
  } catch (error) {
    showError(error);
  }
}

function readAdditionalGenerationOptions() {
  const options = {
    createPdfDownload: elements.createPdfDownload.checked,
    downloadUrl: null,
    createSingleMockups: elements.createSingleMockups.checked,
  };
  if (options.createPdfDownload) {
    // Main checks Done first. If a PDF already exists, it can skip without
    // requiring a template or URL; otherwise the PDF service validates both.
    options.downloadUrl = elements.downloadUrl.value.trim();
  } else {
    elements.downloadUrl.classList.remove('is-invalid');
  }
  // Main checks Done before validating Input/regions. This allows a repeated
  // run to skip single mockups without requiring templates that are no longer present.
  return options;
}

function showUpdateDialog() {
  if (!elements.updateDialog.open && typeof elements.updateDialog.showModal === 'function') {
    elements.updateDialog.showModal();
  }
}

function setUpdateIcon(symbol, className = '') {
  elements.updateIcon.textContent = symbol;
  elements.updateIcon.className = `update-icon${className ? ` ${className}` : ''}`;
}

function updateInstallBlocked() {
  return Boolean(
    state.busy || state.inputAssetsLoading || state.inputAssetsSaving || state.regionEditor,
  );
}

function setUpdatePrimary(label, action, { disabled = false, hidden = false } = {}) {
  elements.updatePrimaryButton.textContent = label;
  elements.updatePrimaryButton.dataset.action = action;
  elements.updatePrimaryButton.disabled = disabled || (action === 'install' && updateInstallBlocked());
  elements.updatePrimaryButton.classList.toggle('is-hidden', hidden);
}

function setUpdateHeader(label = 'Cập nhật', disabled = false) {
  elements.checkUpdateButton.textContent = label;
  elements.checkUpdateButton.disabled = disabled;
}

function renderUpdateStatus(update, { forceOpen = false } = {}) {
  if (!update?.status) return;
  state.update = update;
  const currentVersion = update.currentVersion || state.appInfo?.version || '';
  const nextVersion = update.version || '';
  const versionSummary = nextVersion && nextVersion !== currentVersion
    ? `Phiên bản hiện tại: v${currentVersion}  →  Phiên bản mới: v${nextVersion}`
    : `Phiên bản hiện tại: v${currentVersion}`;

  elements.updateDownload.classList.add('is-hidden');
  elements.updateCloseButton.classList.remove('is-hidden');
  elements.updateCloseButton.textContent = 'Để sau';
  elements.updateProgressFill.style.width = '0%';
  elements.updateProgressText.textContent = '0%';

  if (update.status === 'disabled') {
    setUpdateHeader('Cập nhật');
    return;
  }

  if (update.status === 'idle') {
    setUpdateHeader('Cập nhật');
    return;
  }

  if (update.status === 'checking') {
    setUpdateHeader('Đang kiểm tra…', true);
    setUpdateIcon('↻', 'is-spinning');
    elements.updateTitle.textContent = 'Đang kiểm tra cập nhật';
    elements.updateMessage.textContent = 'App đang kết nối với GitHub Releases.';
    elements.updateVersion.textContent = versionSummary;
    setUpdatePrimary('Đang kiểm tra…', 'none', { disabled: true });
    if (forceOpen || update.manual) showUpdateDialog();
    return;
  }

  if (update.status === 'available') {
    setUpdateHeader(`Có v${nextVersion || 'mới'}`);
    setUpdateIcon('↓');
    elements.updateTitle.textContent = 'Có phiên bản mới';
    elements.updateMessage.textContent = 'Bạn có thể tải bản cập nhật ngay trong app. Công việc hiện tại sẽ không bị đóng cho đến khi bạn chọn cài đặt.';
    elements.updateVersion.textContent = versionSummary;
    setUpdatePrimary('Tải cập nhật', 'download');
    showUpdateDialog();
    return;
  }

  if (update.status === 'downloading') {
    const percent = Math.max(0, Math.min(100, Number(update.progress?.percent) || 0));
    const speed = Number(update.progress?.bytesPerSecond) > 0
      ? ` · ${formatBytes(update.progress.bytesPerSecond)}/s`
      : '';
    setUpdateHeader(`Đang tải ${Math.round(percent)}%`, true);
    setUpdateIcon('↓');
    elements.updateTitle.textContent = 'Đang tải bản cập nhật';
    elements.updateMessage.textContent = `Vui lòng giữ app đang mở${speed}.`;
    elements.updateVersion.textContent = versionSummary;
    elements.updateDownload.classList.remove('is-hidden');
    elements.updateProgressFill.style.width = `${percent}%`;
    elements.updateProgressText.textContent = `${Math.round(percent)}%`;
    elements.updateCloseButton.textContent = 'Ẩn cửa sổ';
    setUpdatePrimary('Đang tải…', 'none', { disabled: true });
    showUpdateDialog();
    return;
  }

  if (update.status === 'downloaded') {
    setUpdateHeader(`Cài v${nextVersion || 'mới'}`);
    setUpdateIcon('✓', 'is-success');
    elements.updateTitle.textContent = 'Bản cập nhật đã sẵn sàng';
    elements.updateMessage.textContent = 'Lưu công việc nếu cần, sau đó khởi động lại để hoàn tất cập nhật.';
    elements.updateVersion.textContent = versionSummary;
    setUpdatePrimary('Khởi động lại và cài đặt', 'install');
    showUpdateDialog();
    return;
  }

  if (update.status === 'up-to-date') {
    setUpdateHeader('Đã mới nhất');
    setUpdateIcon('✓', 'is-success');
    elements.updateTitle.textContent = 'Bạn đang dùng bản mới nhất';
    elements.updateMessage.textContent = 'Hiện không có phiên bản ổn định nào mới hơn trên GitHub Releases.';
    elements.updateVersion.textContent = versionSummary;
    elements.updateCloseButton.classList.add('is-hidden');
    setUpdatePrimary('Đóng', 'close');
    if (forceOpen || update.manual) showUpdateDialog();
    window.setTimeout(() => {
      if (state.update?.status === 'up-to-date') setUpdateHeader('Cập nhật');
    }, 5000);
    return;
  }

  if (update.status === 'error') {
    setUpdateHeader('Thử lại');
    setUpdateIcon('!', 'is-error');
    elements.updateTitle.textContent = 'Chưa thể kiểm tra cập nhật';
    elements.updateMessage.textContent = update.message || 'Hãy kiểm tra kết nối mạng rồi thử lại.';
    elements.updateVersion.textContent = versionSummary;
    setUpdatePrimary('Kiểm tra lại', 'check');
    if (forceOpen || update.manual || elements.updateDialog.open) showUpdateDialog();
  }
}

async function checkForUpdatesManually() {
  if (!state.appInfo) await initializeAppInfo();
  if (!state.appInfo?.updateSupported) {
    showToast('Cập nhật online chỉ hoạt động trong bản cài Windows. Hãy dùng file Setup thay cho bản chạy mã nguồn.', 'info');
    return;
  }
  renderUpdateStatus({
    status: 'checking',
    currentVersion: state.appInfo.version,
    manual: true,
  }, { forceOpen: true });
  try {
    renderUpdateStatus(unwrap(await api.checkForUpdates({ manual: true })), { forceOpen: true });
  } catch (error) {
    renderUpdateStatus({
      status: 'error',
      currentVersion: state.appInfo.version,
      message: error.message,
      manual: true,
    }, { forceOpen: true });
  }
}

async function runUpdateAction(action) {
  if (action === 'close') {
    elements.updateDialog.close();
    return;
  }
  if (action === 'check') {
    await checkForUpdatesManually();
    return;
  }
  if (action === 'download') {
    setUpdatePrimary('Đang bắt đầu tải…', 'none', { disabled: true });
    renderUpdateStatus(unwrap(await api.downloadUpdate()), { forceOpen: true });
    return;
  }
  if (action === 'install') {
    if (updateInstallBlocked()) {
      throw new Error('Hãy hoàn tất tác vụ đang chạy và lưu hoặc đóng phần chỉnh vùng in trước khi cài cập nhật.');
    }
    setUpdatePrimary('Đang khởi động lại…', 'none', { disabled: true });
    const result = unwrap(await api.installUpdate());
    if (!result.installing) {
      throw new Error('Không thể khởi động trình cài cập nhật. Hãy thử lại.');
    }
  }
}

function showToast(message, type = 'info', duration = 5200) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), duration);
}

function setAppStatus(label, status = 'ready') {
  elements.appStatus.dataset.state = status;
  elements.appStatus.lastElementChild.textContent = label;
}

function balanceCounts(total, groups) {
  if (total < 1 || groups < 1 || groups > total) return [];
  const base = Math.floor(total / groups);
  const remainder = total % groups;
  return Array.from({ length: groups }, (_, index) => base + (index < remainder ? 1 : 0));
}

function selectedFiles() {
  return state.files.filter(
    (file) =>
      state.selected.has(file.path) &&
      !file.error &&
      !isTemplateFile(file) &&
      !isWatermarkFile(file),
  );
}

function currentFilterMatches(file) {
  const query = elements.fileSearch.value.trim().toLocaleLowerCase();
  return !query || file.name.toLocaleLowerCase().includes(query);
}

function renderEmptyList(message) {
  elements.fileList.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-list';
  const icon = document.createElement('span');
  icon.className = 'empty-icon';
  icon.textContent = 'PNG';
  const copy = document.createElement('p');
  copy.textContent = message;
  wrapper.append(icon, copy);
  elements.fileList.append(wrapper);
}

function renderFileList() {
  const visibleFiles = state.files.filter(currentFilterMatches);
  if (state.files.length === 0) {
    renderEmptyList(state.sourceDirectory ? 'Thư mục này không có file PNG.' : 'Kéo file PNG vào đây hoặc chọn một thư mục.');
    return;
  }
  if (visibleFiles.length === 0) {
    renderEmptyList('Không có file nào khớp nội dung tìm kiếm.');
    return;
  }

  elements.fileList.textContent = '';
  for (const file of visibleFiles) {
    const template = isTemplateFile(file);
    const watermark = isWatermarkFile(file);
    const selected = state.selected.has(file.path) && !template && !watermark && !file.error;
    const row = document.createElement('div');
    row.className = [
      'file-row',
      selected ? 'is-selected' : '',
      template || watermark ? 'is-template' : '',
      file.error ? 'is-invalid' : '',
    ].filter(Boolean).join(' ');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(selected));
    row.title = file.error || file.path;

    const checkbox = document.createElement('input');
    checkbox.className = 'file-check';
    checkbox.type = 'checkbox';
    checkbox.checked = selected;
    checkbox.disabled = state.busy || template || watermark || Boolean(file.error);
    checkbox.setAttribute('aria-label', `Chọn ${file.name}`);

    const thumb = document.createElement('span');
    thumb.className = 'file-thumb';
    const image = document.createElement('img');
    image.src = file.url;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove());
    thumb.append(image);

    const copy = document.createElement('span');
    copy.className = 'file-copy';
    const name = document.createElement('strong');
    name.textContent = file.name;
    const meta = document.createElement('span');
    meta.textContent = file.error
      ? 'Không đọc được file'
      : `${file.width} × ${file.height}px · ${formatBytes(file.size)}`;
    copy.append(name, meta);

    const badge = document.createElement('span');
    badge.className = `file-badge${file.error ? ' error' : ''}`;
    badge.textContent = file.error ? 'Lỗi' : template ? 'Ảnh nền' : watermark ? 'Watermark' : 'PNG';

    const toggle = () => {
      if (state.busy || template || watermark || file.error) return;
      if (state.selected.has(file.path)) state.selected.delete(file.path);
      else state.selected.add(file.path);
      renderFileList();
      updateSelectionState();
    };
    row.addEventListener('click', (event) => {
      if (event.target !== checkbox) toggle();
    });
    checkbox.addEventListener('change', toggle);
    row.append(checkbox, thumb, copy, badge);
    elements.fileList.append(row);
  }
}

function sourcePickerVisibleFiles() {
  if (!state.sourcePicker) return [];
  const query = elements.sourcePickerSearch.value.trim().toLocaleLowerCase();
  return state.sourcePicker.files.filter(
    (file) => !query || file.name.toLocaleLowerCase().includes(query),
  );
}

function sourcePickerFileDisabled(file) {
  return Boolean(file.error || isTemplateFile(file) || isWatermarkFile(file));
}

function renderSourcePicker() {
  if (!state.sourcePicker) return;
  const visibleFiles = sourcePickerVisibleFiles();
  elements.sourcePickerGrid.textContent = '';

  if (visibleFiles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'source-picker-empty';
    empty.textContent = state.sourcePicker.files.length === 0
      ? 'Thư mục này không có file PNG.'
      : 'Không có PNG nào khớp nội dung tìm kiếm.';
    elements.sourcePickerGrid.append(empty);
  }

  for (const file of visibleFiles) {
    const disabled = sourcePickerFileDisabled(file);
    const selected = state.sourcePicker.selected.has(file.path) && !disabled;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `source-tile${selected ? ' is-selected' : ''}`;
    tile.disabled = disabled;
    tile.setAttribute('aria-pressed', String(selected));
    tile.title = file.error || file.path;

    const preview = document.createElement('span');
    preview.className = 'source-tile-preview';
    const image = document.createElement('img');
    image.src = file.url;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove());
    preview.append(image);

    const check = document.createElement('span');
    check.className = 'source-tile-check';
    check.textContent = '✓';

    const name = document.createElement('strong');
    name.textContent = file.name;
    const meta = document.createElement('small');
    meta.textContent = file.error
      ? 'Không đọc được file'
      : isTemplateFile(file)
        ? 'Ảnh nền mẫu · không nạp'
        : isWatermarkFile(file)
          ? 'Watermark · không nạp'
        : `${file.width} × ${file.height}px · ${formatBytes(file.size)}`;

    tile.addEventListener('click', () => {
      if (state.sourcePicker.selected.has(file.path)) state.sourcePicker.selected.delete(file.path);
      else state.sourcePicker.selected.add(file.path);
      renderSourcePicker();
    });
    tile.append(preview, check, name, meta);
    elements.sourcePickerGrid.append(tile);
  }

  const validFiles = state.sourcePicker.files.filter((file) => !sourcePickerFileDisabled(file));
  const selectedCount = validFiles.filter((file) => state.sourcePicker.selected.has(file.path)).length;
  elements.sourcePickerCount.textContent = `Đã chọn ${selectedCount}/${validFiles.length} PNG`;
  elements.sourcePickerConfirm.textContent = `Nạp ${selectedCount} PNG`;
  elements.sourcePickerConfirm.disabled = selectedCount === 0;
  elements.sourcePickerSelectAll.disabled = visibleFiles.every(sourcePickerFileDisabled);
  elements.sourcePickerSelectNone.disabled = selectedCount === 0;
}

function openSourcePicker(result) {
  const sameFolder = normalizePath(result.folderPath) === normalizePath(state.sourceDirectory);
  const previousSelection = sameFolder ? state.selected : new Set();
  const selected = new Set();
  for (const file of result.files) {
    if (sourcePickerFileDisabled(file)) continue;
    if (!sameFolder || previousSelection.has(file.path)) selected.add(file.path);
  }
  state.sourcePicker = {
    folderPath: result.folderPath,
    files: result.files,
    selected,
  };
  elements.sourcePickerPath.textContent = result.folderPath;
  elements.sourcePickerPath.title = result.folderPath;
  elements.sourcePickerSearch.value = '';
  renderSourcePicker();
  elements.sourcePickerDialog.showModal();
}

function closeSourcePicker() {
  if (elements.sourcePickerDialog.open) elements.sourcePickerDialog.close();
}

function commitSourcePicker() {
  if (!state.sourcePicker) return;
  const pending = state.sourcePicker;
  const chosenFiles = pending.files.filter(
    (file) => pending.selected.has(file.path) && !sourcePickerFileDisabled(file),
  );
  if (chosenFiles.length === 0) return;

  state.sourceDirectory = pending.folderPath;
  state.sourceDirectories = new Set([pending.folderPath]);
  state.files = chosenFiles;
  state.selected = new Set(chosenFiles.map((file) => file.path));
  state.output = null;
  elements.openOutputButton.classList.add('is-hidden');
  elements.sourcePath.textContent = pending.folderPath;
  elements.sourcePath.title = pending.folderPath;
  elements.sourcePath.classList.remove('is-empty');
  elements.statOutput.textContent = `${pending.folderPath}\\Done`;
  closeSourcePicker();
  renderFileList();
  updateSelectionState();
  if (state.template) showTemplatePreview();
  showToast(`Đã nạp ${chosenFiles.length} PNG đã chọn.`, 'success', 3400);
}

function renderSourcePathSummary() {
  if (!state.sourceDirectory) {
    elements.sourcePath.textContent = 'Chưa chọn thư mục';
    elements.sourcePath.title = '';
    elements.sourcePath.classList.add('is-empty');
    elements.statOutput.textContent = '—';
    return;
  }

  const outputDirectory = `${state.sourceDirectory}\\Done`;
  const directoryCount = Math.max(1, state.sourceDirectories.size);
  elements.sourcePath.textContent = directoryCount > 1
    ? `${state.files.length} PNG từ ${directoryCount} thư mục · lưu tại ${outputDirectory}`
    : state.sourceDirectory;
  elements.sourcePath.title = directoryCount > 1
    ? `Nguồn từ ${directoryCount} thư mục. Kết quả lưu tại ${outputDirectory}`
    : state.sourceDirectory;
  elements.sourcePath.classList.remove('is-empty');
  elements.statOutput.textContent = outputDirectory;
}

function rememberSourceDirectory(directoryPath) {
  if (!directoryPath) return;
  const key = normalizePath(directoryPath);
  if ([...state.sourceDirectories].some((item) => normalizePath(item) === key)) return;
  state.sourceDirectories.add(directoryPath);
}

function setFileDropState(mode = 'idle') {
  const dragging = mode === 'dragging';
  const loading = mode === 'loading';
  elements.fileList.classList.toggle('is-drag-over', dragging);
  elements.fileList.classList.toggle('is-drop-loading', loading);
  elements.fileList.dataset.dropMessage = loading ? 'Đang đọc file PNG…' : 'Thả file PNG vào đây';
  elements.fileList.setAttribute('aria-busy', String(loading));
}

function mergeDroppedFiles(result) {
  const knownPaths = new Set(state.files.map((file) => normalizePath(file.path)));
  const additions = [];
  let duplicateCount = Number(result.duplicateCount) || 0;

  for (const file of result.files || []) {
    const key = normalizePath(file.path);
    if (!key || knownPaths.has(key)) {
      duplicateCount += 1;
      continue;
    }
    knownPaths.add(key);
    additions.push(file);
  }

  if (additions.length === 0) return { additions, duplicateCount, selectedCount: 0 };

  if (!state.sourceDirectory) state.sourceDirectory = result.folderPath;
  if (state.sourceDirectory && state.sourceDirectories.size === 0) {
    rememberSourceDirectory(state.sourceDirectory);
  }
  for (const file of additions) {
    rememberSourceDirectory(file.directory);
    if (!file.error && !isTemplateFile(file) && !isWatermarkFile(file)) {
      state.selected.add(file.path);
    }
  }

  state.files.push(...additions);
  state.output = null;
  elements.openOutputButton.classList.add('is-hidden');
  elements.fileSearch.value = '';
  renderSourcePathSummary();
  renderFileList();
  updateSelectionState();
  if (state.template) showTemplatePreview();

  return {
    additions,
    duplicateCount,
    selectedCount: additions.filter(
      (file) => !file.error && !isTemplateFile(file) && !isWatermarkFile(file),
    ).length,
  };
}

async function addDroppedPngFiles(dataTransfer) {
  if (state.busy || state.folderScanning || state.dropScanning || state.regionEditor) return;
  const droppedFiles = Array.from(dataTransfer?.files || []);
  const pngFiles = droppedFiles.filter((file) => /\.png$/i.test(file.name || ''));
  const droppedPaths = [];

  for (const file of pngFiles) {
    try {
      const filePath = api.getDroppedFilePath(file);
      if (filePath) droppedPaths.push(filePath);
    } catch {
      // Browser-originated files do not expose a local Explorer path.
    }
  }

  const nonPngCount = droppedFiles.length - pngFiles.length;
  const unavailablePngCount = pngFiles.length - droppedPaths.length;
  if (droppedPaths.length === 0) {
    showToast('Chỉ nhận file .png được kéo trực tiếp từ File Explorer.', 'info');
    return;
  }

  state.dropScanning = true;
  elements.chooseFolderButton.disabled = true;
  setFileDropState('loading');
  updateControls();
  setAppStatus('Đang đọc PNG', 'busy');
  try {
    const result = unwrap(await api.inspectDroppedPngFiles(droppedPaths));
    const merged = mergeDroppedFiles(result);
    const invalidCount = merged.additions.filter((file) => file.error).length;
    const notes = [];
    if (merged.selectedCount > 0) notes.push(`Đã thêm và chọn ${merged.selectedCount} PNG.`);
    if (invalidCount > 0) notes.push(`${invalidCount} file lỗi không được chọn.`);
    if (merged.duplicateCount > 0) notes.push(`${merged.duplicateCount} file trùng đã bỏ qua.`);
    if (nonPngCount > 0) notes.push(`${nonPngCount} file không phải PNG đã bỏ qua.`);
    if (unavailablePngCount > 0) notes.push(`${unavailablePngCount} PNG không có đường dẫn Explorer đã bỏ qua.`);
    showToast(notes.join(' ') || 'Các file PNG này đã có trong danh sách.', merged.selectedCount > 0 ? 'success' : 'info', 4200);
  } catch (error) {
    showError(error);
  } finally {
    state.dropScanning = false;
    elements.chooseFolderButton.disabled = state.busy;
    setFileDropState();
    updateControls();
    if (!state.busy) setAppStatus('Sẵn sàng', 'ready');
  }
}

function readInteger(input, label, min, max = Number.MAX_SAFE_INTEGER, markInvalid = true) {
  const value = Number(input.value);
  const valid = Number.isInteger(value) && value >= min && value <= max;
  if (markInvalid) input.classList.toggle('is-invalid', !valid);
  if (!valid) {
    throw new Error(`${label} phải là số nguyên từ ${min} đến ${max === Number.MAX_SAFE_INTEGER ? 'giới hạn cho phép' : max}.`);
  }
  return value;
}

function readSettings(markInvalid = true) {
  return {
    gap: readInteger(elements.gap, 'Khoảng cách PNG', 0, 500, markInvalid),
    topMargin: readInteger(elements.topMargin, 'Lề trên', 0, 100000, markInvalid),
    bottomMargin: readInteger(elements.bottomMargin, 'Lề dưới', 0, 100000, markInvalid),
    sideMargin: readInteger(elements.sideMargin, 'Lề trái/phải', 0, 100000, markInvalid),
    alphaThreshold: readInteger(elements.alphaThreshold, 'Ngưỡng alpha', 0, 254, markInvalid),
  };
}

function readMockupCount(markInvalid = true) {
  return readInteger(
    elements.mockupCount,
    'Số ảnh mockup',
    1,
    Math.max(1, selectedFiles().length),
    markInvalid,
  );
}

function settingsForOverlay() {
  const fallback = { topMargin: 195, bottomMargin: 195, sideMargin: 24 };
  try {
    return readSettings(false);
  } catch {
    return fallback;
  }
}

function validateReady({ includeAdditionalOutputs = false } = {}) {
  const files = selectedFiles();
  if (!state.sourceDirectory) throw new Error('Hãy chọn thư mục chứa PNG.');
  if (files.length === 0) throw new Error('Hãy chọn ít nhất một file PNG hợp lệ.');
  if (!state.template) throw new Error('Hãy chọn ảnh nền mẫu.');
  const mockupCount = readMockupCount();
  const settings = readSettings();
  if (settings.topMargin + settings.bottomMargin >= state.template.height) {
    throw new Error(
      `Ảnh nền cao ${state.template.height}px, không đủ cho lề trên + dưới ${settings.topMargin + settings.bottomMargin}px.`,
    );
  }
  if (settings.sideMargin * 2 >= state.template.width) {
    throw new Error(
      `Ảnh nền rộng ${state.template.width}px, không đủ cho tổng lề ngang ${settings.sideMargin * 2}px.`,
    );
  }
  if (elements.useWatermark.checked && !state.watermark) {
    throw new Error('Hãy chọn file watermark PNG nền trong suốt.');
  }
  const payload = {
    sourcePaths: files.map((file) => file.path),
    templatePath: state.template.path,
    sourceDirectory: state.sourceDirectory,
    mockupCount,
    settings,
    removeMetadata: elements.removeMetadata.checked,
    watermarkPath: elements.useWatermark.checked ? state.watermark.path : null,
  };
  if (includeAdditionalOutputs) Object.assign(payload, readAdditionalGenerationOptions());
  return payload;
}

function updateDistribution() {
  const total = selectedFiles().length;
  let mockupCount = Number(elements.mockupCount.value);
  if (!Number.isInteger(mockupCount) || mockupCount < 1) mockupCount = 1;
  if (total > 0 && mockupCount > total) {
    mockupCount = total;
    elements.mockupCount.value = String(total);
  }
  elements.mockupCount.max = String(Math.max(1, total));
  elements.distribution.textContent = '';

  if (total === 0) {
    const text = document.createElement('span');
    text.textContent = 'Chưa có PNG để chia';
    elements.distribution.append(text);
    return;
  }

  const label = document.createElement('strong');
  label.textContent = 'Chia file:';
  elements.distribution.append(label);
  for (const count of balanceCounts(total, mockupCount)) {
    const chip = document.createElement('span');
    chip.className = 'group-chip';
    chip.textContent = `${count} PNG`;
    elements.distribution.append(chip);
  }
}

function updateSelectionState() {
  const selected = selectedFiles().length;
  const valid = state.files.filter(
    (file) => !file.error && !isTemplateFile(file) && !isWatermarkFile(file),
  ).length;
  const invalid = state.files.filter((file) => file.error).length;
  elements.selectionCount.textContent = `Đã chọn ${selected}/${valid} PNG`;
  elements.selectionHint.textContent = invalid > 0 ? `${invalid} file lỗi đã bỏ qua` : state.files.length ? 'Giữ nguyên thứ tự tên file' : 'Chưa có dữ liệu';
  elements.statSelected.textContent = String(selected);
  updateDistribution();
  updateControls();
}

function updateControls() {
  const editorActive = Boolean(state.regionEditor);
  if (state.update?.status === 'downloaded') {
    elements.updatePrimaryButton.disabled = updateInstallBlocked();
  }
  elements.openInputFolderButton.disabled =
    state.busy || state.inputAssetsLoading || state.inputAssetsSaving || editorActive;
  if (state.busy) return;
  const scanning = state.folderScanning || state.dropScanning;
  const hasFiles = selectedFiles().length > 0;
  const ready = Boolean(state.sourceDirectory && state.template && hasFiles);
  elements.chooseFolderButton.disabled = scanning || editorActive;
  elements.chooseTemplateButton.disabled = editorActive;
  elements.watermarkFile.disabled = editorActive;
  elements.useWatermark.disabled = editorActive;
  elements.previewButton.disabled = scanning || !ready || editorActive;
  elements.generateButton.disabled =
    scanning || state.inputAssetsLoading || state.inputAssetsSaving || !ready || editorActive;
  elements.selectAllButton.disabled = scanning || state.files.length === 0;
  elements.selectNoneButton.disabled = scanning || state.selected.size === 0;
  elements.createPdfDownload.disabled =
    state.inputAssetsLoading || editorActive;
  elements.downloadUrl.disabled =
    state.inputAssetsLoading || !elements.createPdfDownload.checked || editorActive;
  elements.createSingleMockups.disabled =
    state.inputAssetsLoading || editorActive;
  elements.editSingleMockupRegions.disabled =
    state.inputAssetsLoading || state.inputAssetsSaving;
  elements.saveSingleMockupRegions.disabled = !editorActive || state.inputAssetsSaving;
  const count = Math.max(1, Number(elements.mockupCount.value) || 1);
  elements.generateButton.textContent = `Tạo ${count} mockup`;
}

function renderTemplateSummary() {
  if (!state.template) {
    elements.templateThumb.className = 'template-thumb empty';
    elements.templateThumb.textContent = '';
    const plus = document.createElement('span');
    plus.textContent = '＋';
    elements.templateThumb.append(plus);
    elements.templateName.textContent = 'Chọn ảnh nền mẫu';
    elements.templateMeta.textContent = 'Kết quả sẽ giữ nguyên kích thước nền';
    elements.statTemplate.textContent = '—';
    return;
  }

  elements.templateThumb.className = 'template-thumb';
  elements.templateThumb.textContent = '';
  const image = document.createElement('img');
  image.src = state.template.url;
  image.alt = '';
  elements.templateThumb.append(image);
  elements.templateName.textContent = state.template.name;
  elements.templateMeta.textContent = `${state.template.width} × ${state.template.height}px · ${formatBytes(state.template.size)}`;
  elements.statTemplate.textContent = `${state.template.width} × ${state.template.height}px`;
}

function renderWatermarkSummary() {
  const enabled = elements.useWatermark.checked;
  elements.watermarkFile.classList.toggle('is-hidden', !enabled || !state.watermark);
  if (!state.watermark) {
    elements.watermarkThumb.textContent = '';
    elements.watermarkName.textContent = 'Chưa chọn watermark';
    elements.watermarkMeta.textContent = 'Bấm để chọn file PNG';
    return;
  }
  elements.watermarkThumb.textContent = '';
  const image = document.createElement('img');
  image.src = state.watermark.url;
  image.alt = '';
  elements.watermarkThumb.append(image);
  elements.watermarkName.textContent = state.watermark.name;
  elements.watermarkMeta.textContent = `${state.watermark.width} × ${state.watermark.height}px · ${formatBytes(state.watermark.size)}`;
}

function clonePrintRegion(region) {
  return {
    x: Number(region.x),
    y: Number(region.y),
    width: Number(region.width),
    height: Number(region.height),
  };
}

function syncEditorWindowState() {
  api.setEditorState({
    open: Boolean(state.regionEditor),
    dirty: Boolean(state.regionEditor?.dirty),
  });
}

function validPrintRegion(region, template) {
  if (!region || !template) return false;
  const values = [region.x, region.y, region.width, region.height].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return false;
  const [x, y, width, height] = values;
  if (
    x < 0 || y < 0 || width <= 0 || height <= 0 ||
    x + width > 1.000001 || y + height > 1.000001
  ) return false;
  const pixelRatio = (width * template.width) / (height * template.height);
  return Math.abs(pixelRatio - 7 / 8) < 0.0002;
}

function defaultPrintRegion(template) {
  const pixelHeight = Math.max(
    8,
    Math.min(template.height * 0.62, template.width * 0.62 * 8 / 7),
  );
  const pixelWidth = pixelHeight * 7 / 8;
  return {
    x: (template.width - pixelWidth) / (2 * template.width),
    y: (template.height - pixelHeight) / (2 * template.height),
    width: pixelWidth / template.width,
    height: pixelHeight / template.height,
  };
}

function currentRegionEntry() {
  return state.regionEditor?.entries[state.pageIndex] || null;
}

function updatePrintRegion() {
  const entry = currentRegionEntry();
  if (state.viewMode !== 'region' || !entry) {
    elements.printRegion.classList.add('is-hidden');
    return;
  }
  const { region } = entry;
  elements.printRegion.style.left = `${region.x * 100}%`;
  elements.printRegion.style.top = `${region.y * 100}%`;
  elements.printRegion.style.width = `${region.width * 100}%`;
  elements.printRegion.style.height = `${region.height * 100}%`;
  elements.printRegion.classList.remove('is-hidden');
}

function setRegionEditorStatus(message = null) {
  if (!state.regionEditor) return;
  const entry = currentRegionEntry();
  elements.singleRegionStatus.textContent = message ||
    `Ảnh ${state.pageIndex + 1}/${state.regionEditor.entries.length}: ${entry.template.name}. ` +
    'Kéo vùng vàng để di chuyển, kéo các góc để đổi kích thước.';
}

function showRegionEditorPage(pageIndex) {
  if (!state.regionEditor) return;
  const boundedIndex = Math.max(0, Math.min(state.regionEditor.entries.length - 1, pageIndex));
  state.pageIndex = boundedIndex;
  state.pageCount = state.regionEditor.entries.length;
  const entry = currentRegionEntry();
  showImage({
    url: entry.template.url,
    width: entry.template.width,
    height: entry.template.height,
    mode: 'region',
    title: `Chỉnh vùng in ${boundedIndex + 1}/${state.pageCount} · ${entry.template.name}`,
  });
  elements.statTemplate.textContent = `${entry.template.width} × ${entry.template.height}px`;
  elements.statLayout.textContent = 'Vùng in 42×48';
  updatePrintRegion();
  setRegionEditorStatus();
  updateControls();
}

function restorePreviewAfterRegionEditor(previousView) {
  if (previousView?.display) {
    state.pageIndex = previousView.pageIndex;
    state.pageCount = previousView.pageCount;
    showImage({
      ...previousView.display,
      mode: previousView.viewMode,
      title: previousView.title,
      layout: previousView.layout,
    });
    elements.statLayout.textContent = previousView.statLayout;
    elements.statTemplate.textContent = previousView.statTemplate;
    return;
  }
  if (state.template) {
    showTemplatePreview();
    return;
  }
  state.display = null;
  state.viewMode = 'empty';
  state.pageIndex = 0;
  state.pageCount = 1;
  elements.imageFrame.classList.add('is-hidden');
  elements.previewPlaceholder.classList.remove('is-hidden');
  elements.previewTitle.textContent = 'Ảnh nền và vùng sắp xếp';
  elements.statTemplate.textContent = '—';
  elements.safeZone.classList.add('is-hidden');
  elements.printRegion.classList.add('is-hidden');
  updatePageNavigation();
}

function exitRegionEditor({ notifyUnsaved = false } = {}) {
  if (!state.regionEditor || state.inputAssetsSaving) return;
  const previousView = state.regionEditor.previousView;
  const dirty = state.regionEditor.dirty;
  if (
    notifyUnsaved && dirty &&
    !window.confirm('Vùng in có thay đổi chưa được lưu. Bạn có chắc muốn bỏ các thay đổi này?')
  ) {
    elements.editSingleMockupRegions.checked = true;
    return;
  }
  state.regionEditor = null;
  syncEditorWindowState();
  elements.editSingleMockupRegions.checked = false;
  elements.printRegion.classList.add('is-hidden');
  elements.printRegion.classList.remove('is-dragging');
  restorePreviewAfterRegionEditor(previousView);
  renderInputAssets();
  updateControls();
  if (notifyUnsaved && dirty) {
    showToast('Các thay đổi vùng in chưa lưu đã được bỏ qua.', 'info');
  }
}

async function enterRegionEditor() {
  if (state.busy || state.inputAssetsSaving) return;
  const refreshed = await refreshInputAssets();
  if (!refreshed) {
    elements.editSingleMockupRegions.checked = false;
    return;
  }
  const templates = state.inputAssets.singleMockupTemplates;
  if (templates.length === 0) {
    elements.editSingleMockupRegions.checked = false;
    showError(new Error('Hãy thêm ảnh mockup đơn vào thư mục Input.'));
    return;
  }
  const tooSmall = templates.find((template) => template.width < 7 || template.height < 8);
  if (tooSmall) {
    elements.editSingleMockupRegions.checked = false;
    showError(new Error(`Ảnh ${tooSmall.name} quá nhỏ để tạo vùng in 7×8 pixel.`));
    return;
  }
  state.regionEditor = {
    entries: templates.map((template) => ({
      template,
      region: validPrintRegion(template.region, template)
        ? clonePrintRegion(template.region)
        : defaultPrintRegion(template),
    })),
    dirty: templates.some((template) => !validPrintRegion(template.region, template)),
    drag: null,
    previousView: {
      display: state.display ? { ...state.display } : null,
      viewMode: state.viewMode,
      pageIndex: state.pageIndex,
      pageCount: state.pageCount,
      layout: state.previewLayout,
      title: elements.previewTitle.textContent,
      statLayout: elements.statLayout.textContent,
      statTemplate: elements.statTemplate.textContent,
    },
  };
  syncEditorWindowState();
  showRegionEditorPage(0);
}

async function saveRegionEditor() {
  if (!state.regionEditor || state.inputAssetsSaving) return;
  const editor = state.regionEditor;
  const previousView = editor.previousView;
  state.inputAssetsSaving = true;
  updateControls();
  updatePageNavigation();
  setRegionEditorStatus('Đang lưu thiết lập vùng in…');
  const entries = editor.entries.map((entry) => ({
    templateName: entry.template.name,
    region: clonePrintRegion(entry.region),
  }));
  try {
    const assets = unwrap(await api.saveSingleMockupRegions(entries));
    state.inputAssets = assets;
    state.inputAssetsLoaded = true;
    if (state.regionEditor === editor) state.regionEditor = null;
    syncEditorWindowState();
    elements.editSingleMockupRegions.checked = false;
    elements.printRegion.classList.add('is-hidden');
    elements.printRegion.classList.remove('is-dragging');
    restorePreviewAfterRegionEditor(previousView);
    renderInputAssets();
    showToast(`Đã lưu vùng in cho ${entries.length} ảnh mockup đơn.`, 'success');
  } catch (error) {
    showError(error);
    setRegionEditorStatus('Chưa lưu được. Hãy kiểm tra lại các ảnh trong Input.');
  } finally {
    state.inputAssetsSaving = false;
    updateControls();
    updatePageNavigation();
  }
}

function beginPrintRegionDrag(event) {
  if (
    !state.regionEditor || state.inputAssetsSaving ||
    state.viewMode !== 'region' || event.button !== 0
  ) return;
  const entry = currentRegionEntry();
  const frame = elements.imageFrame.getBoundingClientRect();
  if (frame.width <= 0 || frame.height <= 0) return;
  const handle = event.target.closest('[data-handle]')?.dataset.handle || null;
  const region = entry.region;
  state.regionEditor.drag = {
    pointerId: event.pointerId,
    mode: handle ? 'resize' : 'move',
    handle,
    frame,
    startX: event.clientX,
    startY: event.clientY,
    start: {
      left: region.x * frame.width,
      top: region.y * frame.height,
      width: region.width * frame.width,
      height: region.height * frame.height,
    },
  };
  elements.printRegion.setPointerCapture(event.pointerId);
  elements.printRegion.classList.add('is-dragging');
  event.preventDefault();
}

function movePrintRegionDrag(event) {
  const drag = state.regionEditor?.drag;
  const entry = currentRegionEntry();
  if (!drag || !entry || drag.pointerId !== event.pointerId) return;
  const { frame, start } = drag;
  let left;
  let top;
  let width = start.width;
  let height = start.height;

  if (drag.mode === 'move') {
    left = Math.max(0, Math.min(frame.width - width, start.left + event.clientX - drag.startX));
    top = Math.max(0, Math.min(frame.height - height, start.top + event.clientY - drag.startY));
  } else {
    const east = drag.handle.includes('e');
    const south = drag.handle.includes('s');
    const anchorX = east ? start.left : start.left + start.width;
    const anchorY = south ? start.top : start.top + start.height;
    const pointerX = Math.max(0, Math.min(frame.width, event.clientX - frame.left));
    const pointerY = Math.max(0, Math.min(frame.height, event.clientY - frame.top));
    const candidateWidth = Math.max(0, (pointerX - anchorX) * (east ? 1 : -1));
    const candidateHeight = Math.max(0, (pointerY - anchorY) * (south ? 1 : -1));
    const maxWidth = east ? frame.width - anchorX : anchorX;
    const maxHeight = south ? frame.height - anchorY : anchorY;
    const displayRatio = (7 / 8) *
      (frame.width * entry.template.height) / (frame.height * entry.template.width);
    const maximumHeight = Math.max(1, Math.min(maxHeight, maxWidth / displayRatio));
    const minimumHeight = Math.min(32, maximumHeight);
    const preferredHeight =
      (displayRatio * candidateWidth + candidateHeight) / (displayRatio ** 2 + 1);
    height = Math.max(minimumHeight, Math.min(maximumHeight, preferredHeight));
    width = height * displayRatio;
    left = east ? anchorX : anchorX - width;
    top = south ? anchorY : anchorY - height;
  }

  left = Math.max(0, Math.min(frame.width - width, left));
  top = Math.max(0, Math.min(frame.height - height, top));

  entry.region = {
    x: left / frame.width,
    y: top / frame.height,
    width: width / frame.width,
    height: height / frame.height,
  };
  const wasDirty = state.regionEditor.dirty;
  state.regionEditor.dirty = true;
  if (!wasDirty) syncEditorWindowState();
  updatePrintRegion();
  setRegionEditorStatus(`Chưa lưu · ${entry.template.name}`);
  event.preventDefault();
}

function endPrintRegionDrag(event) {
  const drag = state.regionEditor?.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  state.regionEditor.drag = null;
  elements.printRegion.classList.remove('is-dragging');
  if (elements.printRegion.hasPointerCapture(event.pointerId)) {
    elements.printRegion.releasePointerCapture(event.pointerId);
  }
}

function updatePageNavigation() {
  const visible = state.pageCount > 1 &&
    (state.viewMode === 'preview' || state.viewMode === 'output' || state.viewMode === 'region');
  elements.pageNavigation.classList.toggle('is-hidden', !visible);
  elements.pageLabel.textContent = `${state.pageIndex + 1} / ${state.pageCount}`;
  elements.previousPageButton.disabled =
    state.busy || state.inputAssetsSaving || state.pageIndex <= 0;
  elements.nextPageButton.disabled =
    state.busy || state.inputAssetsSaving || state.pageIndex >= state.pageCount - 1;
}

function fitImageFrame() {
  if (!state.display || elements.imageFrame.classList.contains('is-hidden')) return;
  const stageWidth = Math.max(100, elements.previewStage.clientWidth - 56);
  const stageHeight = Math.max(100, elements.previewStage.clientHeight - 48);
  const imageRatio = state.display.width / state.display.height;
  let width = stageWidth;
  let height = width / imageRatio;
  if (height > stageHeight) {
    height = stageHeight;
    width = height * imageRatio;
  }
  elements.imageFrame.style.width = `${Math.floor(width)}px`;
  elements.imageFrame.style.height = `${Math.floor(height)}px`;
}

function updateSafeZone() {
  if (!state.display || state.viewMode !== 'template' || !state.template) {
    elements.safeZone.classList.add('is-hidden');
    return;
  }
  const settings = settingsForOverlay();
  const { width, height } = state.template;
  const zoneWidth = width - settings.sideMargin * 2;
  const zoneHeight = height - settings.topMargin - settings.bottomMargin;
  if (zoneWidth <= 0 || zoneHeight <= 0) {
    elements.safeZone.classList.add('is-hidden');
    return;
  }
  elements.safeZone.style.left = `${(settings.sideMargin / width) * 100}%`;
  elements.safeZone.style.top = `${(settings.topMargin / height) * 100}%`;
  elements.safeZone.style.width = `${(zoneWidth / width) * 100}%`;
  elements.safeZone.style.height = `${(zoneHeight / height) * 100}%`;
  elements.safeZone.classList.remove('is-hidden');
}

function showImage({ url, width, height, mode, title, layout = null }) {
  state.display = { url, width, height };
  state.viewMode = mode;
  state.previewLayout = layout;
  elements.previewPlaceholder.classList.add('is-hidden');
  elements.imageFrame.classList.remove('is-hidden');
  elements.previewImage.src = url;
  elements.previewTitle.textContent = title;
  elements.statLayout.textContent = layout ? `${layout.cols} cột × ${layout.rows} hàng` : mode === 'template' ? 'Vùng an toàn' : 'Tự động';
  elements.previewImage.addEventListener('load', fitImageFrame, { once: true });
  fitImageFrame();
  updateSafeZone();
  updatePrintRegion();
  updatePageNavigation();
}

function showTemplatePreview() {
  if (!state.template) return;
  state.pageIndex = 0;
  state.pageCount = 1;
  showImage({
    url: state.template.url,
    width: state.template.width,
    height: state.template.height,
    mode: 'template',
    title: 'Ảnh nền và vùng sắp xếp',
  });
}

function setBusy(type, busy) {
  state.busy = busy;
  state.busyType = busy ? type : null;
  for (const element of document.querySelectorAll('[data-lock]')) {
    element.disabled = busy;
  }
  elements.openInputFolderButton.disabled = busy || state.inputAssetsLoading || state.inputAssetsSaving;
  elements.cancelButton.classList.toggle('is-hidden', !busy);
  elements.cancelButton.disabled = false;
  elements.previewButton.classList.toggle('is-hidden', busy);
  elements.generateButton.classList.toggle('is-hidden', busy);
  elements.cancelButton.parentElement.style.gridTemplateColumns = busy ? '1fr' : '';
  elements.workingOverlay.classList.toggle('is-hidden', !busy);
  if (busy) {
    elements.updatePrimaryButton.disabled = true;
  } else if (state.update) {
    renderUpdateStatus(state.update);
  }
  elements.workingTitle.textContent = type === 'preview' ? 'Đang tạo preview…' : 'Đang tạo mockup…';
  if (busy) {
    renderFileList();
    elements.progressFill.style.width = '1%';
    elements.workingMessage.textContent = 'Đang chuẩn bị dữ liệu';
    setAppStatus('Đang xử lý', 'busy');
  } else {
    renderFileList();
    updateControls();
    updatePageNavigation();
  }
}

function savePreferences() {
  try {
    localStorage.setItem('png-bundle-settings', JSON.stringify({
      gap: elements.gap.value,
      topMargin: elements.topMargin.value,
      bottomMargin: elements.bottomMargin.value,
      sideMargin: elements.sideMargin.value,
      alphaThreshold: elements.alphaThreshold.value,
    }));
  } catch {
    // Local preferences are optional.
  }
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('png-bundle-settings') || '{}');
    for (const key of ['gap', 'topMargin', 'bottomMargin', 'sideMargin', 'alphaThreshold']) {
      if (saved[key] !== undefined && elements[key]) elements[key].value = saved[key];
    }
  } catch {
    // Ignore invalid saved preferences.
  }
}

async function selectSourceFolder() {
  if (state.folderScanning || state.dropScanning || state.busy || state.regionEditor) return;
  state.folderScanning = true;
  elements.chooseFolderButton.disabled = true;
  elements.chooseFolderButton.textContent = 'Đang quét PNG trong thư mục…';
  setAppStatus('Đang quét PNG', 'busy');
  try {
    const result = unwrap(await api.selectSourceFolder());
    if (result.cancelled) return;
    openSourcePicker(result);
  } catch (error) {
    showError(error);
  } finally {
    state.folderScanning = false;
    elements.chooseFolderButton.disabled = false;
    elements.chooseFolderButton.innerHTML = '<span class="button-icon">▣</span>Chọn thư mục và xem PNG';
    if (!state.busy) setAppStatus('Sẵn sàng', 'ready');
  }
}

async function selectTemplate() {
  if (state.regionEditor) return;
  try {
    const result = unwrap(await api.selectTemplate());
    if (result.cancelled) return;
    state.template = result.template;
    if (
      state.watermark &&
      normalizePath(state.watermark.path) === normalizePath(state.template.path)
    ) {
      state.watermark = null;
      elements.useWatermark.checked = false;
      renderWatermarkSummary();
    }
    state.selected.delete(state.template.path);
    for (const selectedPath of [...state.selected]) {
      if (normalizePath(selectedPath) === normalizePath(state.template.path)) state.selected.delete(selectedPath);
    }
    renderTemplateSummary();
    renderFileList();
    updateSelectionState();
    showTemplatePreview();
  } catch (error) {
    showError(error);
  }
}

async function selectWatermark({ fromToggle = false } = {}) {
  if (state.regionEditor) return;
  try {
    const result = unwrap(await api.selectWatermark());
    if (result.cancelled) {
      if (fromToggle && !state.watermark) elements.useWatermark.checked = false;
      renderWatermarkSummary();
      return;
    }
    if (
      state.template &&
      normalizePath(result.watermark.path) === normalizePath(state.template.path)
    ) {
      throw new Error('Watermark không được trùng với ảnh nền mẫu.');
    }
    state.watermark = result.watermark;
    elements.useWatermark.checked = true;
    for (const selectedPath of [...state.selected]) {
      if (normalizePath(selectedPath) === normalizePath(state.watermark.path)) {
        state.selected.delete(selectedPath);
      }
    }
    renderWatermarkSummary();
    renderFileList();
    updateSelectionState();
    if (state.viewMode === 'preview') elements.statLayout.textContent = 'Cần xem trước lại';
  } catch (error) {
    if (fromToggle && !state.watermark) elements.useWatermark.checked = false;
    renderWatermarkSummary();
    showError(error);
  }
}

function showError(error) {
  const message = error?.message || 'Đã xảy ra lỗi không xác định.';
  if (error?.cancelled || error?.code === 'CANCELLED') {
    showToast('Đã huỷ thao tác. Không có file dở dang được giữ lại.', 'info');
    setAppStatus('Đã huỷ', 'ready');
    elements.progressMessage.textContent = 'Đã huỷ thao tác';
    return;
  }
  showToast(message, 'error', 7800);
  setAppStatus('Có lỗi', 'error');
  elements.progressMessage.textContent = message;
  window.setTimeout(() => {
    if (!state.busy) setAppStatus('Sẵn sàng', 'ready');
  }, 5000);
}

async function runPreview(pageIndex = 0) {
  let payload;
  try {
    payload = validateReady();
  } catch (error) {
    showError(error);
    return;
  }

  state.pageIndex = pageIndex;
  setBusy('preview', true);
  try {
    const result = unwrap(await api.renderPreview({ ...payload, pageIndex }));
    state.pageIndex = result.pageIndex;
    state.pageCount = result.pageCount;
    showImage({
      url: result.dataUrl,
      width: result.template.width,
      height: result.template.height,
      mode: 'preview',
      title: `Preview mockup ${result.pageIndex + 1} · ${result.groupSizes[result.pageIndex]} PNG`,
      layout: result.layout,
    });
    elements.progressFill.style.width = '100%';
    elements.progressMessage.textContent = `Preview ${result.layout.cols} cột × ${result.layout.rows} hàng`;
    setAppStatus('Preview sẵn sàng', 'ready');
  } catch (error) {
    showError(error);
  } finally {
    setBusy(null, false);
  }
}

function showOutputPage(pageIndex) {
  if (!state.output || pageIndex < 0 || pageIndex >= state.output.outputFiles.length) return;
  state.pageIndex = pageIndex;
  state.pageCount = state.output.outputFiles.length;
  const outputFile = state.output.outputFiles[pageIndex];
  const layout = state.output.layouts[pageIndex];
  showImage({
    url: outputFile.url,
    width: state.output.template.width,
    height: state.output.template.height,
    mode: 'output',
    title: `${outputFile.name} · ${state.output.groupSizes[pageIndex]} PNG`,
    layout,
  });
}

async function generate() {
  let payload;
  try {
    if (elements.createPdfDownload.checked || elements.createSingleMockups.checked) {
      const refreshed = await refreshInputAssets();
      if (!refreshed) return;
    }
    payload = validateReady({ includeAdditionalOutputs: true });
  } catch (error) {
    showError(error);
    return;
  }

  setBusy('generate', true);
  try {
    const result = unwrap(await api.generateMockups(payload));
    state.output = result;
    state.pageCount = result.outputFiles.length;
    state.pageIndex = 0;
    showOutputPage(0);
    elements.openOutputButton.classList.remove('is-hidden');
    elements.statOutput.textContent = result.outputDir;
    elements.progressFill.style.width = '100%';
    const bundleCount = result.outputFiles.length;
    const singleCount = Number(result.singleMockupCount) || result.singleMockupFiles?.length || 0;
    const pdfCount = result.pdfDownload ? 1 : 0;
    const pdfSkipped = result.pdfDownloadSkipped?.reason === 'PDF_ALREADY_EXISTS';
    const singleSkipped =
      result.singleMockupSkipped?.reason === 'SINGLE_MOCKUP_ALREADY_EXISTS';
    const totalOutputCount = bundleCount + singleCount + pdfCount;
    const outputParts = [`${bundleCount} mockup bundle`];
    if (singleCount > 0) outputParts.push(`${singleCount} mockup đơn`);
    if (pdfCount > 0) outputParts.push('1 PDF Download');
    elements.progressMessage.textContent = `Đã lưu ${outputParts.join(', ')} vào Done` +
      (singleSkipped ? '; đã bỏ qua mockup đơn vì Done đã có mockup đơn' : '') +
      (pdfSkipped ? '; đã bỏ qua PDF Download vì Done đã có PDF' : '');
    setAppStatus('Hoàn tất', 'ready');
    showToast(`Đã tạo thành công ${totalOutputCount} file.`, 'success');

    elements.dialogTitle.textContent = `Đã tạo ${totalOutputCount} file`;
    const completionNotes = [`Phân chia: ${result.groupSizes.join(' + ')} PNG.`];
    if (result.watermarkApplied) completionNotes.push(`Watermark: ${result.watermarkName}.`);
    if (singleCount > 0) completionNotes.push(`Mockup đơn: ${singleCount} file.`);
    if (singleSkipped) {
      completionNotes.push('Mockup đơn: đã bỏ qua vì Done đã có kết quả mockup đơn.');
    }
    if (result.pdfDownload) completionNotes.push(`PDF Download: ${result.pdfDownload.name}.`);
    if (pdfSkipped) {
      completionNotes.push(
        `PDF Download: đã bỏ qua vì Done đã có ${result.pdfDownloadSkipped.existingName}.`,
      );
    }
    completionNotes.push(
      result.metadataRemoved
        ? 'Đã xóa Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile.'
        : 'Giữ Metadata của ảnh nền khi định dạng đầu ra hỗ trợ.',
    );
    elements.dialogMessage.textContent = completionNotes.join(' ');
    elements.dialogDetails.textContent = result.outputDir;
    if (typeof elements.resultDialog.showModal === 'function') elements.resultDialog.showModal();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(null, false);
  }
}

async function cancelCurrentJob() {
  if (!state.busy) return;
  elements.cancelButton.disabled = true;
  elements.workingMessage.textContent = 'Đang dừng an toàn…';
  elements.progressMessage.textContent = 'Đang huỷ tác vụ và dọn file tạm…';
  try {
    await api.cancelJob();
  } catch (error) {
    showError(error);
  }
}

async function openOutputFolder() {
  if (!state.output?.outputDir) return;
  try {
    unwrap(await api.openPath(state.output.outputDir));
  } catch (error) {
    showError(error);
  }
}

function navigatePage(delta) {
  const next = state.pageIndex + delta;
  if (next < 0 || next >= state.pageCount || state.busy || state.inputAssetsSaving) return;
  if (state.viewMode === 'region') showRegionEditorPage(next);
  else if (state.viewMode === 'output') showOutputPage(next);
  else if (state.viewMode === 'preview') runPreview(next);
}

api.onProgress((progress) => {
  if (!state.busy || progress.type !== state.busyType) return;
  const percent = Math.round(Math.max(0, Math.min(1, Number(progress.fraction) || 0)) * 100);
  elements.progressFill.style.width = `${Math.max(1, percent)}%`;
  elements.progressMessage.textContent = progress.message || 'Đang xử lý…';
  elements.workingMessage.textContent = progress.message || 'Đang xử lý…';
});

api.onUpdateStatus((update) => {
  renderUpdateStatus(update);
});

elements.checkUpdateButton.addEventListener('click', checkForUpdatesManually);
elements.updateCloseButton.addEventListener('click', () => elements.updateDialog.close());
elements.updatePrimaryButton.addEventListener('click', async () => {
  try {
    await runUpdateAction(elements.updatePrimaryButton.dataset.action);
  } catch (error) {
    renderUpdateStatus({
      status: 'error',
      currentVersion: state.appInfo?.version || state.update?.currentVersion || '',
      version: state.update?.version,
      message: error.message,
      manual: true,
    }, { forceOpen: true });
  }
});
elements.chooseFolderButton.addEventListener('click', selectSourceFolder);
let fileListDragDepth = 0;
elements.fileList.addEventListener('dragenter', (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault();
  if (state.busy || state.folderScanning || state.dropScanning || state.regionEditor) return;
  fileListDragDepth += 1;
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  setFileDropState('dragging');
});
elements.fileList.addEventListener('dragover', (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect =
      state.busy || state.folderScanning || state.dropScanning || state.regionEditor
      ? 'none'
      : 'copy';
  }
});
elements.fileList.addEventListener('dragleave', (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  fileListDragDepth = Math.max(0, fileListDragDepth - 1);
  if (fileListDragDepth === 0 && !state.dropScanning) setFileDropState();
});
elements.fileList.addEventListener('drop', (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault();
  event.stopPropagation();
  fileListDragDepth = 0;
  setFileDropState();
  addDroppedPngFiles(event.dataTransfer);
});
window.addEventListener('dragover', (event) => {
  if (Array.from(event.dataTransfer?.types || []).includes('Files')) event.preventDefault();
});
window.addEventListener('drop', (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault();
  fileListDragDepth = 0;
  if (!state.dropScanning) setFileDropState();
});
elements.chooseTemplateButton.addEventListener('click', selectTemplate);
elements.watermarkFile.addEventListener('click', () => selectWatermark());
elements.removeMetadata.addEventListener('change', () => {
  elements.metadataGroups.classList.toggle('is-disabled', !elements.removeMetadata.checked);
});
elements.useWatermark.addEventListener('change', () => {
  if (elements.useWatermark.checked) {
    selectWatermark({ fromToggle: true });
  } else {
    state.watermark = null;
    renderWatermarkSummary();
    renderFileList();
    updateSelectionState();
    if (state.viewMode === 'preview') elements.statLayout.textContent = 'Cần xem trước lại';
  }
});
elements.openInputFolderButton.addEventListener('click', openInputFolder);
elements.createPdfDownload.addEventListener('change', () => {
  elements.pdfDownloadFields.classList.toggle('is-hidden', !elements.createPdfDownload.checked);
  elements.downloadUrl.classList.remove('is-invalid');
  updateControls();
  if (elements.createPdfDownload.checked) {
    window.setTimeout(() => elements.downloadUrl.focus({ preventScroll: true }), 0);
  }
});
elements.downloadUrl.addEventListener('input', () => {
  elements.downloadUrl.classList.remove('is-invalid');
});
elements.downloadUrl.addEventListener('blur', () => {
  if (!elements.createPdfDownload.checked || !elements.downloadUrl.value.trim()) return;
  try {
    readDownloadUrl();
  } catch {
    // The invalid style is enough until Generate is pressed.
  }
});
elements.createSingleMockups.addEventListener('change', async () => {
  if (elements.createSingleMockups.checked) {
    const refreshed = await refreshInputAssets();
    if (!refreshed) {
      elements.singleMockupSummary.textContent =
        'App sẽ kiểm tra Done trước khi yêu cầu ảnh mockup trong Input.';
      updateControls();
      return;
    }
    if (!elements.createSingleMockups.checked) return;
    if (state.inputAssets.singleMockupTemplates.length === 0) {
      elements.singleMockupSummary.textContent =
        'App sẽ bỏ qua nếu Done đã có mockup đơn; nếu chưa có, hãy thêm ảnh vào Input.';
      updateControls();
      return;
    }
    const missing = templatesMissingRegions();
    if (missing.length > 0) elements.advancedSettings.open = true;
    elements.singleRegionStatus.textContent = missing.length > 0
      ? `Cần chỉnh và lưu vùng in cho ${missing.length} ảnh trước khi tạo.`
      : `Sẽ tạo ${state.inputAssets.singleMockupTemplates.length} mockup đơn.`;
  } else {
    renderInputAssets();
  }
  updateControls();
});
elements.editSingleMockupRegions.addEventListener('change', async () => {
  if (elements.editSingleMockupRegions.checked) await enterRegionEditor();
  else exitRegionEditor({ notifyUnsaved: true });
});
elements.saveSingleMockupRegions.addEventListener('click', saveRegionEditor);
elements.printRegion.addEventListener('pointerdown', beginPrintRegionDrag);
elements.printRegion.addEventListener('pointermove', movePrintRegionDrag);
elements.printRegion.addEventListener('pointerup', endPrintRegionDrag);
elements.printRegion.addEventListener('pointercancel', endPrintRegionDrag);
elements.printRegion.addEventListener('lostpointercapture', (event) => {
  if (state.regionEditor?.drag?.pointerId === event.pointerId) state.regionEditor.drag = null;
  elements.printRegion.classList.remove('is-dragging');
});
elements.fileSearch.addEventListener('input', renderFileList);
elements.selectAllButton.addEventListener('click', () => {
  for (const file of state.files.filter(currentFilterMatches)) {
    if (!file.error && !isTemplateFile(file) && !isWatermarkFile(file)) {
      state.selected.add(file.path);
    }
  }
  renderFileList();
  updateSelectionState();
});
elements.selectNoneButton.addEventListener('click', () => {
  for (const file of state.files.filter(currentFilterMatches)) state.selected.delete(file.path);
  renderFileList();
  updateSelectionState();
});
elements.previewButton.addEventListener('click', () => runPreview(0));
elements.generateButton.addEventListener('click', generate);
elements.cancelButton.addEventListener('click', cancelCurrentJob);
elements.openOutputButton.addEventListener('click', openOutputFolder);
elements.dialogOpenFolder.addEventListener('click', (event) => {
  event.preventDefault();
  elements.resultDialog.close();
  openOutputFolder();
});
elements.previousPageButton.addEventListener('click', () => navigatePage(-1));
elements.nextPageButton.addEventListener('click', () => navigatePage(1));
elements.sourcePickerSearch.addEventListener('input', renderSourcePicker);
elements.sourcePickerSelectAll.addEventListener('click', () => {
  if (!state.sourcePicker) return;
  for (const file of sourcePickerVisibleFiles()) {
    if (!sourcePickerFileDisabled(file)) state.sourcePicker.selected.add(file.path);
  }
  renderSourcePicker();
});
elements.sourcePickerSelectNone.addEventListener('click', () => {
  if (!state.sourcePicker) return;
  for (const file of sourcePickerVisibleFiles()) state.sourcePicker.selected.delete(file.path);
  renderSourcePicker();
});
elements.sourcePickerConfirm.addEventListener('click', commitSourcePicker);
elements.sourcePickerCancel.addEventListener('click', closeSourcePicker);
elements.sourcePickerClose.addEventListener('click', closeSourcePicker);
elements.sourcePickerDialog.addEventListener('close', () => {
  state.sourcePicker = null;
  elements.sourcePickerSearch.value = '';
  window.setTimeout(() => elements.chooseFolderButton.focus(), 0);
});

for (const input of settingInputs) {
  input.addEventListener('input', () => {
    input.classList.remove('is-invalid');
    savePreferences();
    updateDistribution();
    updateControls();
    if (state.viewMode === 'template') updateSafeZone();
  });
}

let inputAssetsFocusTimer = null;
window.addEventListener('focus', () => {
  if (state.busy || state.regionEditor || state.inputAssetsLoading || state.inputAssetsSaving) return;
  window.clearTimeout(inputAssetsFocusTimer);
  inputAssetsFocusTimer = window.setTimeout(() => refreshInputAssets({ silent: true }), 250);
});
window.addEventListener('resize', fitImageFrame);
initializeAppInfo();
loadPreferences();
renderTemplateSummary();
renderWatermarkSummary();
renderInputAssets();
elements.metadataGroups.classList.toggle('is-disabled', !elements.removeMetadata.checked);
renderFileList();
updateSelectionState();
updateControls();
refreshInputAssets({ silent: true });
