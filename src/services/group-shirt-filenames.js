'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const GROUP_SHIRT_COLORS = Object.freeze({
  LIGHT: 'wh',
  DARK: 'bl',
});
const GROUP_SHIRT_SIDES = Object.freeze({
  FRONT: 'f',
  BACK: 'b',
});
const GROUP_SHIRT_TEMPLATE_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
]);
const TEMPLATE_EXTENSION_SET = new Set(GROUP_SHIRT_TEMPLATE_EXTENSIONS);
const SOURCE_MARKERS = new Set(['wh', 'bl', 'f', 'b']);
const TEMPLATE_MARKERS = new Set(['wh', 'bl']);

class GroupShirtFilenameError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GroupShirtFilenameError';
    this.code = code;
    Object.assign(this, details);
  }
}

class GroupShirtRenameError extends GroupShirtFilenameError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'GroupShirtRenameError';
  }
}

function filenameFrom(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GroupShirtFilenameError(`${label} không hợp lệ.`, 'INVALID_FILE_NAME');
  }
  return path.basename(value.trim()).normalize('NFC');
}

function normalizeGroupDisplay(value) {
  return String(value).normalize('NFC').trim().replace(/\s+/gu, ' ');
}

function normalizeGroupKey(value) {
  const display = normalizeGroupDisplay(value);
  if (!display) {
    throw new GroupShirtFilenameError(
      'Tên nhóm trước dấu ngoặc hoặc mkg không được để trống.',
      'MISSING_GROUP_KEY',
    );
  }
  return display.toLocaleLowerCase('en-US');
}

function peelTerminalMarkers(stem, allowedMarkers, fileName) {
  let remaining = stem.trimEnd();
  const markers = [];
  while (true) {
    const match = remaining.match(/\.([a-z]{1,3})\s*$/iu);
    if (!match) break;
    const marker = match[1].toLocaleLowerCase('en-US');
    if (!allowedMarkers.has(marker)) break;
    if (markers.includes(marker)) {
      throw new GroupShirtFilenameError(
        `Tên file “${fileName}” lặp phần mở rộng .${marker}.`,
        'DUPLICATE_NAME_MARKER',
        { fileName, marker },
      );
    }
    markers.unshift(marker);
    remaining = remaining.slice(0, match.index).trimEnd();
  }
  return { baseStem: remaining, markers };
}

function resolveExclusiveMarker(markers, first, second, category, fileName) {
  const hasFirst = markers.includes(first);
  const hasSecond = markers.includes(second);
  if (hasFirst && hasSecond) {
    throw new GroupShirtFilenameError(
      `Tên file “${fileName}” chứa hai phần mở rộng ${category} mâu thuẫn (.${first} và .${second}).`,
      'CONFLICTING_NAME_MARKERS',
      { fileName, category, markers: [first, second] },
    );
  }
  return hasFirst ? first : (hasSecond ? second : null);
}

