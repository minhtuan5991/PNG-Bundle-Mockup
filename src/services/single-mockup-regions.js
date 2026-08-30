'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SINGLE_MOCKUP_REGION_SCHEMA_VERSION = 1;
const DEFAULT_REGION_FILE_NAME = 'single-mockup-regions.json';
const PRINT_REGION_ASPECT_WIDTH = 7;
const PRINT_REGION_ASPECT_HEIGHT = 8;
const PRINT_REGION_ASPECT_RATIO = PRINT_REGION_ASPECT_WIDTH / PRINT_REGION_ASPECT_HEIGHT;
const COORDINATE_EPSILON = 1e-9;
const ASPECT_RATIO_EPSILON = 1e-4;

class SingleMockupRegionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SingleMockupRegionError';
    this.code = code;
    Object.assign(this, details);
  }
}

function defaultRegionDocument() {
  return {
    schemaVersion: SINGLE_MOCKUP_REGION_SCHEMA_VERSION,
    templates: {},
  };
}

function cloneRegion(region) {
  return {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  };
}

function readCoordinate(region, primaryName, aliasName) {
  const primary = region[primaryName];
  const alias = aliasName ? region[aliasName] : undefined;
  if (primary !== undefined && alias !== undefined && Number(primary) !== Number(alias)) {
    throw new SingleMockupRegionError(
      `Toạ độ ${primaryName} và ${aliasName} không được mâu thuẫn.`,
      'CONFLICTING_REGION_COORDINATE',
      { coordinate: primaryName },
    );
  }
  return Number(primary !== undefined ? primary : alias);
}

function normalizeTemplateSize(templateSize) {
  if (!templateSize || typeof templateSize !== 'object') return null;
  const hasWidth = templateSize.width !== undefined || templateSize.templateWidth !== undefined;
  const hasHeight = templateSize.height !== undefined || templateSize.templateHeight !== undefined;
  if (!hasWidth && !hasHeight) return null;
  const width = Number(templateSize.width ?? templateSize.templateWidth);
  const height = Number(templateSize.height ?? templateSize.templateHeight);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new SingleMockupRegionError(
      'Kích thước ảnh mockup phải là hai số nguyên dương.',
      'INVALID_TEMPLATE_SIZE',
    );
  }
  return { width, height };
}

function validateNormalizedPrintRegion(region, templateSize = null) {
  if (!region || typeof region !== 'object' || Array.isArray(region)) {
    throw new SingleMockupRegionError(
      'Vùng in mockup đơn không hợp lệ.',
      'INVALID_PRINT_REGION',
    );
  }

  const normalized = {
    x: readCoordinate(region, 'x', 'left'),
    y: readCoordinate(region, 'y', 'top'),
    width: Number(region.width),
    height: Number(region.height),
  };

  for (const [coordinate, value] of Object.entries(normalized)) {
    if (!Number.isFinite(value)) {
      throw new SingleMockupRegionError(
        `Toạ độ ${coordinate} phải là một số hữu hạn.`,
        'INVALID_REGION_COORDINATE',
        { coordinate },
      );
    }
  }

  if (
    normalized.x < 0 || normalized.y < 0 ||
    normalized.x > 1 || normalized.y > 1 ||
    normalized.width <= 0 || normalized.height <= 0 ||
    normalized.width > 1 || normalized.height > 1 ||
    normalized.x + normalized.width > 1 + COORDINATE_EPSILON ||
    normalized.y + normalized.height > 1 + COORDINATE_EPSILON
  ) {
    throw new SingleMockupRegionError(
      'Vùng in phải nằm trọn trong ảnh với toạ độ normalized từ 0 đến 1.',
      'REGION_OUT_OF_BOUNDS',
      { region: normalized },
    );
  }

  const size = normalizeTemplateSize(templateSize);
  if (size) {
    const pixelRatio = (normalized.width * size.width) / (normalized.height * size.height);
    if (Math.abs(pixelRatio - PRINT_REGION_ASPECT_RATIO) > ASPECT_RATIO_EPSILON) {
      throw new SingleMockupRegionError(
        'Vùng in mockup đơn phải có tỷ lệ 42:48 (7:8).',
        'INVALID_REGION_ASPECT_RATIO',
        { expectedRatio: PRINT_REGION_ASPECT_RATIO, actualRatio: pixelRatio },
      );
    }
  }

  return Object.freeze(normalized);
}

