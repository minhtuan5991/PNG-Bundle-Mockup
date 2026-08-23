'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const GROUP_SHIRT_REGION_SCHEMA_VERSION = 2;
const GROUP_SHIRT_PRINT_ASPECT_WIDTH = 42;
const GROUP_SHIRT_PRINT_ASPECT_HEIGHT = 48;
const GROUP_SHIRT_PRINT_ASPECT_RATIO =
  GROUP_SHIRT_PRINT_ASPECT_WIDTH / GROUP_SHIRT_PRINT_ASPECT_HEIGHT;
const DEFAULT_GROUP_SHIRT_REGION_FILE_NAME = 'group-shirt-regions.json';
const MAX_GROUP_SHIRT_REGIONS_PER_TEMPLATE = 64;
const COORDINATE_EPSILON = 1e-9;

class GroupShirtRegionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GroupShirtRegionError';
    this.code = code;
    Object.assign(this, details);
  }
}

function defaultGroupShirtRegionDocument() {
  return {
    schemaVersion: GROUP_SHIRT_REGION_SCHEMA_VERSION,
    templates: {},
  };
}

function normalizeTemplateSize(templateSize) {
  if (!templateSize || typeof templateSize !== 'object') return null;
  const hasWidth = templateSize.width !== undefined || templateSize.templateWidth !== undefined;
  const hasHeight = templateSize.height !== undefined || templateSize.templateHeight !== undefined;
  if (!hasWidth && !hasHeight) return null;
  const width = Number(templateSize.width ?? templateSize.templateWidth);
  const height = Number(templateSize.height ?? templateSize.templateHeight);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new GroupShirtRegionError(
      'Kích thước ảnh nền Group Shirt phải là hai số nguyên dương.',
      'INVALID_GROUP_SHIRT_TEMPLATE_SIZE',
    );
  }
  return { width, height };
}

function normalizeGroupShirtSide(value) {
  const normalized = String(value ?? '').trim().toLocaleLowerCase('en-US');
  if (normalized === 'front' || normalized === 'f') return 'front';
  if (normalized === 'back' || normalized === 'b') return 'back';
  throw new GroupShirtRegionError(
    'Vùng in phải là mặt trước hoặc mặt sau.',
    'INVALID_GROUP_SHIRT_REGION_SIDE',
    { side: value },
  );
}

function normalizeGroupShirtColor(value) {
  const normalized = String(value ?? 'wh').trim().toLocaleLowerCase('en-US');
  if (normalized === 'wh' || normalized === 'light') return 'wh';
  if (normalized === 'bl' || normalized === 'dark') return 'bl';
  throw new GroupShirtRegionError(
    'Vùng in phải thuộc áo sáng màu hoặc áo tối màu.',
    'INVALID_GROUP_SHIRT_REGION_COLOR',
    { color: value },
  );
}

function normalizeRotation(value) {
  const rotation = Number(value ?? 0);
  if (!Number.isFinite(rotation)) {
    throw new GroupShirtRegionError(
      'Góc xoay vùng in phải là một số hữu hạn.',
      'INVALID_GROUP_SHIRT_REGION_ROTATION',
      { rotation: value },
    );
  }
  const normalized = ((rotation + 180) % 360 + 360) % 360 - 180;
  return Math.abs(normalized) < 1e-12 ? 0 : normalized;
}

function normalizeRegionId(value) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 160) {
    throw new GroupShirtRegionError(
      'Mỗi vùng in cần một id chuỗi không rỗng.',
      'INVALID_GROUP_SHIRT_REGION_ID',
      { id: value },
    );
  }
  return value.trim().normalize('NFC');
}

function finiteCoordinate(value, coordinate) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new GroupShirtRegionError(
      `Toạ độ ${coordinate} phải là một số hữu hạn.`,
      'INVALID_GROUP_SHIRT_REGION_COORDINATE',
      { coordinate, value },
    );
  }
  return number;
}

