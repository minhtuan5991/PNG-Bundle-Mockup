'use strict';

const api = window.bundleApi;
const groupShirtMatching = window.groupShirtMatching;

if (!groupShirtMatching) {
  throw new Error('Không thể nạp bộ quy tắc ghép Mockup Group Shirt.');
}

const elements = {
  appTitle: document.querySelector('#appTitle'),
  appStatus: document.querySelector('#appStatus'),
  cleanupDataButton: document.querySelector('#cleanupDataButton'),
  checkUpdateButton: document.querySelector('#checkUpdateButton'),
  controlsPanel: document.querySelector('#controlsPanel'),
  chooseFolderButton: document.querySelector('#chooseFolderButton'),
  sourcePath: document.querySelector('#sourcePath'),
  fileSearch: document.querySelector('#fileSearch'),
  selectAllButton: document.querySelector('#selectAllButton'),
  selectNoneButton: document.querySelector('#selectNoneButton'),
  removePngButton: document.querySelector('#removePngButton'),
  renamePngButton: document.querySelector('#renamePngButton'),
  groupRenameHint: document.querySelector('#groupRenameHint'),
  fileList: document.querySelector('#fileList'),
  selectionCount: document.querySelector('#selectionCount'),
  mockupModeBundle: document.querySelector('#mockupModeBundle'),
  mockupModeGroup: document.querySelector('#mockupModeGroup'),
  bundleTemplatePanel: document.querySelector('#bundleTemplatePanel'),
  groupTemplatePanel: document.querySelector('#groupTemplatePanel'),
  chooseTemplateButton: document.querySelector('#chooseTemplateButton'),
  templateThumb: document.querySelector('#templateThumb'),
  templateName: document.querySelector('#templateName'),
  templateMeta: document.querySelector('#templateMeta'),
  chooseGroupTemplatesButton: document.querySelector('#chooseGroupTemplatesButton'),
  groupTemplateSummary: document.querySelector('#groupTemplateSummary'),
  groupTemplateList: document.querySelector('#groupTemplateList'),
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
  pdfOptionBlock: document.querySelector('#pdfOptionBlock'),
  pdfDownloadFields: document.querySelector('#pdfDownloadFields'),
  downloadUrl: document.querySelector('#downloadUrl'),
  pdfTemplateSummary: document.querySelector('#pdfTemplateSummary'),
  createSingleMockups: document.querySelector('#createSingleMockups'),
  singleMockupOptionHelp: document.querySelector('#singleMockupOptionHelp'),
  groupSingleMockupPicker: document.querySelector('#groupSingleMockupPicker'),
  groupSingleMockupTemplateSummary: document.querySelector('#groupSingleMockupTemplateSummary'),
  chooseGroupSingleTemplatesButton: document.querySelector('#chooseGroupSingleTemplatesButton'),
  singleMockupSummary: document.querySelector('#singleMockupSummary'),
  editSingleMockupRegions: document.querySelector('#editSingleMockupRegions'),
  saveSingleMockupRegions: document.querySelector('#saveSingleMockupRegions'),
  singleRegionStatus: document.querySelector('#singleRegionStatus'),
  bundleSettingsPanel: document.querySelector('#bundleSettingsPanel'),
  bundleMarginSettingsPanel: document.querySelector('#bundleMarginSettingsPanel'),
  groupSettingsPanel: document.querySelector('#groupSettingsPanel'),
  groupReadinessSummary: document.querySelector('#groupReadinessSummary'),
  editGroupMockupRegions: document.querySelector('#editGroupMockupRegions'),
  saveGroupMockupRegions: document.querySelector('#saveGroupMockupRegions'),
  groupRegionTools: document.querySelector('#groupRegionTools'),
  addFrontRegionButton: document.querySelector('#addFrontRegionButton'),
  addBackRegionButton: document.querySelector('#addBackRegionButton'),
  groupRegionColorLight: document.querySelector('#groupRegionColorLight'),
  groupRegionColorDark: document.querySelector('#groupRegionColorDark'),
  deleteGroupRegionButton: document.querySelector('#deleteGroupRegionButton'),
  groupRegionStatus: document.querySelector('#groupRegionStatus'),
  groupRegionInspector: document.querySelector('#groupRegionInspector'),
  groupRegionSelectionStatus: document.querySelector('#groupRegionSelectionStatus'),
  groupRegionX: document.querySelector('#groupRegionX'),
  groupRegionY: document.querySelector('#groupRegionY'),
  groupRegionWidth: document.querySelector('#groupRegionWidth'),
  groupRegionHeight: document.querySelector('#groupRegionHeight'),
  groupRegionRotation: document.querySelector('#groupRegionRotation'),
  rotateGroupRegionLeft: document.querySelector('#rotateGroupRegionLeft'),
  rotateGroupRegionRight: document.querySelector('#rotateGroupRegionRight'),
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
  regionLayer: document.querySelector('#regionLayer'),
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
  renamePngDialog: document.querySelector('#renamePngDialog'),
  renamePngClose: document.querySelector('#renamePngClose'),
  renamePngSearch: document.querySelector('#renamePngSearch'),
  renamePngSelectAll: document.querySelector('#renamePngSelectAll'),
  renamePngSelectNone: document.querySelector('#renamePngSelectNone'),
  renamePngGrid: document.querySelector('#renamePngGrid'),
  renamePngCount: document.querySelector('#renamePngCount'),
  renameColorNone: document.querySelector('#renameColorNone'),
  renameColorLight: document.querySelector('#renameColorLight'),
  renameColorDark: document.querySelector('#renameColorDark'),
  renameSideNone: document.querySelector('#renameSideNone'),
  renameSideFront: document.querySelector('#renameSideFront'),
  renameSideBack: document.querySelector('#renameSideBack'),
  renamePngPreview: document.querySelector('#renamePngPreview'),
  renamePngError: document.querySelector('#renamePngError'),
  renamePngCancel: document.querySelector('#renamePngCancel'),
  renamePngApply: document.querySelector('#renamePngApply'),
  renamePngConfirm: document.querySelector('#renamePngConfirm'),
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
  mockupMode: 'bundle',
  template: null,
  groupTemplates: [],
  groupSingleMockupTemplates: [],
  watermark: null,
  sourcePicker: null,
  renamePicker: null,
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
  const fileKey = normalizePath(file.path);
  return Boolean(
    (state.template && fileKey === normalizePath(state.template.path)) ||
    state.groupTemplates.some((template) => fileKey === normalizePath(template.path)) ||
    state.groupSingleMockupTemplates.some((template) => fileKey === normalizePath(template.path))
  );
}

function normalizeGroupKey(value) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function parseGroupSourceName(fileName) {
  const name = String(fileName || '');
  if (!/\.png$/i.test(name)) {
    return { valid: false, error: 'Chỉ hỗ trợ PNG.' };
  }
  let baseStem = name.replace(/\.png$/i, '').trimEnd();
  const tags = [];
  while (true) {
    const markerMatch = baseStem.match(/\.([a-z]{1,3})\s*$/iu);
    if (!markerMatch || !/^(wh|bl|f|b)$/i.test(markerMatch[1])) break;
    const marker = markerMatch[1].toLocaleLowerCase('en-US');
    if (tags.includes(marker)) {
      return { valid: false, error: `Tên đang lặp tag .${marker}.` };
    }
    tags.unshift(marker);
    baseStem = baseStem.slice(0, markerMatch.index).trimEnd();
  }
  const colors = tags.filter((tag) => tag === 'wh' || tag === 'bl');
  const sides = tags.filter((tag) => tag === 'f' || tag === 'b');
  if (colors.length > 1 || sides.length > 1) {
    return { valid: false, error: 'Tên có tag màu hoặc mặt áo xung đột.' };
  }
  const match = baseStem.match(/^(.+?)\s*\(\s*([1-9]\d*)\s*\)\s*$/u);
  if (!match || !Number.isSafeInteger(Number(match[2]))) {
    return { valid: false, error: 'Tên cần có dạng Nhóm (số).png.' };
  }
  return {
    valid: true,
    base: baseStem,
    baseStem,
    tags,
    displayGroup: match[1].trim(),
    groupKey: normalizeGroupKey(match[1]),
    ordinal: Number(match[2]),
    explicitColor: colors[0] || null,
    explicitSide: sides[0] || null,
    color: colors[0] || 'wh',
    side: sides[0] || 'f',
  };
}

function groupRegionTrackKey(color, side) {
  return `${color === 'bl' ? 'bl' : 'wh'}\u0000${side === 'b' || side === 'back' ? 'back' : 'front'}`;
}

function groupSourceDirectory(file) {
  return String(file?.directory || state.sourceDirectory || '').trim();
}

function groupProfile(descriptors) {
  return groupShirtMatching.groupShirtProfile(
    descriptors.map((item) => item.parsed),
  );
}

function groupTemplateCompatibility(group, template) {
  const regions = Array.isArray(template.regions) ? template.regions : [];
  return groupShirtMatching.matchGroupShirtTemplate(
    group.profile,
    group.descriptors.map((item) => item.parsed),
    regions,
  );
}