function parseGroupShirtSourceName(value) {
  const name = filenameFrom(value, 'Tên PNG');
  if (path.extname(name).toLocaleLowerCase('en-US') !== '.png') {
    throw new GroupShirtFilenameError(
      `“${name}” không phải file PNG.`,
      'GROUP_SHIRT_SOURCE_NOT_PNG',
      { fileName: name },
    );
  }

  const rawStem = name.slice(0, -path.extname(name).length);
  const { baseStem, markers } = peelTerminalMarkers(rawStem, SOURCE_MARKERS, name);
  const colorMarker = resolveExclusiveMarker(markers, 'wh', 'bl', 'màu áo', name);
  const sideMarker = resolveExclusiveMarker(markers, 'f', 'b', 'mặt áo', name);
  const groupMatch = baseStem.match(/^(.*?)\s*\(\s*(\d+)\s*\)\s*$/u);
  if (!groupMatch) {
    throw new GroupShirtFilenameError(
      `Tên PNG “${name}” phải có dạng <nhóm> (<số thứ tự>).`,
      'INVALID_GROUP_SHIRT_SOURCE_NAME',
      { fileName: name },
    );
  }

  const group = normalizeGroupDisplay(groupMatch[1]);
  const groupKey = normalizeGroupKey(group);
  const ordinal = Number(groupMatch[2]);
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
    throw new GroupShirtFilenameError(
      `Số thứ tự trong “${name}” phải là số nguyên dương.`,
      'INVALID_GROUP_SHIRT_ORDINAL',
      { fileName: name, ordinal: groupMatch[2] },
    );
  }

  return Object.freeze({
    ...(path.isAbsolute(value) ? { path: path.resolve(value) } : {}),
    name,
    stem: rawStem,
    baseStem,
    group,
    groupKey,
    ordinal,
    sequence: ordinal,
    color: colorMarker || GROUP_SHIRT_COLORS.LIGHT,
    side: sideMarker || GROUP_SHIRT_SIDES.FRONT,
    explicitColor: Boolean(colorMarker),
    explicitSide: Boolean(sideMarker),
    markers: Object.freeze([...markers]),
  });
}

function parseGroupShirtTemplateName(value) {
  const name = filenameFrom(value, 'Tên ảnh nền');
  const extension = path.extname(name).toLocaleLowerCase('en-US');
  if (!TEMPLATE_EXTENSION_SET.has(extension)) {
    throw new GroupShirtFilenameError(
      `Ảnh nền “${name}” phải là PNG, JPG, WEBP hoặc TIFF.`,
      'UNSUPPORTED_GROUP_SHIRT_TEMPLATE',
      { fileName: name, extension },
    );
  }

  const rawStem = name.slice(0, -path.extname(name).length);
  const { baseStem, markers } = peelTerminalMarkers(rawStem, TEMPLATE_MARKERS, name);
  const colorMarker = resolveExclusiveMarker(markers, 'wh', 'bl', 'màu áo', name);
  const templateMatch = baseStem.match(/^(.*?)\s*mkg\s*$/iu);
  if (!templateMatch) {
    throw new GroupShirtFilenameError(
      `Tên ảnh nền “${name}” phải kết thúc bằng mkg trước phần màu và đuôi ảnh.`,
      'MISSING_GROUP_SHIRT_MKG_MARKER',
      { fileName: name },
    );
  }
  const group = normalizeGroupDisplay(templateMatch[1]);
  const groupKey = normalizeGroupKey(group);
  return Object.freeze({
    ...(path.isAbsolute(value) ? { path: path.resolve(value) } : {}),
    name,
    stem: rawStem,
    baseStem,
    group,
    groupKey,
    color: colorMarker || GROUP_SHIRT_COLORS.LIGHT,
    explicitColor: Boolean(colorMarker),
    markers: Object.freeze([...markers]),
    extension,
  });
}

function normalizeRequestedMarker(value, allowed, category) {
  if (value === undefined || value === null || value === '') return null;
  const marker = String(value).toLocaleLowerCase('en-US');
  if (!allowed.has(marker)) {
    throw new GroupShirtRenameError(
      `Giá trị ${category} không hợp lệ: ${String(value)}.`,
      'INVALID_RENAME_MARKER',
      { category, value },
    );
  }
  return marker;
}

function buildGroupShirtRenamedPath(filePath, updates = {}) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new GroupShirtRenameError(
      'Đường dẫn PNG cần đổi tên phải là đường dẫn tuyệt đối.',
      'INVALID_RENAME_SOURCE_PATH',
      { filePath },
    );
  }
  const parsed = parseGroupShirtSourceName(filePath);
  const requestedColor = normalizeRequestedMarker(
    updates.color,
    new Set(['wh', 'bl']),
    'màu áo',
  );
  const requestedSide = normalizeRequestedMarker(
    updates.side,
    new Set(['f', 'b']),
    'mặt áo',
  );
  const color = requestedColor || (parsed.explicitColor ? parsed.color : null);
  const side = requestedSide || (parsed.explicitSide ? parsed.side : null);
  const targetName = `${parsed.baseStem}${color ? `.${color}` : ''}${side ? `.${side}` : ''}.png`;
  return path.join(path.dirname(path.resolve(filePath)), targetName);
}