function canonicalRegionCoordinates(region) {
  const width = finiteCoordinate(region.width, 'width');
  const height = finiteCoordinate(region.height, 'height');
  const rawCenterX = region.centerX ?? region.cx;
  const rawCenterY = region.centerY ?? region.cy;
  const hasCenter = rawCenterX !== undefined || rawCenterY !== undefined;
  if (hasCenter && (rawCenterX === undefined || rawCenterY === undefined)) {
    throw new GroupShirtRegionError(
      'Cần cung cấp đồng thời tâm X và tâm Y của vùng in.',
      'INCOMPLETE_GROUP_SHIRT_REGION_CENTER',
    );
  }
  if (hasCenter) {
    return {
      centerX: finiteCoordinate(rawCenterX, 'centerX'),
      centerY: finiteCoordinate(rawCenterY, 'centerY'),
      width,
      height,
    };
  }
  const x = finiteCoordinate(region.x ?? region.left, 'x');
  const y = finiteCoordinate(region.y ?? region.top, 'y');
  return {
    centerX: x + width / 2,
    centerY: y + height / 2,
    width,
    height,
  };
}

function rotatedPixelCorners(region, templateSize) {
  const centerX = region.centerX * templateSize.width;
  const centerY = region.centerY * templateSize.height;
  const halfWidth = region.width * templateSize.width / 2;
  const halfHeight = region.height * templateSize.height / 2;
  const radians = region.rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([offsetX, offsetY]) => ({
    x: centerX + offsetX * cosine - offsetY * sine,
    y: centerY + offsetX * sine + offsetY * cosine,
  }));
}

function validateGroupShirtRegion(region, templateSize = null) {
  if (!region || typeof region !== 'object' || Array.isArray(region)) {
    throw new GroupShirtRegionError(
      'Vùng in Group Shirt không hợp lệ.',
      'INVALID_GROUP_SHIRT_REGION',
    );
  }
  const coordinates = canonicalRegionCoordinates(region);
  const normalized = {
    id: normalizeRegionId(region.id),
    side: normalizeGroupShirtSide(region.side ?? region.type),
    color: normalizeGroupShirtColor(region.color ?? region.shirtColor),
    ...coordinates,
    rotation: normalizeRotation(region.rotation ?? region.angle),
  };
  if (
    normalized.centerX < 0 || normalized.centerX > 1 ||
    normalized.centerY < 0 || normalized.centerY > 1 ||
    normalized.width <= 0 || normalized.width > 1 ||
    normalized.height <= 0 || normalized.height > 1
  ) {
    throw new GroupShirtRegionError(
      'Tâm và kích thước vùng in phải dùng toạ độ normalized từ 0 đến 1.',
      'GROUP_SHIRT_REGION_OUT_OF_BOUNDS',
      { region: normalized },
    );
  }

  const size = templateSize ? normalizeTemplateSize(templateSize) : null;
  if (size) {
    const pixelWidth = normalized.width * size.width;
    const pixelHeight = normalized.height * size.height;
    const actualRatio = pixelWidth / pixelHeight;
    if (Math.abs(actualRatio - GROUP_SHIRT_PRINT_ASPECT_RATIO) > 1e-6) {
      throw new GroupShirtRegionError(
        'Vùng in Group Shirt phải giữ đúng tỷ lệ 42×48.',
        'INVALID_GROUP_SHIRT_REGION_ASPECT_RATIO',
        { region: normalized, actualRatio },
      );
    }
    const corners = rotatedPixelCorners(normalized, size);
    if (corners.some((corner) => (
      corner.x < -COORDINATE_EPSILON || corner.y < -COORDINATE_EPSILON ||
      corner.x > size.width + COORDINATE_EPSILON ||
      corner.y > size.height + COORDINATE_EPSILON
    ))) {
      throw new GroupShirtRegionError(
        'Vùng in sau khi xoay phải nằm trọn trong ảnh nền.',
        'ROTATED_GROUP_SHIRT_REGION_OUT_OF_BOUNDS',
        { region: normalized, corners },
      );
    }
  } else if (
    normalized.centerX - normalized.width / 2 < -COORDINATE_EPSILON ||
    normalized.centerX + normalized.width / 2 > 1 + COORDINATE_EPSILON ||
    normalized.centerY - normalized.height / 2 < -COORDINATE_EPSILON ||
    normalized.centerY + normalized.height / 2 > 1 + COORDINATE_EPSILON
  ) {
    throw new GroupShirtRegionError(
      'Vùng in phải nằm trọn trong ảnh nền.',
      'GROUP_SHIRT_REGION_OUT_OF_BOUNDS',
      { region: normalized },
    );
  }
  return Object.freeze(normalized);
}