function analyzeGroupShirtSetup() {
  const descriptors = groupSourceDescriptors();
  const invalid = descriptors.filter((item) => !item.parsed.valid);
  const sourceGroups = new Map();
  const logicalSlots = new Map();
  const logicalDuplicates = [];

  for (const descriptor of descriptors.filter((item) => item.parsed.valid)) {
    const { parsed } = descriptor;
    if (!sourceGroups.has(parsed.groupKey)) {
      sourceGroups.set(parsed.groupKey, {
        key: parsed.groupKey,
        displayGroup: parsed.displayGroup,
        groupKey: parsed.groupKey,
        descriptors: [],
        profile: 'plain',
      });
    }
    sourceGroups.get(parsed.groupKey).descriptors.push(descriptor);
    const slot = `${parsed.groupKey}\u0000${parsed.color}\u0000${parsed.side}\u0000${parsed.ordinal}`;
    if (logicalSlots.has(slot)) {
      logicalDuplicates.push({ first: logicalSlots.get(slot), duplicate: descriptor });
    } else {
      logicalSlots.set(slot, descriptor);
    }
  }
  for (const group of sourceGroups.values()) group.profile = groupProfile(group.descriptors);

  const matchedTemplateSet = new Set();
  const regionIssues = [];
  for (const group of sourceGroups.values()) {
    const compatible = [];
    const incompatible = [];
    for (const template of state.groupTemplates) {
      const match = groupTemplateCompatibility(group, template);
      if (match.compatible) compatible.push({ template, match });
      else incompatible.push({ template, group, message: match.reason, match });
    }
    for (const item of compatible) matchedTemplateSet.add(item.template);

    const groupSources = group.descriptors.map((item) => item.parsed);
    const missingPoolKeys = groupShirtMatching.missingSourcePoolKeys(
      group.profile,
      groupSources,
      compatible.map((item) => item.match),
    );
    if (
      state.groupTemplates.length > 0 &&
      (compatible.length === 0 || missingPoolKeys.length > 0)
    ) {
      const missingMessage = missingPoolKeys.length > 0
        ? `thiếu ảnh nền cho ${missingPoolKeys.map(groupShirtMatching.poolLabel).join(', ')}`
        : null;
      regionIssues.push({
        group,
        template: incompatible[0]?.template || compatible[0]?.template || null,
        message: missingMessage || incompatible[0]?.message || 'không có vùng in phù hợp',
        incompatible,
        missingPoolKeys,
      });
    }
  }
  const matchedTemplates = state.groupTemplates.filter((template) => matchedTemplateSet.has(template));
  const unusedTemplates = state.groupTemplates.filter((template) => !matchedTemplateSet.has(template));
  return {
    descriptors,
    invalid,
    sourceGroups,
    logicalDuplicates,
    matchedTemplates,
    unusedTemplates: [...new Set(unusedTemplates)],
    regionIssues,
  };
}
function groupSourceDescriptors() {
  return selectedFiles().map((file) => ({ file, parsed: parseGroupSourceName(file.name) }));
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

function activeSingleMockupTemplates() {
  return state.mockupMode === 'group-shirt'
    ? state.groupSingleMockupTemplates
    : state.inputAssets.singleMockupTemplates;
}

function templatesMissingRegions() {
  return activeSingleMockupTemplates().filter((template) => !template.region);
}

function renderInputAssets() {
  const {
    inputDirectory,
    pdfTemplates,
    singleMockupTemplates,
    warnings = [],
  } = state.inputAssets;
  const pdfCount = pdfTemplates.length;
  const activeSingleTemplates = activeSingleMockupTemplates();
  const singleCount = activeSingleTemplates.length;
  const configuredCount = activeSingleTemplates.filter((template) => template.region).length;
  const groupMode = state.mockupMode === 'group-shirt';
  elements.inputAssetSummary.title = inputDirectory || '';
  elements.groupSingleMockupPicker.classList.toggle('is-hidden', !groupMode);
  elements.singleMockupOptionHelp.textContent = groupMode
    ? 'Chọn nhiều ảnh nền riêng và ghép ngẫu nhiên PNG áo sáng của các nhóm.'
    : 'Ghép PNG ngẫu nhiên lên từng ảnh áo, cốc, túi… trong Input.';

  if (!state.inputAssetsLoaded && state.inputAssetsLoading) {
    elements.inputAssetSummary.textContent = 'Đang kiểm tra PDF và ảnh mockup đơn…';
  } else if (!state.inputAssetsLoaded) {
    elements.inputAssetSummary.textContent = 'Chưa đọc được thư mục Input.';
  } else {
    const warningSuffix = warnings.length > 0 ? ` · ${warnings.length} ảnh lỗi` : '';
    elements.inputAssetSummary.textContent =
      `${pdfCount} PDF · ${singleMockupTemplates.length} ảnh mockup đơn${warningSuffix}`;
  }

  if (pdfCount === 0) {
    elements.pdfTemplateSummary.textContent = 'Chưa tìm thấy PDF mẫu trong Input.';
  } else if (pdfCount === 1) {
    const template = pdfTemplates[0];
    elements.pdfTemplateSummary.textContent = `${template.name} · ${formatBytes(template.size)}`;
  } else {
    elements.pdfTemplateSummary.textContent = `Có ${pdfCount} PDF. Hãy chỉ giữ lại 1 file PDF mẫu trong Input.`;
  }

  if (groupMode) {
    elements.groupSingleMockupTemplateSummary.textContent = singleCount === 0
      ? 'Chưa chọn ảnh nền mockup đơn.'
      : `${singleCount} ảnh · đã có vùng in ${configuredCount}/${singleCount}.`;
  }

  if (singleCount === 0) {
    elements.singleMockupSummary.textContent = groupMode
      ? 'Bật Tạo mockup đơn rồi chọn các ảnh nền cần dùng.'
      : warnings.length > 0
      ? `Không có ảnh mockup hợp lệ. Ảnh lỗi: ${warnings.map((item) => item.name).join(', ')}.`
      : 'Chưa có ảnh mockup đơn trong Input.';
  } else {
    const names = activeSingleTemplates.slice(0, 3).map((template) => template.name).join(', ');
    const remainder = singleCount > 3 ? ` và ${singleCount - 3} ảnh khác` : '';
    elements.singleMockupSummary.textContent =
      `${singleCount} ảnh · đã thiết lập ${configuredCount}/${singleCount}: ${names}${remainder}.`;
    if (!groupMode && warnings.length > 0) {
      elements.singleMockupSummary.textContent +=
        ` Đã bỏ qua ${warnings.length} ảnh lỗi: ${warnings.map((item) => item.name).join(', ')}.`;
    }
  }

  if (!state.regionEditor) {
    elements.singleRegionStatus.textContent = singleCount === 0
      ? groupMode
        ? 'Chọn ảnh nền mockup đơn cho Group Shirt để thiết lập vùng in.'
        : 'Thêm ảnh mockup đơn vào Input để thiết lập vùng in.'
      : configuredCount === singleCount
        ? `Đã lưu vùng in cho ${singleCount}/${singleCount} ảnh mockup.`
        : `Còn ${singleCount - configuredCount} ảnh chưa có vùng in.`;
  }

  elements.pdfDownloadFields.classList.toggle(
    'is-hidden',
    !elements.createPdfDownload.checked,
  );
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
  if (options.createSingleMockups && state.mockupMode === 'group-shirt') {
    options.singleTemplatePaths = state.groupSingleMockupTemplates.map((template) => template.path);
  }
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
    if (state.mockupMode === 'group-shirt' && !file.error && !template && !watermark) {
      const parsed = parseGroupSourceName(file.name);
      const tags = document.createElement('span');
      tags.className = `group-file-tags${parsed.valid ? '' : ' is-invalid'}`;
      tags.textContent = parsed.valid
        ? `Nhóm ${parsed.displayGroup} · ${parsed.color === 'wh' ? 'áo sáng' : 'áo tối'} · ${parsed.side === 'f' ? 'mặt trước' : 'mặt sau'}`
        : parsed.error;
      copy.append(tags);
    }

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

function renameSelectionFiles() {
  if (!state.renamePicker) return [];
  const query = elements.renamePngSearch.value.trim().toLocaleLowerCase();
  return selectedFiles().filter((file) => !query || file.name.toLocaleLowerCase().includes(query));
}

function selectedRenameFiles() {
  if (!state.renamePicker) return [];
  return selectedFiles().filter((file) => state.renamePicker.selected.has(file.path));
}

function selectedRenameCategory() {
  const color = elements.renameColorLight.checked
    ? 'wh'
    : elements.renameColorDark.checked ? 'bl' : null;
  const side = elements.renameSideFront.checked
    ? 'f'
    : elements.renameSideBack.checked ? 'b' : null;
  return { color, side };
}

function rewriteGroupPngName(fileName, color, side) {
  const parsed = parseGroupSourceName(fileName);
  if (!parsed.valid) return fileName;
  const currentColor = parsed.explicitColor;
  const currentSide = parsed.explicitSide;
  const nextColor = color || currentColor;
  const nextSide = side || currentSide;
  return `${parsed.baseStem}${nextColor ? `.${nextColor}` : ''}${nextSide ? `.${nextSide}` : ''}.png`;
}

function renderRenamePngDialog() {
  if (!state.renamePicker) return;
  const saving = Boolean(state.renamePicker.saving);
  const visible = renameSelectionFiles();
  const { color, side } = selectedRenameCategory();
  elements.renamePngGrid.textContent = '';
  for (const file of visible) {
    const checked = state.renamePicker.selected.has(file.path);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `rename-png-tile${checked ? ' is-selected' : ''}`;
    tile.disabled = saving;
    tile.setAttribute('aria-pressed', String(checked));
    const image = document.createElement('img');
    image.src = file.url;
    image.alt = '';
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = file.name;
    const next = document.createElement('small');
    const parsed = parseGroupSourceName(file.name);
    next.textContent = !checked
      ? 'Không đổi tên'
      : parsed.valid
        ? rewriteGroupPngName(file.name, color, side)
        : `Không thể đổi: ${parsed.error}`;
    copy.append(name, next);
    tile.append(image, copy);
    tile.addEventListener('click', () => {
      if (state.renamePicker?.saving) return;
      state.renamePicker.error = '';
      if (state.renamePicker.selected.has(file.path)) state.renamePicker.selected.delete(file.path);
      else state.renamePicker.selected.add(file.path);
      renderRenamePngDialog();
    });
    elements.renamePngGrid.append(tile);
  }
  const selectedFilesForRename = selectedRenameFiles();
  elements.renamePngCount.textContent = `Đã chọn ${selectedFilesForRename.length}/${selectedFiles().length} PNG để đổi tên`;
  elements.renamePngPreview.textContent = selectedFilesForRename.length === 0
    ? 'Chọn ít nhất một PNG.'
    : `Sẽ ${color ? `gắn .${color}` : 'giữ nguyên tag màu'} và ${side ? `gắn .${side}` : 'giữ nguyên tag mặt áo'} cho ${selectedFilesForRename.length} file.`;
  const invalid = selectedFilesForRename.find((file) => !parseGroupSourceName(file.name).valid);
  const targetNames = selectedFilesForRename.map((file) => rewriteGroupPngName(file.name, color, side).toLocaleLowerCase());
  const duplicate = targetNames.find((name, index) => targetNames.indexOf(name) !== index);
  const validationError = invalid
    ? `${invalid.name}: ${parseGroupSourceName(invalid.name).error}`
    : duplicate ? `Tên đích bị trùng: ${duplicate}` : '';
  elements.renamePngError.textContent = state.renamePicker.error || validationError;
  const submitDisabled =
    saving || selectedFilesForRename.length === 0 || Boolean(validationError) || (!color && !side);
  elements.renamePngApply.textContent = saving && !state.renamePicker.closeAfterSave
    ? 'Đang đổi tên…'
    : 'Đổi Tên';
  elements.renamePngConfirm.textContent = saving && state.renamePicker.closeAfterSave
    ? 'Đang đổi tên…'
    : 'Đổi tên và Đóng';
  elements.renamePngApply.disabled = submitDisabled;
  elements.renamePngConfirm.disabled = submitDisabled;
  elements.renamePngSelectAll.disabled = saving || visible.length === 0;
  elements.renamePngSelectNone.disabled = saving || state.renamePicker.selected.size === 0;
  elements.renamePngSearch.disabled = saving;
  elements.renamePngCancel.disabled = saving;
  elements.renamePngClose.disabled = saving;
  for (const input of [
    elements.renameColorNone,
    elements.renameColorLight,
    elements.renameColorDark,
    elements.renameSideNone,
    elements.renameSideFront,
    elements.renameSideBack,
  ]) input.disabled = saving;
}

function openRenamePngDialog() {
  if (state.mockupMode !== 'group-shirt' || state.busy || state.regionEditor) return;
  if (selectedFiles().length === 0) {
    showError(new Error('Hãy chọn PNG trước khi đổi tên.'));
    return;
  }
  state.renamePicker = {
    selected: new Set(),
    saving: false,
    closeAfterSave: false,
    error: '',
  };
  elements.renamePngSearch.value = '';
  elements.renameColorNone.checked = true;
  elements.renameSideNone.checked = true;
  renderRenamePngDialog();
  elements.renamePngDialog.showModal();
}

function closeRenamePngDialog() {
  if (state.renamePicker?.saving) return;
  if (elements.renamePngDialog.open) elements.renamePngDialog.close();
}

async function applyRenamePngFiles(closeAfterSave = false) {
  if (!state.renamePicker || state.renamePicker.saving) return;
  const picker = state.renamePicker;
  const filePaths = selectedRenameFiles().map((file) => file.path);
  const { color, side } = selectedRenameCategory();
  if (filePaths.length === 0) return;
  if (!color && !side) {
    showError(new Error('Hãy chọn ít nhất một tag màu áo hoặc mặt áo cần gắn.'));
    return;
  }
  if (!window.confirm(`Đổi tên thật ${filePaths.length} file PNG trên máy? App sẽ kiểm tra trùng tên trước khi thay đổi.`)) return;
  picker.saving = true;
  picker.closeAfterSave = closeAfterSave;
  picker.error = '';
  renderRenamePngDialog();
  try {
    const result = unwrap(await api.renameGroupShirtPngFiles({ filePaths, color, side }));
    const mappings = new Map((result.mappings || []).map((item) => [normalizePath(item.oldPath), item.file]));
    picker.selected = new Set([...picker.selected].map((filePath) => {
      const renamed = mappings.get(normalizePath(filePath));
      return renamed ? renamed.path : filePath;
    }));
    state.files = state.files.map((file) => mappings.get(normalizePath(file.path)) || file);
    state.selected = new Set([...state.selected].map((filePath) => {
      const renamed = mappings.get(normalizePath(filePath));
      return renamed ? renamed.path : filePath;
    }));
    picker.saving = false;
    if (closeAfterSave) closeRenamePngDialog();
    renderFileList();
    updateSelectionState();
    renderGroupReadiness();
    showToast(`Đã đổi tên ${mappings.size} file PNG.`, 'success');
  } catch (error) {
    if (state.renamePicker === picker) picker.error = error.message;
    showError(error);
  } finally {
    if (state.renamePicker === picker) {
      picker.saving = false;
      picker.closeAfterSave = false;
      renderRenamePngDialog();
    }
  }
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
  state.files = chosenFiles.map((file) => ({
    ...file,
    directory: file.directory || pending.folderPath,
  }));
  state.selected = new Set(state.files.map((file) => file.path));
  state.output = null;
  elements.openOutputButton.classList.add('is-hidden');
  elements.sourcePath.textContent = pending.folderPath;
  elements.sourcePath.title = pending.folderPath;
  elements.sourcePath.classList.remove('is-empty');
  elements.statOutput.textContent = `${pending.folderPath}\\Done`;
  closeSourcePicker();
  renderFileList();
  updateSelectionState();
  restorePreviewAfterRegionEditor(null);
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
  restorePreviewAfterRegionEditor(null);

  return {
    additions,
    duplicateCount,
    selectedCount: additions.filter(
      (file) => !file.error && !isTemplateFile(file) && !isWatermarkFile(file),
    ).length,
  };
}

function clearPngFiles() {
  if (
    state.busy || state.folderScanning || state.dropScanning || state.regionEditor ||
    state.files.length === 0
  ) return;

  const removedCount = state.files.length;
  state.sourceDirectory = null;
  state.sourceDirectories = new Set();
  state.files = [];
  state.selected = new Set();
  state.sourcePicker = null;
  state.output = null;
  state.previewLayout = null;
  api.clearSourceAuthorization().catch(() => {});
  elements.fileSearch.value = '';
  elements.openOutputButton.classList.add('is-hidden');
  setFileDropState();
  renderSourcePathSummary();
  renderFileList();
  updateSelectionState();
  restorePreviewAfterRegionEditor(null);
  setAppStatus('Sẵn sàng', 'ready');
  showToast(
    `Đã loại bỏ ${removedCount} PNG khỏi danh sách. File gốc vẫn được giữ nguyên.`,
    'success',
    3600,
  );
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

function validateBundleReady({ includeAdditionalOutputs = false } = {}) {
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
    mode: 'bundle',
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

function validateGroupReady({ includeAdditionalOutputs = false } = {}) {
  const files = selectedFiles();
  if (!state.sourceDirectory) throw new Error('Hãy chọn thư mục chứa PNG.');
  if (files.length === 0) throw new Error('Hãy chọn ít nhất một file PNG hợp lệ.');
  const directoryEntries = files.map((file) => ({
    file,
    directory: groupSourceDirectory(file),
  }));
  const missingDirectory = directoryEntries.find((item) => !item.directory);
  if (missingDirectory) {
    throw new Error(`Không xác định được thư mục của ${missingDirectory.file.name}. Hãy nạp lại PNG.`);
  }
  const directories = new Set(directoryEntries.map((item) => normalizePath(item.directory)));
  if (directories.size !== 1) {
    throw new Error('Mockup Group Shirt yêu cầu các PNG nằm trong cùng một thư mục để tạo một thư mục Done rõ ràng.');
  }
  const selectedSourceDirectory = directoryEntries[0].directory;
  const analysis = analyzeGroupShirtSetup();
  if (analysis.invalid.length > 0) {
    throw new Error(`Tên PNG chưa hợp lệ: ${analysis.invalid.slice(0, 3).map((item) => item.file.name).join(', ')}. Dùng dạng “Nhóm (số).wh.f.png” và không lặp tag.`);
  }
  if (analysis.logicalDuplicates.length > 0) {
    const duplicate = analysis.logicalDuplicates[0].duplicate;
    throw new Error(
      `Nhóm “${duplicate.parsed.displayGroup}” có nhiều PNG trùng màu, mặt và số thứ tự ${duplicate.parsed.ordinal}.`,
    );
  }
  if (state.groupTemplates.length === 0) {
    throw new Error('Hãy chọn ít nhất một ảnh nền có marker mgs cho Mockup Group Shirt.');
  }
  if (analysis.regionIssues.length > 0) {
    const issue = analysis.regionIssues[0];
    const example = issue.template ? ` Ví dụ “${issue.template.name}”: ${issue.message}.` : '';
    throw new Error(
      `Không có ảnh nền mgs có vùng in phù hợp cho nhóm “${issue.group.displayGroup}”.${example}`,
    );
  }
  if (elements.useWatermark.checked && !state.watermark) {
    throw new Error('Hãy chọn file watermark PNG nền trong suốt.');
  }
  const settings = {
    alphaThreshold: readInteger(elements.alphaThreshold, 'Ngưỡng alpha', 0, 254),
  };
  const payload = {
    mode: 'group-shirt',
    sourcePaths: files.map((file) => file.path),
    sourceDirectory: selectedSourceDirectory,
    templatePaths: state.groupTemplates.map((template) => template.path),
    settings,
    removeMetadata: elements.removeMetadata.checked,
    watermarkPath: elements.useWatermark.checked ? state.watermark.path : null,
  };
  if (includeAdditionalOutputs) Object.assign(payload, readAdditionalGenerationOptions());
  return payload;
}
function validateReady(options = {}) {
  return state.mockupMode === 'group-shirt'
    ? validateGroupReady(options)
    : validateBundleReady(options);
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
  elements.selectionCount.textContent = `Đã chọn ${selected}/${valid} PNG`;
  elements.statSelected.textContent = String(selected);
  updateDistribution();
  if (state.mockupMode === 'group-shirt') renderGroupReadiness();
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
  const groupMode = state.mockupMode === 'group-shirt';
  const editorSaving = state.inputAssetsSaving;
  const ready = Boolean(
    state.sourceDirectory && hasFiles &&
    (groupMode ? state.groupTemplates.length > 0 : state.template),
  );
  elements.chooseFolderButton.disabled = scanning || editorActive;
  elements.mockupModeBundle.disabled = editorSaving;
  elements.mockupModeGroup.disabled = editorSaving;
  elements.chooseTemplateButton.disabled = editorActive;
  elements.chooseGroupTemplatesButton.disabled = editorActive || scanning;
  elements.chooseGroupSingleTemplatesButton.disabled =
    editorActive || scanning || state.inputAssetsSaving;
  elements.cleanupDataButton.disabled =
    scanning || state.inputAssetsLoading || state.inputAssetsSaving || editorActive;
  elements.renamePngButton.disabled = scanning || !hasFiles || editorActive;
  elements.watermarkFile.disabled = editorActive;
  elements.useWatermark.disabled = editorActive;
  elements.previewButton.disabled = scanning || !ready || editorActive;
  elements.generateButton.disabled =
    scanning || state.inputAssetsLoading || state.inputAssetsSaving || !ready || editorActive;
  elements.selectAllButton.disabled = scanning || state.files.length === 0;
  elements.selectNoneButton.disabled = scanning || state.selected.size === 0;
  elements.removePngButton.disabled = scanning || state.files.length === 0 || editorActive;
  elements.createPdfDownload.disabled =
    state.inputAssetsLoading || editorActive;
  elements.downloadUrl.disabled =
    state.inputAssetsLoading || !elements.createPdfDownload.checked || editorActive;
  elements.createSingleMockups.disabled =
    state.inputAssetsLoading || editorActive;
  elements.editSingleMockupRegions.disabled =
    state.inputAssetsLoading || state.inputAssetsSaving || (editorActive && state.regionEditor?.kind !== 'single');
  elements.saveSingleMockupRegions.disabled =
    state.regionEditor?.kind !== 'single' || state.inputAssetsSaving;
  elements.editGroupMockupRegions.disabled =
    !groupMode || state.groupTemplates.length === 0 || state.inputAssetsSaving ||
    (editorActive && state.regionEditor?.kind !== 'group');
  elements.saveGroupMockupRegions.disabled =
    state.regionEditor?.kind !== 'group' || state.inputAssetsSaving;
  elements.addFrontRegionButton.disabled =
    state.regionEditor?.kind !== 'group' || editorSaving;
  elements.addBackRegionButton.disabled =
    state.regionEditor?.kind !== 'group' || editorSaving;
  elements.groupRegionColorLight.disabled =
    state.regionEditor?.kind !== 'group' || editorSaving;
  elements.groupRegionColorDark.disabled =
    state.regionEditor?.kind !== 'group' || editorSaving;
  for (const row of elements.groupTemplateList.querySelectorAll('.group-template-row')) {
    row.disabled = state.busy || editorSaving;
  }
  if (state.regionEditor?.kind === 'group') syncGroupRegionInspector();
  const count = Math.max(1, Number(elements.mockupCount.value) || 1);
  elements.generateButton.textContent = groupMode ? 'Tạo Mockup Group Shirt' : `Tạo ${count} mockup`;
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

function renderGroupTemplateSummary() {
  if (!elements.groupTemplateSummary || !elements.groupTemplateList) return;
  const templates = state.groupTemplates;
  elements.groupTemplateSummary.textContent = templates.length === 0
    ? 'Chưa chọn ảnh nền có marker mgs.'
    : `${templates.length} ảnh nền Group Shirt đã chọn.`;
  elements.groupTemplateList.textContent = '';
  for (const [index, template] of templates.entries()) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'group-template-row';
    row.disabled = state.busy || state.inputAssetsSaving;
    row.title = template.path;
    const image = document.createElement('img');
    image.src = template.url;
    image.alt = '';
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = template.name;
    const regions = Array.isArray(template.regions) ? template.regions : [];
    const count = (color, side) => regions.filter((region) =>
      (region.color || 'wh') === color && region.side === side).length;
    const meta = document.createElement('small');
    meta.textContent = 'Nền dùng chung · ' +
      `sáng ${count('wh', 'front')} trước/${count('wh', 'back')} sau · ` +
      `tối ${count('bl', 'front')} trước/${count('bl', 'back')} sau`;
    copy.append(name, meta);
    row.append(image, copy);
    row.addEventListener('click', () => {
      if (state.busy || state.inputAssetsSaving) return;
      if (state.regionEditor?.kind === 'group') {
        showGroupRegionEditorPage(index);
      } else if (!state.regionEditor) {
        showGroupTemplatePreview(index);
      }
    });
    elements.groupTemplateList.append(row);
  }
  renderGroupReadiness();
}

function renderGroupReadiness() {
  if (!elements.groupReadinessSummary) return;
  const analysis = analyzeGroupShirtSetup();
  const regionCount = analysis.matchedTemplates.reduce(
    (total, template) => total + (Array.isArray(template.regions) ? template.regions.length : 0),
    0,
  );
  const diagnosticsClean =
    analysis.descriptors.length > 0 &&
    analysis.invalid.length === 0 &&
    analysis.logicalDuplicates.length === 0 &&
    state.groupTemplates.length > 0 &&
    analysis.regionIssues.length === 0;
  elements.groupReadinessSummary.classList.toggle(
    'is-ready',
    diagnosticsClean && analysis.unusedTemplates.length === 0,
  );
  elements.groupReadinessSummary.classList.toggle(
    'is-warning',
    analysis.descriptors.length > 0 &&
      (!diagnosticsClean || analysis.unusedTemplates.length > 0),
  );
  if (analysis.descriptors.length === 0) {
    elements.groupReadinessSummary.textContent = 'Chọn PNG để kiểm tra nhóm áo.';
  } else if (analysis.invalid.length > 0) {
    elements.groupReadinessSummary.textContent =
      `${analysis.invalid.length} PNG sai tên hoặc tag. Hãy sửa phần tên gốc về “Nhóm (số)” trong File Explorer; Đổi tên PNG chỉ gắn hoặc thay tag màu/mặt.`;
  } else if (analysis.logicalDuplicates.length > 0) {
    const item = analysis.logicalDuplicates[0].duplicate.parsed;
    elements.groupReadinessSummary.textContent =
      `Trùng PNG logic: ${item.displayGroup}.${item.color}.${item.side}, số thứ tự ${item.ordinal}.`;
  } else if (state.groupTemplates.length === 0) {
    elements.groupReadinessSummary.textContent =
      `${analysis.sourceGroups.size} nhóm PNG · chưa chọn ảnh nền mgs.`;
  } else if (analysis.regionIssues.length > 0) {
    const issue = analysis.regionIssues[0];
    elements.groupReadinessSummary.textContent =
      `Không có nền mgs có vùng in phù hợp cho nhóm ${issue.group.displayGroup}.`;
  } else {
    const unusedWarning = analysis.unusedTemplates.length > 0
      ? ` · cảnh báo: ${analysis.unusedTemplates.length} nền không phù hợp sẽ được bỏ qua`
      : '';
    elements.groupReadinessSummary.textContent =
      `${analysis.descriptors.length} PNG · ${analysis.sourceGroups.size} nhóm · ` +
      `${analysis.matchedTemplates.length} nền khớp · ${regionCount} vùng in${unusedWarning}.`;
  }
}
function closeActiveRegionEditorForModeChange() {
  if (state.inputAssetsSaving) return false;
  if (!state.regionEditor) return true;
  if (
    state.regionEditor.dirty &&
    !window.confirm('Vùng in có thay đổi chưa được lưu. Bạn có chắc muốn chuyển chế độ và bỏ thay đổi?')
  ) return false;
  if (state.regionEditor.kind === 'group') exitGroupRegionEditor();
  else exitRegionEditor();
  return true;
}

function setMockupMode(mode, { initial = false } = {}) {
  const nextMode = mode === 'group-shirt' ? 'group-shirt' : 'bundle';
  if (!initial && nextMode === state.mockupMode) return true;
  if (!initial && state.inputAssetsSaving) {
    elements.mockupModeBundle.checked = state.mockupMode === 'bundle';
    elements.mockupModeGroup.checked = state.mockupMode === 'group-shirt';
    return false;
  }
  if (!initial && !closeActiveRegionEditorForModeChange()) {
    elements.mockupModeBundle.checked = state.mockupMode === 'bundle';
    elements.mockupModeGroup.checked = state.mockupMode === 'group-shirt';
    return false;
  }
  state.mockupMode = nextMode;
  const isGroup = nextMode === 'group-shirt';
  elements.mockupModeBundle.checked = !isGroup;
  elements.mockupModeGroup.checked = isGroup;
  elements.bundleTemplatePanel.classList.toggle('is-hidden', isGroup);
  elements.groupTemplatePanel.classList.toggle('is-hidden', !isGroup);
  elements.bundleSettingsPanel.classList.toggle('is-hidden', isGroup);
  elements.bundleMarginSettingsPanel.classList.toggle('is-hidden', isGroup);
  elements.groupSettingsPanel.classList.toggle('is-hidden', !isGroup);
  elements.pdfOptionBlock.classList.toggle('is-hidden', false);
  elements.renamePngButton.classList.toggle('is-hidden', !isGroup);
  elements.groupRenameHint.classList.toggle('is-hidden', !isGroup);
  elements.pdfDownloadFields.classList.toggle(
    'is-hidden',
    !elements.createPdfDownload.checked,
  );
  renderInputAssets();
  state.output = null;
  elements.openOutputButton.classList.add('is-hidden');
  renderFileList();
  renderGroupReadiness();
  if (isGroup && state.groupTemplates.length > 0) showGroupTemplatePreview(0);
  else if (!isGroup && state.template) showTemplatePreview();
  else restorePreviewAfterRegionEditor(null);
  updateControls();
  return true;
}

async function selectGroupTemplates() {
  if (state.regionEditor || state.busy) return;
  try {
    const result = unwrap(await api.selectGroupShirtTemplates());
    if (result.cancelled) return;
    state.groupTemplates = result.templates;
    if (state.watermark && state.groupTemplates.some(
      (template) => normalizePath(template.path) === normalizePath(state.watermark.path),
    )) {
      state.watermark = null;
      elements.useWatermark.checked = false;
      renderWatermarkSummary();
    }
    for (const template of state.groupTemplates) {
      for (const selectedPath of [...state.selected]) {
        if (normalizePath(selectedPath) === normalizePath(template.path)) state.selected.delete(selectedPath);
      }
    }
    renderGroupTemplateSummary();
    renderFileList();
    updateSelectionState();
    showGroupTemplatePreview(0);
  } catch (error) {
    showError(error);
  }
}

async function selectGroupSingleMockupTemplates() {
  if (state.regionEditor || state.busy || state.inputAssetsSaving) return false;
  try {
    const result = unwrap(await api.selectGroupSingleMockupTemplates());
    if (result.cancelled) return false;
    state.groupSingleMockupTemplates = result.templates;
    if (state.watermark && state.groupSingleMockupTemplates.some(
      (template) => normalizePath(template.path) === normalizePath(state.watermark.path),
    )) {
      state.watermark = null;
      elements.useWatermark.checked = false;
      renderWatermarkSummary();
    }
    for (const template of state.groupSingleMockupTemplates) {
      for (const selectedPath of [...state.selected]) {
        if (normalizePath(selectedPath) === normalizePath(template.path)) state.selected.delete(selectedPath);
      }
    }
    renderInputAssets();
    renderFileList();
    updateSelectionState();
    const missing = templatesMissingRegions();
    if (missing.length > 0) elements.advancedSettings.open = true;
    showToast(
      `Đã chọn ${state.groupSingleMockupTemplates.length} ảnh nền mockup đơn.`,
      'success',
    );
    return true;
  } catch (error) {
    showError(error);
    return false;
  }
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
  if (
    previousView?.display &&
    (!previousView.mockupMode || previousView.mockupMode === state.mockupMode)
  ) {
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
  if (state.mockupMode === 'group-shirt' && state.groupTemplates.length > 0) {
    showGroupTemplatePreview(0);
    return;
  }
  if (state.mockupMode === 'bundle' && state.template) {
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
  elements.regionLayer?.classList.add('is-hidden');
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
  if (state.mockupMode !== 'group-shirt') {
    const refreshed = await refreshInputAssets();
    if (!refreshed) {
      elements.editSingleMockupRegions.checked = false;
      return;
    }
  }
  const templates = activeSingleMockupTemplates();
  if (templates.length === 0) {
    elements.editSingleMockupRegions.checked = false;
    showError(new Error(
      state.mockupMode === 'group-shirt'
        ? 'Hãy chọn ít nhất một ảnh nền mockup đơn cho Group Shirt.'
        : 'Hãy thêm ảnh mockup đơn vào thư mục Input.',
    ));
    return;
  }
  const tooSmall = templates.find((template) => template.width < 7 || template.height < 8);
  if (tooSmall) {
    elements.editSingleMockupRegions.checked = false;
    showError(new Error(`Ảnh ${tooSmall.name} quá nhỏ để tạo vùng in 7×8 pixel.`));
    return;
  }
  state.regionEditor = {
    kind: 'single',
    source: state.mockupMode === 'group-shirt' ? 'group-shirt' : 'input',
    entries: templates.map((template) => ({
      template,
      region: validPrintRegion(template.region, template)
        ? clonePrintRegion(template.region)
        : defaultPrintRegion(template),
    })),
    dirty: templates.some((template) => !validPrintRegion(template.region, template)),
    drag: null,
    previousView: {
      mockupMode: state.mockupMode,
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
    templatePath: entry.template.path,
    region: clonePrintRegion(entry.region),
  }));
  try {
    if (editor.source === 'group-shirt') {
      const result = unwrap(await api.saveGroupSingleMockupRegions(entries));
      state.groupSingleMockupTemplates = result.templates;
    } else {
      const assets = unwrap(await api.saveSingleMockupRegions(entries));
      state.inputAssets = assets;
      state.inputAssetsLoaded = true;
    }
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
    setRegionEditorStatus(
      editor.source === 'group-shirt'
        ? 'Chưa lưu được. Hãy chọn lại các ảnh nền mockup đơn.'
        : 'Chưa lưu được. Hãy kiểm tra lại các ảnh trong Input.',
    );
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

function cloneGroupRegion(region) {
  return {
    id: String(region.id),
    side: region.side === 'back' ? 'back' : 'front',
    color: region.color === 'bl' ? 'bl' : 'wh',
    centerX: Number(region.centerX),
    centerY: Number(region.centerY),
    width: Number(region.width),
    height: Number(region.height),
    rotation: Number(region.rotation) || 0,
  };
}

function defaultGroupRegion(template, side, color, index = 0) {
  const pixelHeight = Math.max(24, Math.min(template.height * 0.42, template.width * 0.42 * 8 / 7));
  const pixelWidth = pixelHeight * 7 / 8;
  const offset = ((index % 5) - 2) * Math.min(0.06, pixelWidth / template.width / 3);
  return {
    id: `region-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    side,
    color: color === 'bl' ? 'bl' : 'wh',
    centerX: Math.max(pixelWidth / template.width / 2, Math.min(1 - pixelWidth / template.width / 2, 0.5 + offset)),
    centerY: 0.5,
    width: pixelWidth / template.width,
    height: pixelHeight / template.height,
    rotation: 0,
  };
}

function currentGroupRegionEntry() {
  return state.regionEditor?.kind === 'group'
    ? state.regionEditor.entries[state.pageIndex]
    : null;
}

function currentGroupRegion() {
  const entry = currentGroupRegionEntry();
  return entry?.regions.find((region) => region.id === state.regionEditor.activeRegionId) || null;
}

function rotatedRegionExtents(region, template) {
  const radians = (Number(region.rotation) || 0) * Math.PI / 180;
  const widthPixels = region.width * template.width;
  const heightPixels = region.height * template.height;
  return {
    x: (Math.abs(Math.cos(radians)) * widthPixels + Math.abs(Math.sin(radians)) * heightPixels) / template.width,
    y: (Math.abs(Math.sin(radians)) * widthPixels + Math.abs(Math.cos(radians)) * heightPixels) / template.height,
  };
}

function constrainGroupRegion(region, template) {
  const next = cloneGroupRegion(region);
  const aspectRatio = 42 / 48;
  let pixelWidth = Math.max(7, Number(next.width) * template.width);
  let pixelHeight = pixelWidth / aspectRatio;
  if (!Number.isFinite(pixelHeight) || pixelHeight < 8) {
    pixelHeight = 8;
    pixelWidth = pixelHeight * aspectRatio;
  }
  next.width = pixelWidth / template.width;
  next.height = pixelHeight / template.height;
  next.rotation = ((next.rotation % 360) + 540) % 360 - 180;
  let extents = rotatedRegionExtents(next, template);
  if (extents.x > 1 || extents.y > 1) {
    const scale = Math.min(1 / extents.x, 1 / extents.y) * 0.999;
    next.width *= scale;
    next.height *= scale;
    extents = rotatedRegionExtents(next, template);
  }
  next.centerX = Math.max(extents.x / 2, Math.min(1 - extents.x / 2, next.centerX));
  next.centerY = Math.max(extents.y / 2, Math.min(1 - extents.y / 2, next.centerY));
  return next;
}
function markGroupEditorDirty(message = null) {
  if (state.regionEditor?.kind !== 'group') return;
  const wasDirty = state.regionEditor.dirty;
  state.regionEditor.dirty = true;
  if (!wasDirty) syncEditorWindowState();
  setGroupRegionStatus(message || 'Có thay đổi chưa lưu.');
}

function setGroupRegionStatus(message = null) {
  const entry = currentGroupRegionEntry();
  if (!entry || !elements.groupRegionStatus) return;
  const count = (color, side) => entry.regions.filter((region) =>
    region.color === color && region.side === side).length;
  elements.groupRegionStatus.textContent = message ||
    `Ảnh ${state.pageIndex + 1}/${state.regionEditor.entries.length}: ${entry.template.name} · ` +
    `sáng ${count('wh', 'front')} trước/${count('wh', 'back')} sau · ` +
    `tối ${count('bl', 'front')} trước/${count('bl', 'back')} sau.`;
}
function syncGroupRegionInspector() {
  const entry = currentGroupRegionEntry();
  const region = currentGroupRegion();
  const disabled = state.inputAssetsSaving || !entry || !region;
  for (const input of [
    elements.groupRegionX,
    elements.groupRegionY,
    elements.groupRegionWidth,
    elements.groupRegionHeight,
    elements.groupRegionRotation,
  ]) input.disabled = disabled;
  elements.deleteGroupRegionButton.disabled = disabled;
  elements.rotateGroupRegionLeft.disabled = disabled;
  elements.rotateGroupRegionRight.disabled = disabled;
  if (disabled) {
    elements.groupRegionSelectionStatus.textContent = 'Chưa chọn vùng in';
    for (const input of [
      elements.groupRegionX,
      elements.groupRegionY,
      elements.groupRegionWidth,
      elements.groupRegionHeight,
      elements.groupRegionRotation,
    ]) input.value = '';
    return;
  }
  elements.groupRegionSelectionStatus.textContent =
    `Đang chọn vùng ${region.color === 'bl' ? 'áo tối' : 'áo sáng'} · mặt ${region.side === 'front' ? 'trước' : 'sau'}`;
  elements.groupRegionX.value = (region.centerX * 100).toFixed(2);
  elements.groupRegionY.value = (region.centerY * 100).toFixed(2);
  elements.groupRegionWidth.value = (region.width * 100).toFixed(2);
  elements.groupRegionHeight.value = (region.height * 100).toFixed(2);
  elements.groupRegionRotation.value = Number(region.rotation).toFixed(1);
}

function renderGroupRegions() {
  if (!elements.regionLayer) return;
  elements.regionLayer.textContent = '';
  const entry = currentGroupRegionEntry();
  const visible = state.viewMode === 'group-region' && Boolean(entry);
  elements.regionLayer.classList.toggle('is-hidden', !visible);
  if (!visible) {
    syncGroupRegionInspector();
    return;
  }
  const trackIndexes = new Map();
  for (const region of entry.regions) {
    const track = groupRegionTrackKey(region.color, region.side);
    const trackIndex = (trackIndexes.get(track) || 0) + 1;
    trackIndexes.set(track, trackIndex);
    const colorLabel = region.color === 'bl' ? 'Tối' : 'Sáng';
    const sideLabel = region.side === 'front' ? 'Trước' : 'Sau';
    const node = document.createElement('div');
    node.className = `group-print-region${region.id === state.regionEditor.activeRegionId ? ' is-active' : ''}`;
    node.dataset.regionId = region.id;
    node.dataset.side = region.side;
    node.dataset.color = region.color;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `Vùng in áo ${colorLabel.toLocaleLowerCase('vi')} mặt ${sideLabel.toLocaleLowerCase('vi')} ${trackIndex}`);
    node.style.left = `${(region.centerX - region.width / 2) * 100}%`;
    node.style.top = `${(region.centerY - region.height / 2) * 100}%`;
    node.style.width = `${region.width * 100}%`;
    node.style.height = `${region.height * 100}%`;
    node.style.transform = `rotate(${region.rotation}deg)`;
    const label = document.createElement('span');
    label.className = 'group-region-label';
    label.textContent = `${colorLabel} · ${sideLabel} ${trackIndex}`;
    node.append(label);
    for (const handle of ['nw', 'ne', 'sw', 'se']) {
      const resize = document.createElement('i');
      resize.className = `region-handle handle-${handle}`;
      resize.dataset.groupHandle = handle;
      resize.setAttribute('aria-hidden', 'true');
      node.append(resize);
    }
    const rotate = document.createElement('i');
    rotate.className = 'group-rotation-handle';
    rotate.dataset.groupRotate = 'true';
    rotate.setAttribute('aria-hidden', 'true');
    node.append(rotate);
    elements.regionLayer.append(node);
  }
  syncGroupRegionInspector();
}
function updateGroupRegionElement(region) {
  const node = [...elements.regionLayer.querySelectorAll('[data-region-id]')]
    .find((candidate) => candidate.dataset.regionId === region.id);
  if (!node) return;
  node.style.left = `${(region.centerX - region.width / 2) * 100}%`;
  node.style.top = `${(region.centerY - region.height / 2) * 100}%`;
  node.style.width = `${region.width * 100}%`;
  node.style.height = `${region.height * 100}%`;
  node.style.transform = `rotate(${region.rotation}deg)`;
  syncGroupRegionInspector();
}

function showGroupRegionEditorPage(pageIndex) {
  if (state.regionEditor?.kind !== 'group') return;
  state.pageIndex = Math.max(0, Math.min(state.regionEditor.entries.length - 1, pageIndex));
  state.pageCount = state.regionEditor.entries.length;
  const entry = currentGroupRegionEntry();
  state.regionEditor.activeRegionId = entry.regions[0]?.id || null;
  showImage({
    url: entry.template.url,
    width: entry.template.width,
    height: entry.template.height,
    mode: 'group-region',
    title: `Chỉnh vùng Group Shirt ${state.pageIndex + 1}/${state.pageCount} · ${entry.template.name}`,
  });
  elements.statTemplate.textContent = `${entry.template.width} × ${entry.template.height}px`;
  elements.statLayout.textContent = 'Vùng trước / sau';
  renderGroupRegions();
  setGroupRegionStatus();
  updateControls();
}

function enterGroupRegionEditor() {
  if (state.busy || state.inputAssetsSaving || state.groupTemplates.length === 0) {
    elements.editGroupMockupRegions.checked = false;
    return;
  }
  state.regionEditor = {
    kind: 'group',
    entries: state.groupTemplates.map((template) => ({
      template,
      regions: (Array.isArray(template.regions) ? template.regions : [])
        .map(cloneGroupRegion)
        .map((region) => constrainGroupRegion(region, template)),
    })),
    activeRegionId: null,
    dirty: false,
    drag: null,
    previousView: {
      mockupMode: state.mockupMode,
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
  elements.groupRegionTools.classList.remove('is-hidden');
  elements.groupRegionInspector.classList.remove('is-hidden');
  showGroupRegionEditorPage(0);
}

function exitGroupRegionEditor({ notifyUnsaved = false } = {}) {
  if (state.regionEditor?.kind !== 'group' || state.inputAssetsSaving) return;
  const previousView = state.regionEditor.previousView;
  const dirty = state.regionEditor.dirty;
  if (
    notifyUnsaved && dirty &&
    !window.confirm('Vùng Group Shirt có thay đổi chưa lưu. Bạn có chắc muốn bỏ thay đổi?')
  ) {
    elements.editGroupMockupRegions.checked = true;
    return;
  }
  state.regionEditor = null;
  syncEditorWindowState();
  elements.editGroupMockupRegions.checked = false;
  elements.groupRegionTools.classList.add('is-hidden');
  elements.groupRegionInspector.classList.add('is-hidden');
  elements.regionLayer.textContent = '';
  elements.regionLayer.classList.add('is-hidden');
  restorePreviewAfterRegionEditor(previousView);
  renderGroupTemplateSummary();
  updateControls();
}

function selectedGroupRegionColor() {
  return elements.groupRegionColorDark.checked ? 'bl' : 'wh';
}

function addGroupRegion(side) {
  if (state.inputAssetsSaving) return;
  const entry = currentGroupRegionEntry();
  if (!entry) return;
  const region = defaultGroupRegion(
    entry.template,
    side,
    selectedGroupRegionColor(),
    entry.regions.length,
  );
  entry.regions.push(region);
  state.regionEditor.activeRegionId = region.id;
  markGroupEditorDirty();
  renderGroupRegions();
  setGroupRegionStatus();
}

function deleteActiveGroupRegion() {
  if (state.inputAssetsSaving) return;
  const entry = currentGroupRegionEntry();
  const region = currentGroupRegion();
  if (!entry || !region) return;
  entry.regions = entry.regions.filter((item) => item.id !== region.id);
  state.regionEditor.activeRegionId = entry.regions[0]?.id || null;
  markGroupEditorDirty();
  renderGroupRegions();
}

function selectGroupRegion(regionId) {
  if (state.inputAssetsSaving) return;
  const entry = currentGroupRegionEntry();
  if (!entry?.regions.some((region) => region.id === regionId)) return;
  state.regionEditor.activeRegionId = regionId;
  for (const node of elements.regionLayer.querySelectorAll('[data-region-id]')) {
    node.classList.toggle('is-active', node.dataset.regionId === regionId);
  }
  syncGroupRegionInspector();
}

function beginGroupRegionDrag(event) {
  if (
    state.regionEditor?.kind !== 'group' || state.inputAssetsSaving || event.button !== 0
  ) return;
  const node = event.target.closest('[data-region-id]');
  if (!node) return;
  selectGroupRegion(node.dataset.regionId);
  const region = currentGroupRegion();
  const entry = currentGroupRegionEntry();
  const frame = elements.imageFrame.getBoundingClientRect();
  if (!region || !entry || frame.width <= 0 || frame.height <= 0) return;
  const mode = event.target.dataset.groupRotate
    ? 'rotate'
    : event.target.dataset.groupHandle ? 'resize' : 'move';
  state.regionEditor.drag = {
    pointerId: event.pointerId,
    mode,
    frame,
    startX: event.clientX,
    startY: event.clientY,
    start: cloneGroupRegion(region),
  };
  node.setPointerCapture(event.pointerId);
  node.classList.add('is-dragging');
  event.preventDefault();
}

function moveGroupRegionDrag(event) {
  if (state.inputAssetsSaving) return;
  const editor = state.regionEditor;
  const drag = editor?.kind === 'group' ? editor.drag : null;
  const entry = currentGroupRegionEntry();
  const region = currentGroupRegion();
  if (!drag || !entry || !region || drag.pointerId !== event.pointerId) return;
  const { frame, start } = drag;
  let next = cloneGroupRegion(start);
  if (drag.mode === 'move') {
    next.centerX += (event.clientX - drag.startX) / frame.width;
    next.centerY += (event.clientY - drag.startY) / frame.height;
  } else if (drag.mode === 'rotate') {
    const centerX = frame.left + start.centerX * frame.width;
    const centerY = frame.top + start.centerY * frame.height;
    next.rotation = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90;
  } else {
    const centerX = frame.left + start.centerX * frame.width;
    const centerY = frame.top + start.centerY * frame.height;
    const candidateWidth = Math.max(0, Math.abs(event.clientX - centerX) * 2 * entry.template.width / frame.width);
    const candidateHeight = Math.max(0, Math.abs(event.clientY - centerY) * 2 * entry.template.height / frame.height);
    const aspectRatio = 42 / 48;
    const preferredHeight =
      (aspectRatio * candidateWidth + candidateHeight) / (aspectRatio ** 2 + 1);
    const pixelHeight = Math.max(8, preferredHeight);
    const pixelWidth = pixelHeight * aspectRatio;
    next.width = pixelWidth / entry.template.width;
    next.height = pixelHeight / entry.template.height;
  }
  Object.assign(region, constrainGroupRegion(next, entry.template));
  markGroupEditorDirty();
  updateGroupRegionElement(region);
  event.preventDefault();
}

function endGroupRegionDrag(event) {
  const drag = state.regionEditor?.kind === 'group' ? state.regionEditor.drag : null;
  if (!drag || drag.pointerId !== event.pointerId) return;
  state.regionEditor.drag = null;
  const node = event.target.closest('[data-region-id]');
  node?.classList.remove('is-dragging');
  if (node?.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
}

function nudgeGroupRegion(deltaX, deltaY, rotationDelta = 0) {
  if (state.inputAssetsSaving) return;
  const entry = currentGroupRegionEntry();
  const region = currentGroupRegion();
  if (!entry || !region) return;
  const next = {
    ...region,
    centerX: region.centerX + deltaX / entry.template.width,
    centerY: region.centerY + deltaY / entry.template.height,
    rotation: region.rotation + rotationDelta,
  };
  Object.assign(region, constrainGroupRegion(next, entry.template));
  markGroupEditorDirty();
  updateGroupRegionElement(region);
}

function applyGroupInspectorInput(changedInput) {
  if (state.inputAssetsSaving) return;
  const entry = currentGroupRegionEntry();
  const region = currentGroupRegion();
  if (!entry || !region) return;
  const x = Number(elements.groupRegionX.value) / 100;
  const y = Number(elements.groupRegionY.value) / 100;
  const rotation = Number(elements.groupRegionRotation.value);
  if (![x, y, rotation].every(Number.isFinite)) return;
  const next = {
    ...region,
    centerX: x,
    centerY: y,
    rotation,
  };
  if (changedInput === elements.groupRegionHeight) {
    const height = Number(elements.groupRegionHeight.value) / 100;
    if (!Number.isFinite(height) || height <= 0) return;
    const pixelHeight = height * entry.template.height;
    next.height = height;
    next.width = pixelHeight * (42 / 48) / entry.template.width;
  } else if (changedInput === elements.groupRegionWidth) {
    const width = Number(elements.groupRegionWidth.value) / 100;
    if (!Number.isFinite(width) || width <= 0) return;
    const pixelWidth = width * entry.template.width;
    next.width = width;
    next.height = pixelWidth * (48 / 42) / entry.template.height;
  }
  Object.assign(region, constrainGroupRegion(next, entry.template));
  markGroupEditorDirty();
  renderGroupRegions();
}
async function saveGroupRegionEditor() {
  if (state.regionEditor?.kind !== 'group' || state.inputAssetsSaving) return;
  const editor = state.regionEditor;
  state.inputAssetsSaving = true;
  updateControls();
  setGroupRegionStatus('Đang lưu vùng in Group Shirt…');
  try {
    const entries = editor.entries.map((entry) => ({
      templatePath: entry.template.path,
      regions: entry.regions.map(cloneGroupRegion),
    }));
    const result = unwrap(await api.saveGroupShirtRegions(entries));
    state.groupTemplates = result.templates;
    state.regionEditor = null;
    syncEditorWindowState();
    elements.editGroupMockupRegions.checked = false;
    elements.groupRegionTools.classList.add('is-hidden');
    elements.groupRegionInspector.classList.add('is-hidden');
    elements.regionLayer.textContent = '';
    elements.regionLayer.classList.add('is-hidden');
    renderGroupTemplateSummary();
    showGroupTemplatePreview(0);
    elements.groupRegionStatus.textContent =
      `Đã lưu vùng in cho ${entries.length} ảnh nền Group Shirt.`;
    showToast(`Đã lưu vùng in cho ${entries.length} ảnh nền Group Shirt.`, 'success');
  } catch (error) {
    showError(error);
    if (state.regionEditor === editor) setGroupRegionStatus('Chưa lưu được vùng in.');
  } finally {
    state.inputAssetsSaving = false;
    updateControls();
    updatePageNavigation();
  }
}

function updatePageNavigation() {
  const visible = state.pageCount > 1 &&
    ['preview', 'output', 'region', 'group-region', 'group-template'].includes(state.viewMode);
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
  renderGroupRegions();
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

function showGroupTemplatePreview(pageIndex = 0) {
  if (state.groupTemplates.length === 0) return;
  state.pageIndex = Math.max(0, Math.min(state.groupTemplates.length - 1, pageIndex));
  state.pageCount = state.groupTemplates.length;
  const template = state.groupTemplates[state.pageIndex];
  showImage({
    url: template.url,
    width: template.width,
    height: template.height,
    mode: 'group-template',
    title: `Ảnh nền Group Shirt ${state.pageIndex + 1}/${state.pageCount} · ${template.name}`,
  });
  const regions = Array.isArray(template.regions) ? template.regions : [];
  elements.statTemplate.textContent = `${template.width} × ${template.height}px`;
  elements.statLayout.textContent = `${regions.length} vùng in`;
}

function setBusy(type, busy) {
  state.busy = busy;
  state.busyType = busy ? type : null;
  for (const element of document.querySelectorAll('[data-lock]')) {
    element.disabled = busy;
  }
  for (const row of elements.groupTemplateList.querySelectorAll('.group-template-row')) {
    row.disabled = busy || state.inputAssetsSaving;
  }
  elements.openInputFolderButton.disabled = busy || state.inputAssetsLoading || state.inputAssetsSaving;
  const cancellable = busy && type !== 'cleanup';
  elements.cancelButton.classList.toggle('is-hidden', !cancellable);
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
  elements.workingTitle.textContent = type === 'preview'
    ? 'Đang tạo preview…'
    : type === 'cleanup'
      ? 'Đang dọn dữ liệu…'
      : 'Đang tạo mockup…';
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
    if (state.groupTemplates.some(
      (template) => normalizePath(result.watermark.path) === normalizePath(template.path),
    )) {
      throw new Error('Watermark không được trùng với ảnh nền Group Shirt.');
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
    const groupMode = state.mockupMode === 'group-shirt';
    const result = unwrap(await (groupMode
      ? api.renderGroupShirtPreview({ ...payload, pageIndex })
      : api.renderPreview({ ...payload, pageIndex })));
    state.pageIndex = result.pageIndex;
    state.pageCount = result.pageCount;
    showImage({
      url: result.dataUrl,
      width: result.template.width,
      height: result.template.height,
      mode: 'preview',
      title: groupMode
        ? `Preview Group Shirt ${result.pageIndex + 1}/${result.pageCount} · ${result.template.name || result.group || ''}`
        : `Preview mockup ${result.pageIndex + 1} · ${result.groupSizes[result.pageIndex]} PNG`,
      layout: groupMode ? null : result.layout,
    });
    elements.statTemplate.textContent =
      `${result.template.width} × ${result.template.height}px`;
    if (groupMode) {
      elements.statLayout.textContent = `${result.regionCount || 0} vùng in`;
    }
    elements.progressFill.style.width = '100%';
    elements.progressMessage.textContent = groupMode
      ? `Preview ${result.sourceCount || 0} PNG trên ${result.regionCount || 0} vùng in`
      : `Preview ${result.layout.cols} cột × ${result.layout.rows} hàng`;
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
  if (state.output.mode === 'group-shirt') {
    showImage({
      url: outputFile.url,
      width: outputFile.width,
      height: outputFile.height,
      mode: 'output',
      title: `${outputFile.name} · ${outputFile.sourceCount || 0} PNG`,
    });
    elements.statTemplate.textContent = `${outputFile.width} × ${outputFile.height}px`;
    elements.statLayout.textContent = `${outputFile.regionCount || 0} vùng in`;
    return;
  }
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
    if (
      elements.createPdfDownload.checked ||
      (elements.createSingleMockups.checked && state.mockupMode !== 'group-shirt')
    ) {
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
    const result = unwrap(await (state.mockupMode === 'group-shirt'
      ? api.generateGroupShirtMockups(payload)
      : api.generateMockups(payload)));
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
    const generationWarnings = [...new Set(
      (Array.isArray(result.warnings) ? result.warnings : [])
        .map((warning) => String(warning?.message || warning || '').trim())
        .filter(Boolean),
    )];
    const totalOutputCount = bundleCount + singleCount + pdfCount;
    const outputParts = [state.mockupMode === 'group-shirt'
      ? `${bundleCount} mockup Group Shirt`
      : `${bundleCount} mockup bundle`];
    if (singleCount > 0) outputParts.push(`${singleCount} mockup đơn`);
    if (pdfCount > 0) outputParts.push('1 PDF Download');
    elements.progressMessage.textContent = `Đã lưu ${outputParts.join(', ')} vào Done` +
      (singleSkipped ? '; đã bỏ qua mockup đơn vì Done đã có mockup đơn' : '') +
      (pdfSkipped ? '; đã bỏ qua PDF Download vì Done đã có PDF' : '') +
      (generationWarnings.length > 0 ? `; có ${generationWarnings.length} cảnh báo` : '');
    setAppStatus('Hoàn tất', 'ready');
    showToast(`Đã tạo thành công ${totalOutputCount} file.`, 'success');
    if (generationWarnings.length > 0) {
      showToast(
        `Hoàn tất với ${generationWarnings.length} cảnh báo: ${generationWarnings.slice(0, 2).join(' ')}`,
        'info',
        7800,
      );
    }

    elements.dialogTitle.textContent = `Đã tạo ${totalOutputCount} file`;
    const completionNotes = [state.mockupMode === 'group-shirt'
      ? `Đã ghép ${result.assignedSourceCount || result.outputFiles.reduce((total, file) => total + (file.sourceCount || 0), 0)} lượt PNG theo nhóm, màu áo và mặt áo.`
      : `Phân chia: ${result.groupSizes.join(' + ')} PNG.`];
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
    if (generationWarnings.length > 0) {
      const remainder = generationWarnings.length > 3
        ? ` Còn ${generationWarnings.length - 3} cảnh báo khác.`
        : '';
      completionNotes.push(`Cảnh báo: ${generationWarnings.slice(0, 3).join(' ')}${remainder}`);
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

async function cleanupAppData() {
  if (state.busy || state.regionEditor || state.inputAssetsSaving) return;
  setBusy('cleanup', true);
  elements.workingMessage.textContent = 'Đang xác nhận và kiểm tra dữ liệu có thể dọn…';
  elements.progressMessage.textContent = 'Chỉ xóa cache và file tạm do ứng dụng tạo';
  try {
    const result = unwrap(await api.cleanupAppData());
    if (result.cancelled) {
      showToast('Đã hủy Xóa dữ liệu. Không có file nào bị xóa.', 'info');
      setAppStatus('Sẵn sàng', 'ready');
      return;
    }
    const reclaimed = formatBytes(Number(result.reclaimedBytes) || 0);
    const count = Number(result.removedEntries) || 0;
    const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
    elements.progressFill.style.width = '100%';
    elements.progressMessage.textContent =
      `Đã xóa ${count} mục rác, giải phóng khoảng ${reclaimed}.`;
    setAppStatus('Đã dọn dữ liệu', 'ready');
    showToast(
      count > 0
        ? `Đã xóa ${count} mục rác · ${reclaimed}${warningCount ? `; ${warningCount} mục đang được hệ thống sử dụng nên được giữ lại` : ''}.`
        : warningCount > 0
          ? `Có ${warningCount} mục đang được hệ thống sử dụng nên chưa thể xóa.`
          : 'Không có dữ liệu rác cần xóa.',
      warningCount > 0 ? 'info' : 'success',
    );
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
  else if (state.viewMode === 'group-region') showGroupRegionEditorPage(next);
  else if (state.viewMode === 'group-template') showGroupTemplatePreview(next);
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
elements.cleanupDataButton.addEventListener('click', cleanupAppData);
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
elements.mockupModeBundle.addEventListener('change', () => {
  if (elements.mockupModeBundle.checked) setMockupMode('bundle');
});
elements.mockupModeGroup.addEventListener('change', () => {
  if (elements.mockupModeGroup.checked) setMockupMode('group-shirt');
});
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
elements.chooseGroupTemplatesButton.addEventListener('click', selectGroupTemplates);
elements.chooseGroupSingleTemplatesButton.addEventListener('click', selectGroupSingleMockupTemplates);
elements.renamePngButton.addEventListener('click', openRenamePngDialog);
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
    if (state.mockupMode === 'group-shirt') {
      if (state.groupSingleMockupTemplates.length === 0) {
        const selected = await selectGroupSingleMockupTemplates();
        if (!selected && state.groupSingleMockupTemplates.length === 0) {
          elements.createSingleMockups.checked = false;
          renderInputAssets();
          updateControls();
          return;
        }
      }
      const missing = templatesMissingRegions();
      if (missing.length > 0) elements.advancedSettings.open = true;
      elements.singleRegionStatus.textContent = missing.length > 0
        ? `Cần chỉnh và lưu vùng in cho ${missing.length} ảnh trước khi tạo.`
        : `Sẽ tạo ${state.groupSingleMockupTemplates.length} mockup đơn.`;
      renderInputAssets();
      updateControls();
      return;
    }
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
elements.editGroupMockupRegions.addEventListener('change', () => {
  if (elements.editGroupMockupRegions.checked) enterGroupRegionEditor();
  else exitGroupRegionEditor({ notifyUnsaved: true });
});
elements.saveGroupMockupRegions.addEventListener('click', saveGroupRegionEditor);
elements.addFrontRegionButton.addEventListener('click', () => addGroupRegion('front'));
elements.addBackRegionButton.addEventListener('click', () => addGroupRegion('back'));
elements.groupRegionColorLight.addEventListener('change', () => {
  if (elements.groupRegionColorLight.checked) elements.groupRegionColorDark.checked = false;
});
elements.groupRegionColorDark.addEventListener('change', () => {
  if (elements.groupRegionColorDark.checked) elements.groupRegionColorLight.checked = false;
});
elements.deleteGroupRegionButton.addEventListener('click', deleteActiveGroupRegion);
elements.rotateGroupRegionLeft.addEventListener('click', () => nudgeGroupRegion(0, 0, -15));
elements.rotateGroupRegionRight.addEventListener('click', () => nudgeGroupRegion(0, 0, 15));
elements.regionLayer.addEventListener('pointerdown', beginGroupRegionDrag);
elements.regionLayer.addEventListener('pointermove', moveGroupRegionDrag);
elements.regionLayer.addEventListener('pointerup', endGroupRegionDrag);
elements.regionLayer.addEventListener('pointercancel', endGroupRegionDrag);
elements.regionLayer.addEventListener('focusin', (event) => {
  const node = event.target.closest('[data-region-id]');
  if (node) selectGroupRegion(node.dataset.regionId);
});
elements.regionLayer.addEventListener('lostpointercapture', (event) => {
  if (state.regionEditor?.kind === 'group' && state.regionEditor.drag?.pointerId === event.pointerId) {
    state.regionEditor.drag = null;
  }
}, true);
elements.regionLayer.addEventListener('keydown', (event) => {
  const node = event.target.closest('[data-region-id]');
  if (!node) return;
  selectGroupRegion(node.dataset.regionId);
  const step = event.shiftKey ? 10 : 1;
  if (event.key === 'ArrowLeft') nudgeGroupRegion(-step, 0);
  else if (event.key === 'ArrowRight') nudgeGroupRegion(step, 0);
  else if (event.key === 'ArrowUp') nudgeGroupRegion(0, -step);
  else if (event.key === 'ArrowDown') nudgeGroupRegion(0, step);
  else if (event.key === 'Delete') deleteActiveGroupRegion();
  else return;
  event.preventDefault();
});
for (const input of [
  elements.groupRegionX,
  elements.groupRegionY,
  elements.groupRegionWidth,
  elements.groupRegionHeight,
  elements.groupRegionRotation,
]) {
  input.addEventListener('change', () => applyGroupInspectorInput(input));
}
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
elements.removePngButton.addEventListener('click', clearPngFiles);
elements.renamePngSearch.addEventListener('input', () => {
  if (state.renamePicker?.saving) return;
  if (state.renamePicker) state.renamePicker.error = '';
  renderRenamePngDialog();
});
elements.renamePngSelectAll.addEventListener('click', () => {
  if (!state.renamePicker || state.renamePicker.saving) return;
  state.renamePicker.error = '';
  for (const file of renameSelectionFiles()) state.renamePicker.selected.add(file.path);
  renderRenamePngDialog();
});
elements.renamePngSelectNone.addEventListener('click', () => {
  if (!state.renamePicker || state.renamePicker.saving) return;
  state.renamePicker.error = '';
  for (const file of renameSelectionFiles()) state.renamePicker.selected.delete(file.path);
  renderRenamePngDialog();
});
for (const input of [
  elements.renameColorNone,
  elements.renameColorLight,
  elements.renameColorDark,
  elements.renameSideNone,
  elements.renameSideFront,
  elements.renameSideBack,
]) input.addEventListener('change', () => {
  if (state.renamePicker?.saving) return;
  if (state.renamePicker) state.renamePicker.error = '';
  renderRenamePngDialog();
});
elements.renamePngApply.addEventListener('click', () => applyRenamePngFiles(false));
elements.renamePngConfirm.addEventListener('click', () => applyRenamePngFiles(true));
elements.renamePngCancel.addEventListener('click', closeRenamePngDialog);
elements.renamePngClose.addEventListener('click', closeRenamePngDialog);
elements.renamePngDialog.addEventListener('cancel', (event) => {
  if (state.renamePicker?.saving) event.preventDefault();
});
elements.renamePngDialog.addEventListener('close', () => {
  state.renamePicker = null;
  elements.renamePngSearch.value = '';
  window.setTimeout(() => elements.renamePngButton.focus(), 0);
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
setMockupMode('bundle', { initial: true });
elements.metadataGroups.classList.toggle('is-disabled', !elements.removeMetadata.checked);
renderFileList();
updateSelectionState();
updateControls();
refreshInputAssets({ silent: true });