function templateDescriptor(template, explicitSize = null) {
  const value = typeof template === 'string'
    ? { path: template }
    : template;
  if (!value || typeof value !== 'object') {
    throw new SingleMockupRegionError('Thiếu thông tin ảnh mockup.', 'INVALID_TEMPLATE_DESCRIPTOR');
  }

  const rawName = value.name || (value.path ? path.basename(String(value.path)) : '');
  if (typeof rawName !== 'string' || rawName.trim().length === 0) {
    throw new SingleMockupRegionError('Tên ảnh mockup không hợp lệ.', 'INVALID_TEMPLATE_NAME');
  }
  const name = path.basename(rawName.trim()).normalize('NFC');
  if (name === '.' || name === '..') {
    throw new SingleMockupRegionError('Tên ảnh mockup không hợp lệ.', 'INVALID_TEMPLATE_NAME');
  }

  const size = normalizeTemplateSize(explicitSize || value);
  return {
    name,
    key: name.toLocaleLowerCase('en-US'),
    ...(size ? size : {}),
  };
}

function createRegionRecord(template, region, explicitSize = null) {
  const descriptor = templateDescriptor(template, explicitSize);
  if (!descriptor.width || !descriptor.height) {
    throw new SingleMockupRegionError(
      'Cần kích thước ảnh mockup khi lưu vùng in.',
      'MISSING_TEMPLATE_SIZE',
      { templateName: descriptor.name },
    );
  }
  const normalizedRegion = validateNormalizedPrintRegion(region, descriptor);
  return {
    key: descriptor.key,
    record: {
      templateName: descriptor.name,
      templateWidth: descriptor.width,
      templateHeight: descriptor.height,
      region: cloneRegion(normalizedRegion),
    },
  };
}

function sanitizeRegionDocument(rawDocument) {
  const output = defaultRegionDocument();
  if (
    !rawDocument || typeof rawDocument !== 'object' || Array.isArray(rawDocument) ||
    rawDocument.schemaVersion !== SINGLE_MOCKUP_REGION_SCHEMA_VERSION ||
    !rawDocument.templates || typeof rawDocument.templates !== 'object' ||
    Array.isArray(rawDocument.templates)
  ) {
    return output;
  }

  for (const rawRecord of Object.values(rawDocument.templates)) {
    try {
      if (!rawRecord || typeof rawRecord !== 'object') continue;
      const { key, record } = createRegionRecord(
        {
          name: rawRecord.templateName,
          width: rawRecord.templateWidth,
          height: rawRecord.templateHeight,
        },
        rawRecord.region,
      );
      output.templates[key] = record;
    } catch {
      // A corrupt record must not hide other valid template settings.
    }
  }
  return output;
}

function cloneDocument(document) {
  const copy = defaultRegionDocument();
  for (const [key, record] of Object.entries(document.templates)) {
    copy.templates[key] = {
      templateName: record.templateName,
      templateWidth: record.templateWidth,
      templateHeight: record.templateHeight,
      region: cloneRegion(record.region),
    };
  }
  return copy;
}

function getRegionFromDocument(document, template, options = {}) {
  const sanitized = sanitizeRegionDocument(document);
  const descriptor = templateDescriptor(template, options.templateSize || null);
  const record = sanitized.templates[descriptor.key];
  if (!record) return null;

  if (
    descriptor.width && descriptor.height &&
    (record.templateWidth !== descriptor.width || record.templateHeight !== descriptor.height)
  ) {
    return null;
  }
  return cloneRegion(record.region);
}