function portablePathKey(filePath) {
  return path.resolve(filePath).toLocaleLowerCase('en-US');
}

function buildGroupShirtRenamePlan(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new GroupShirtRenameError(
      'Cần chọn ít nhất một PNG để đổi tên.',
      'NO_GROUP_SHIRT_RENAME_OPERATIONS',
    );
  }
  const sourceKeys = new Set();
  const targetKeys = new Set();
  const plan = operations.map((operation, index) => {
    const sourcePath = typeof operation === 'string' ? operation : operation?.path;
    if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
      throw new GroupShirtRenameError(
        `PNG thứ ${index + 1} không có đường dẫn tuyệt đối hợp lệ.`,
        'INVALID_RENAME_SOURCE_PATH',
        { index, filePath: sourcePath },
      );
    }
    const resolvedSourcePath = path.resolve(sourcePath);
    const targetPath = buildGroupShirtRenamedPath(resolvedSourcePath, {
      color: typeof operation === 'string' ? null : operation.color,
      side: typeof operation === 'string' ? null : operation.side,
    });
    const sourceKey = portablePathKey(resolvedSourcePath);
    const targetKey = portablePathKey(targetPath);
    if (sourceKeys.has(sourceKey)) {
      throw new GroupShirtRenameError(
        `PNG “${path.basename(resolvedSourcePath)}” bị chọn lặp.`,
        'DUPLICATE_RENAME_SOURCE',
        { filePath: resolvedSourcePath },
      );
    }
    if (targetKeys.has(targetKey)) {
      throw new GroupShirtRenameError(
        `Nhiều PNG sẽ cùng đổi thành “${path.basename(targetPath)}”.`,
        'DUPLICATE_RENAME_TARGET',
        { filePath: targetPath },
      );
    }
    sourceKeys.add(sourceKey);
    targetKeys.add(targetKey);
    return {
      index,
      sourcePath: resolvedSourcePath,
      targetPath,
      unchanged: resolvedSourcePath === targetPath,
    };
  });
  return Object.freeze(plan.map((item) => Object.freeze({ ...item })));
}

async function directoryNameMap(directoryPath, fsImpl) {
  const entries = await fsImpl.readdir(directoryPath, { withFileTypes: true });
  const names = new Map();
  for (const entry of entries) {
    if (entry.isFile()) names.set(entry.name.toLocaleLowerCase('en-US'), entry.name);
  }
  return names;
}

