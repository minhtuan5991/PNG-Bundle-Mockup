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
  mockupCount: document.querySelector('#mockupCount'),
  gap: document.querySelector('#gap'),
  topMargin: document.querySelector('#topMargin'),
  bottomMargin: document.querySelector('#bottomMargin'),
  sideMargin: document.querySelector('#sideMargin'),
  alphaThreshold: document.querySelector('#alphaThreshold'),
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
  files: [],
  selected: new Set(),
  template: null,
  watermark: null,
  sourcePicker: null,
  folderScanning: false,
  busy: false,
  busyType: null,
  display: null,
  viewMode: 'empty',
  pageIndex: 0,
  pageCount: 1,
  previewLayout: null,
  output: null,
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

function showUpdateDialog() {
  if (!elements.updateDialog.open && typeof elements.updateDialog.showModal === 'function') {
    elements.updateDialog.showModal();
  }
}

function setUpdateIcon(symbol, className = '') {
  elements.updateIcon.textContent = symbol;
  elements.updateIcon.className = `update-icon${className ? ` ${className}` : ''}`;
}

function setUpdatePrimary(label, action, { disabled = false, hidden = false } = {}) {
  elements.updatePrimaryButton.textContent = label;
  elements.updatePrimaryButton.dataset.action = action;
  elements.updatePrimaryButton.disabled = disabled;
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
    renderEmptyList(state.sourceDirectory ? 'Thư mục này không có file PNG.' : 'File PNG trong thư mục sẽ xuất hiện ở đây.');
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

function validateReady() {
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
  return {
    sourcePaths: files.map((file) => file.path),
    templatePath: state.template.path,
    sourceDirectory: state.sourceDirectory,
    mockupCount,
    settings,
    removeMetadata: elements.removeMetadata.checked,
    watermarkPath: elements.useWatermark.checked ? state.watermark.path : null,
  };
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
  if (state.busy) return;
  const hasFiles = selectedFiles().length > 0;
  const ready = Boolean(state.sourceDirectory && state.template && hasFiles);
  elements.previewButton.disabled = !ready;
  elements.generateButton.disabled = !ready;
  elements.selectAllButton.disabled = state.files.length === 0;
  elements.selectNoneButton.disabled = state.selected.size === 0;
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

function updatePageNavigation() {
  const visible = state.pageCount > 1 && (state.viewMode === 'preview' || state.viewMode === 'output');
  elements.pageNavigation.classList.toggle('is-hidden', !visible);
  elements.pageLabel.textContent = `${state.pageIndex + 1} / ${state.pageCount}`;
  elements.previousPageButton.disabled = state.busy || state.pageIndex <= 0;
  elements.nextPageButton.disabled = state.busy || state.pageIndex >= state.pageCount - 1;
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
  elements.cancelButton.classList.toggle('is-hidden', !busy);
  elements.cancelButton.disabled = false;
  elements.previewButton.classList.toggle('is-hidden', busy);
  elements.generateButton.classList.toggle('is-hidden', busy);
  elements.cancelButton.parentElement.style.gridTemplateColumns = busy ? '1fr' : '';
  elements.workingOverlay.classList.toggle('is-hidden', !busy);
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
  if (state.folderScanning || state.busy) return;
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
    payload = validateReady();
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
    elements.progressMessage.textContent = `Đã lưu ${result.outputFiles.length} mockup vào Done`;
    setAppStatus('Hoàn tất', 'ready');
    showToast(`Đã tạo thành công ${result.outputFiles.length} mockup.`, 'success');

    elements.dialogTitle.textContent = `Đã tạo ${result.outputFiles.length} mockup`;
    const completionNotes = [`Phân chia: ${result.groupSizes.join(' + ')} PNG.`];
    if (result.watermarkApplied) completionNotes.push(`Watermark: ${result.watermarkName}.`);
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
  if (next < 0 || next >= state.pageCount || state.busy) return;
  if (state.viewMode === 'output') showOutputPage(next);
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

window.addEventListener('resize', fitImageFrame);
window.addEventListener('beforeunload', () => {
  if (state.busy) api.cancelJob();
});

initializeAppInfo();
loadPreferences();
renderTemplateSummary();
renderWatermarkSummary();
elements.metadataGroups.classList.toggle('is-disabled', !elements.removeMetadata.checked);
renderFileList();
updateSelectionState();
updateControls();