function validateGroupShirtRegions(regions, templateSize = null) {
  if (!Array.isArray(regions)) {
    throw new GroupShirtRegionError(
      'Danh sách vùng in Group Shirt phải là một mảng.',
      'INVALID_GROUP_SHIRT_REGION_LIST',
    );
  }
  if (regions.length > MAX_GROUP_SHIRT_REGIONS_PER_TEMPLATE) {
    throw new GroupShirtRegionError(
      `Mỗi ảnh nền chỉ được có tối đa ${MAX_GROUP_SHIRT_REGIONS_PER_TEMPLATE} vùng in.`,
      'TOO_MANY_GROUP_SHIRT_REGIONS',
      { count: regions.length },
    );
  }
  const ids = new Set();
  return Object.freeze(regions.map((region) => {
    const normalized = validateGroupShirtRegion(region, templateSize);
    const key = normalized.id.toLocaleLowerCase('en-US');
    if (ids.has(key)) {
      throw new GroupShirtRegionError(
        `Id vùng in “${normalized.id}” bị lặp.`,
        'DUPLICATE_GROUP_SHIRT_REGION_ID',
        { id: normalized.id },
      );
    }
    ids.add(key);
    return normalized;
  }));
}

function groupShirtTemplateDescriptor(template, explicitSize = null) {
  const value = typeof template === 'string' ? { path: template } : template;
  if (!value || typeof value !== 'object') {
    throw new GroupShirtRegionError(
      'Thiếu thông tin ảnh nền Group Shirt.',
      'INVALID_GROUP_SHIRT_TEMPLATE_DESCRIPTOR',
    );
  }
  const rawName = value.name || (value.path ? path.basename(String(value.path)) : '');
  if (typeof rawName !== 'string' || rawName.trim().length === 0) {
    throw new GroupShirtRegionError(
      'Tên ảnh nền Group Shirt không hợp lệ.',
      'INVALID_GROUP_SHIRT_TEMPLATE_NAME',
    );
  }
  const name = path.basename(rawName.trim()).normalize('NFC');
  const size = normalizeTemplateSize(explicitSize || value);
  const rawFingerprint = value.fingerprint ?? value.sha256 ?? null;
  const fingerprint = typeof rawFingerprint === 'string' && rawFingerprint.trim().length > 0
    ? rawFingerprint.trim().toLocaleLowerCase('en-US')
    : null;
  return {
    name,
    key: name.toLocaleLowerCase('en-US'),
    ...(size || {}),
    fingerprint,
  };
}

function cloneRegion(region) {
  return {
    id: region.id,
    side: region.side,
    color: region.color,
    centerX: region.centerX,
    centerY: region.centerY,
    width: region.width,
    height: region.height,
    rotation: region.rotation,
  };
}

function createGroupShirtRegionRecord(template, regions, explicitSize = null) {
  const descriptor = groupShirtTemplateDescriptor(template, explicitSize);
  if (!descriptor.width || !descriptor.height) {
    throw new GroupShirtRegionError(
      'Cần kích thước ảnh nền khi lưu vùng in Group Shirt.',
      'MISSING_GROUP_SHIRT_TEMPLATE_SIZE',
      { templateName: descriptor.name },
    );
  }
  const normalizedRegions = validateGroupShirtRegions(regions, descriptor);
  return {
    key: descriptor.key,
    record: {
      templateName: descriptor.name,
      templateWidth: descriptor.width,
      templateHeight: descriptor.height,
      templateFingerprint: descriptor.fingerprint,
      regions: normalizedRegions.map(cloneRegion),
    },
  };
}

function sanitizeGroupShirtRegionDocument(rawDocument) {
  const output = defaultGroupShirtRegionDocument();
  if (
    !rawDocument || typeof rawDocument !== 'object' || Array.isArray(rawDocument) ||
    (rawDocument.schemaVersion !== 1 &&
      rawDocument.schemaVersion !== GROUP_SHIRT_REGION_SCHEMA_VERSION) ||
    !rawDocument.templates || typeof rawDocument.templates !== 'object' ||
    Array.isArray(rawDocument.templates)
  ) return output;

  for (const rawRecord of Object.values(rawDocument.templates)) {
    try {
      const { key, record } = createGroupShirtRegionRecord({
        name: rawRecord?.templateName,
        width: rawRecord?.templateWidth,
        height: rawRecord?.templateHeight,
        fingerprint: rawRecord?.templateFingerprint,
      }, rawRecord?.regions);
      output.templates[key] = record;
    } catch {
      // One damaged template must not hide other usable region settings.
    }
  }
  return output;
}

function cloneDocument(document) {
  const copy = defaultGroupShirtRegionDocument();
  for (const [key, record] of Object.entries(document.templates)) {
    copy.templates[key] = {
      templateName: record.templateName,
      templateWidth: record.templateWidth,
      templateHeight: record.templateHeight,
      templateFingerprint: record.templateFingerprint || null,
      regions: record.regions.map(cloneRegion),
    };
  }
  return copy;
}