function createSingleMockupRegionStore(options = {}) {
  const {
    storageDirectory,
    userDataPath,
    fileName = DEFAULT_REGION_FILE_NAME,
    fsImpl = fs,
    onWarning = () => {},
  } = options;
  const directoryOption = storageDirectory ?? userDataPath;
  if (typeof directoryOption !== 'string' || directoryOption.trim().length === 0) {
    throw new TypeError('createSingleMockupRegionStore cần storageDirectory hợp lệ.');
  }
  if (typeof fileName !== 'string' || fileName.length === 0 || path.basename(fileName) !== fileName) {
    throw new TypeError('fileName phải là tên file, không được chứa đường dẫn.');
  }
  if (typeof onWarning !== 'function') throw new TypeError('onWarning phải là một hàm.');

  const directoryPath = path.resolve(directoryOption);
  const filePath = path.join(directoryPath, fileName);
  let cachedDocument = null;
  let loadPromise = null;
  let writeQueue = Promise.resolve();
  let temporarySequence = 0;

  function warn(error) {
    try {
      onWarning(error);
    } catch {
      // Diagnostics must never prevent loading the usable records.
    }
  }

  async function readFromDisk() {
    try {
      const contents = await fsImpl.readFile(filePath, 'utf8');
      return sanitizeRegionDocument(JSON.parse(contents));
    } catch (error) {
      if (error?.code !== 'ENOENT') warn(error);
      return defaultRegionDocument();
    }
  }

  async function ensureLoaded() {
    if (cachedDocument) return cachedDocument;
    if (!loadPromise) {
      loadPromise = readFromDisk().then((document) => {
        cachedDocument = document;
        return document;
      });
    }
    return loadPromise;
  }

  async function writeAtomically(document) {
    await fsImpl.mkdir(directoryPath, { recursive: true });
    temporarySequence += 1;
    const temporaryPath = `${filePath}.tmp-${process.pid}-${temporarySequence}`;
    try {
      await fsImpl.writeFile(
        temporaryPath,
        `${JSON.stringify(document, null, 2)}\n`,
        { encoding: 'utf8', mode: 0o600 },
      );
      await fsImpl.rename(temporaryPath, filePath);
    } finally {
      await fsImpl.unlink(temporaryPath).catch(() => {});
    }
  }

  async function queueWrite(mutator) {
    const operation = writeQueue.catch(() => {}).then(async () => {
      const current = await ensureLoaded();
      const next = mutator(cloneDocument(current));
      await writeAtomically(next);
      cachedDocument = next;
      return cloneDocument(next);
    });
    writeQueue = operation;
    return operation;
  }

  async function load() {
    return cloneDocument(await ensureLoaded());
  }

  async function get(template) {
    const descriptor = templateDescriptor(template);
    const document = await ensureLoaded();
    const record = document.templates[descriptor.key];
    if (!record) return null;
    if (
      descriptor.width && descriptor.height &&
      (record.templateWidth !== descriptor.width || record.templateHeight !== descriptor.height)
    ) {
      return null;
    }
    return cloneRegion(record.region);
  }

  async function save(template, region, explicitSize = null) {
    const { key, record } = createRegionRecord(template, region, explicitSize);
    await queueWrite((document) => {
      document.templates[key] = record;
      return document;
    });
    return cloneRegion(record.region);
  }

  async function replaceAll(entries) {
    if (!Array.isArray(entries)) {
      throw new TypeError('replaceAll cần một mảng thiết lập vùng in.');
    }
    const updates = {};
    for (const entry of entries) {
      const { key, record } = createRegionRecord(
        entry?.template,
        entry?.region,
        entry?.templateSize || null,
      );
      if (updates[key]) {
        throw new SingleMockupRegionError(
          `Thiết lập bị lặp cho ảnh “${record.templateName}”.`,
          'DUPLICATE_TEMPLATE_REGION',
          { templateName: record.templateName },
        );
      }
      updates[key] = record;
    }
    return queueWrite((document) => {
      for (const [key, record] of Object.entries(updates)) {
        document.templates[key] = record;
      }
      return document;
    });
  }

  return Object.freeze({
    filePath,
    load,
    get,
    save,
    replaceAll,
  });
}

module.exports = {
  SINGLE_MOCKUP_REGION_SCHEMA_VERSION,
  DEFAULT_REGION_FILE_NAME,
  PRINT_REGION_ASPECT_WIDTH,
  PRINT_REGION_ASPECT_HEIGHT,
  PRINT_REGION_ASPECT_RATIO,
  SingleMockupRegionError,
  defaultRegionDocument,
  validateNormalizedPrintRegion,
  templateDescriptor,
  sanitizeRegionDocument,
  getRegionFromDocument,
  createSingleMockupRegionStore,
};