async function rollbackRenames(items, committedItems, fsImpl) {
  const errors = [];
  for (const item of [...committedItems].reverse()) {
    try {
      await fsImpl.rename(item.targetPath, item.tempPath);
    } catch (error) {
      errors.push(error);
    }
  }
  for (const item of [...items].reverse()) {
    try {
      await fsImpl.rename(item.tempPath, item.sourcePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') errors.push(error);
    }
  }
  return errors;
}

async function applyGroupShirtRenamePlan(operations, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const idFactory = options.idFactory || randomUUID;
  if (typeof idFactory !== 'function') throw new TypeError('idFactory phải là một hàm.');
  const plan = buildGroupShirtRenamePlan(operations);
  const movable = plan.filter((item) => !item.unchanged);
  const sourceKeys = new Set(plan.map((item) => portablePathKey(item.sourcePath)));

  for (const item of plan) {
    let stat;
    try {
      stat = await fsImpl.stat(item.sourcePath);
    } catch (error) {
      throw new GroupShirtRenameError(
        `Không thể truy cập PNG “${path.basename(item.sourcePath)}”.`,
        'RENAME_SOURCE_UNAVAILABLE',
        { filePath: item.sourcePath, cause: error },
      );
    }
    if (!stat.isFile()) {
      throw new GroupShirtRenameError(
        `“${path.basename(item.sourcePath)}” không phải là file.`,
        'RENAME_SOURCE_NOT_FILE',
        { filePath: item.sourcePath },
      );
    }
  }

  const directories = [...new Set(plan.map((item) => path.dirname(item.sourcePath)))];
  const nameMaps = new Map();
  for (const directoryPath of directories) {
    nameMaps.set(directoryPath, await directoryNameMap(directoryPath, fsImpl));
  }
  for (const item of movable) {
    const existingName = nameMaps
      .get(path.dirname(item.targetPath))
      ?.get(path.basename(item.targetPath).toLocaleLowerCase('en-US'));
    if (existingName) {
      const existingPath = path.join(path.dirname(item.targetPath), existingName);
      if (!sourceKeys.has(portablePathKey(existingPath))) {
        throw new GroupShirtRenameError(
          `Đã tồn tại file “${existingName}”; không thể đổi tên mà không ghi đè.`,
          'RENAME_TARGET_EXISTS',
          { filePath: existingPath },
        );
      }
    }
  }

  const jobId = String(idFactory()).replace(/[^a-z0-9-]/giu, '') || randomUUID();
  const moves = movable.map((item, index) => ({
    ...item,
    tempPath: path.join(
      path.dirname(item.sourcePath),
      `.${path.basename(item.sourcePath)}.group-shirt-rename-${jobId}-${index + 1}.tmp`,
    ),
  }));
  const movedToTemp = [];
  const committed = [];
  try {
    for (const item of moves) {
      try {
        await fsImpl.access(item.tempPath);
        throw new GroupShirtRenameError(
          'Không thể tạo tên tạm an toàn để đổi tên PNG.',
          'RENAME_TEMP_COLLISION',
          { filePath: item.tempPath },
        );
      } catch (error) {
        if (error instanceof GroupShirtRenameError) throw error;
        if (error?.code !== 'ENOENT') throw error;
      }
      await fsImpl.rename(item.sourcePath, item.tempPath);
      movedToTemp.push(item);
    }
    for (const item of moves) {
      await fsImpl.rename(item.tempPath, item.targetPath);
      committed.push(item);
    }
  } catch (error) {
    const rollbackErrors = await rollbackRenames(movedToTemp, committed, fsImpl);
    throw new GroupShirtRenameError(
      rollbackErrors.length > 0
        ? 'Đổi tên PNG thất bại và không thể khôi phục đầy đủ tên cũ.'
        : 'Đổi tên PNG thất bại; tên cũ đã được khôi phục.',
      rollbackErrors.length > 0 ? 'RENAME_AND_ROLLBACK_FAILED' : 'RENAME_FAILED_ROLLED_BACK',
      { cause: error, rollbackErrors },
    );
  }

  return {
    renamed: moves.map((item) => ({
      from: item.sourcePath,
      to: item.targetPath,
      file: parseGroupShirtSourceName(item.targetPath),
    })),
    unchanged: plan.filter((item) => item.unchanged).map((item) => ({
      path: item.sourcePath,
      file: parseGroupShirtSourceName(item.sourcePath),
    })),
  };
}

module.exports = {
  GROUP_SHIRT_COLORS,
  GROUP_SHIRT_SIDES,
  GROUP_SHIRT_TEMPLATE_EXTENSIONS,
  GroupShirtFilenameError,
  GroupShirtRenameError,
  normalizeGroupKey,
  parseGroupShirtSourceName,
  parseGroupShirtTemplateName,
  buildGroupShirtRenamedPath,
  buildGroupShirtRenamePlan,
  applyGroupShirtRenamePlan,
};