function recordMatchesDescriptor(record, descriptor) {
  if (
    descriptor.width && descriptor.height &&
    (record.templateWidth !== descriptor.width || record.templateHeight !== descriptor.height)
  ) return false;
  return !(
    descriptor.fingerprint &&
    descriptor.fingerprint !== record.templateFingerprint
  );
}

function getGroupShirtRegionsFromDocument(document, template, options = {}) {
  const sanitized = sanitizeGroupShirtRegionDocument(document);
  const descriptor = groupShirtTemplateDescriptor(template, options.templateSize || null);
  const record = sanitized.templates[descriptor.key];
  if (!record || !recordMatchesDescriptor(record, descriptor)) return null;
  return record.regions.map(cloneRegion);
}

function createGroupShirtRegionStore(options = {}) {
  const {
    userDataPath,
    fileName = DEFAULT_GROUP_SHIRT_REGION_FILE_NAME,
    fsImpl = fs,
    onWarning = () => {},
  } = options;
  if (typeof userDataPath !== 'string' || userDataPath.trim().length === 0) {
    throw new TypeError('createGroupShirtRegionStore cần userDataPath hợp lệ.');
  }
  if (typeof fileName !== 'string' || !fileName || path.basename(fileName) !== fileName) {
    throw new TypeError('fileName phải là tên file, không được chứa đường dẫn.');
  }
  if (typeof onWarning !== 'function') throw new TypeError('onWarning phải là một hàm.');

  const directoryPath = path.resolve(userDataPath);
  const filePath = path.join(directoryPath, fileName);
  let cachedDocument = null;
  let loadPromise = null;
  let writeQueue = Promise.resolve();
  let temporarySequence = 0;

  function warn(error) {
    try {
      onWarning(error);
    } catch {
      // Diagnostics callbacks must not prevent the usable records from loading.
    }
  }

  async function readFromDisk() {
    try {
      return sanitizeGroupShirtRegionDocument(JSON.parse(await fsImpl.readFile(filePath, 'utf8')));
    } catch (error) {
      if (error?.code !== 'ENOENT') warn(error);
      return defaultGroupShirtRegionDocument();
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
    const descriptor = groupShirtTemplateDescriptor(template);
    const document = await ensureLoaded();
    const record = document.templates[descriptor.key];
    if (!record || !recordMatchesDescriptor(record, descriptor)) return null;
    return record.regions.map(cloneRegion);
  }

  async function save(template, regions, explicitSize = null) {
    const { key, record } = createGroupShirtRegionRecord(template, regions, explicitSize);
    await queueWrite((document) => {
      document.templates[key] = record;
      return document;
    });
    return record.regions.map(cloneRegion);
  }

  async function replaceAll(entries) {
    if (!Array.isArray(entries)) throw new TypeError('replaceAll cần một mảng thiết lập vùng in.');
    const updates = {};
    for (const entry of entries) {
      const { key, record } = createGroupShirtRegionRecord(
        entry?.template,
        entry?.regions,
        entry?.templateSize || null,
      );
      if (updates[key]) {
        throw new GroupShirtRegionError(
          `Thiết lập bị lặp cho ảnh nền “${record.templateName}”.`,
          'DUPLICATE_GROUP_SHIRT_TEMPLATE_REGIONS',
          { templateName: record.templateName },
        );
      }
      updates[key] = record;
    }
    return queueWrite((document) => {
      for (const [key, record] of Object.entries(updates)) document.templates[key] = record;
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
  GROUP_SHIRT_REGION_SCHEMA_VERSION,
  GROUP_SHIRT_PRINT_ASPECT_WIDTH,
  GROUP_SHIRT_PRINT_ASPECT_HEIGHT,
  DEFAULT_GROUP_SHIRT_REGION_FILE_NAME,
  MAX_GROUP_SHIRT_REGIONS_PER_TEMPLATE,
  GroupShirtRegionError,
  defaultGroupShirtRegionDocument,
  normalizeGroupShirtColor,
  normalizeGroupShirtSide,
  validateGroupShirtRegion,
  validateGroupShirtRegions,
  groupShirtTemplateDescriptor,
  sanitizeGroupShirtRegionDocument,
  getGroupShirtRegionsFromDocument,
  createGroupShirtRegionStore,
};
