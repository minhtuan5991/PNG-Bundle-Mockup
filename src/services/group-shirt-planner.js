'use strict';

const path = require('node:path');
const {
  normalizeGroupKey,
  parseGroupShirtSourceName,
  parseGroupShirtTemplateName,
} = require('./group-shirt-filenames');
const {
  normalizeGroupShirtSide,
  validateGroupShirtRegions,
} = require('./group-shirt-regions');

class GroupShirtPlanError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GroupShirtPlanError';
    this.code = code;
    Object.assign(this, details);
  }
}

function normalizedColor(value, fallback = 'wh') {
  const color = String(value ?? fallback).trim().toLocaleLowerCase('en-US');
  if (color !== 'wh' && color !== 'bl') {
    throw new GroupShirtPlanError(
      `Màu áo không hợp lệ: ${String(value)}.`,
      'INVALID_GROUP_SHIRT_COLOR',
      { color: value },
    );
  }
  return color;
}

function normalizedSourceSide(value) {
  const side = String(value ?? 'f').trim().toLocaleLowerCase('en-US');
  if (side === 'front' || side === 'f') return 'f';
  if (side === 'back' || side === 'b') return 'b';
  throw new GroupShirtPlanError(
    `Mặt áo không hợp lệ: ${String(value)}.`,
    'INVALID_GROUP_SHIRT_SIDE',
    { side: value },
  );
}

function normalizeSourceDescriptor(source) {
  const candidate = typeof source === 'string' ? { path: source } : source;
  if (!candidate || typeof candidate !== 'object') {
    throw new GroupShirtPlanError(
      'Thông tin PNG Group Shirt không hợp lệ.',
      'INVALID_GROUP_SHIRT_SOURCE_DESCRIPTOR',
    );
  }
  const fileValue = candidate.path || candidate.name;
  const parsed = (
    candidate.groupKey === undefined ||
    (candidate.ordinal === undefined && candidate.sequence === undefined)
  )
    ? parseGroupShirtSourceName(fileValue)
    : null;
  const rawGroup = candidate.group ?? parsed?.group ?? candidate.groupKey;
  const group = String(rawGroup ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ');
  const groupKey = normalizeGroupKey(candidate.groupKey ?? parsed?.groupKey ?? group);
  const ordinal = Number(candidate.ordinal ?? candidate.sequence ?? parsed?.ordinal);
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
    throw new GroupShirtPlanError(
      'Số thứ tự PNG Group Shirt phải là số nguyên dương.',
      'INVALID_GROUP_SHIRT_SOURCE_ORDINAL',
      { ordinal },
    );
  }
  const resolvedPath = typeof candidate.path === 'string' && candidate.path
    ? path.resolve(candidate.path)
    : parsed?.path;
  const name = candidate.name || parsed?.name || (resolvedPath ? path.basename(resolvedPath) : '');
  return {
    ...candidate,
    ...(resolvedPath ? { path: resolvedPath } : {}),
    name,
    group: group || groupKey,
    groupKey,
    ordinal,
    sequence: ordinal,
    color: normalizedColor(candidate.color ?? parsed?.color),
    side: normalizedSourceSide(candidate.side ?? parsed?.side),
    explicitColor: candidate.explicitColor ?? parsed?.explicitColor ?? candidate.color !== undefined,
    explicitSide: candidate.explicitSide ?? parsed?.explicitSide ?? candidate.side !== undefined,
  };
}

function normalizeTemplateDescriptor(template) {
  const candidate = typeof template === 'string' ? { path: template } : template;
  if (!candidate || typeof candidate !== 'object') {
    throw new GroupShirtPlanError(
      'Thông tin ảnh nền Group Shirt không hợp lệ.',
      'INVALID_GROUP_SHIRT_TEMPLATE_DESCRIPTOR',
    );
  }
  const fileValue = candidate.path || candidate.name;
  const parsed = candidate.groupKey === undefined
    ? parseGroupShirtTemplateName(fileValue)
    : null;
  const rawGroup = candidate.group ?? parsed?.group ?? candidate.groupKey;
  const group = String(rawGroup ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ');
  const groupKey = normalizeGroupKey(candidate.groupKey ?? parsed?.groupKey ?? group);
  const resolvedPath = typeof candidate.path === 'string' && candidate.path
    ? path.resolve(candidate.path)
    : parsed?.path;
  const name = candidate.name || parsed?.name || (resolvedPath ? path.basename(resolvedPath) : '');
  if (!name) {
    throw new GroupShirtPlanError(
      'Ảnh nền Group Shirt cần có tên hoặc đường dẫn.',
      'INVALID_GROUP_SHIRT_TEMPLATE_DESCRIPTOR',
    );
  }
  return {
    ...candidate,
    ...(resolvedPath ? { path: resolvedPath } : {}),
    name,
    group: group || groupKey,
    groupKey,
    color: normalizedColor(candidate.color ?? parsed?.color),
    explicitColor: candidate.explicitColor ?? parsed?.explicitColor ?? candidate.color !== undefined,
  };
}

function sourceIdentity(source) {
  return source.path
    ? source.path.toLocaleLowerCase('en-US')
    : `${source.name}\0${source.groupKey}\0${source.color}\0${source.side}\0${source.ordinal}`;
}

function templateIdentity(template) {
  return template.path
    ? template.path.toLocaleLowerCase('en-US')
    : template.name.toLocaleLowerCase('en-US');
}

function groupColorKey(groupKey, color) {
  return `${groupKey}\u0000${color}`;
}

function localeCompare(left, right) {
  return String(left).localeCompare(String(right), 'vi', {
    numeric: true,
    sensitivity: 'base',
  });
}

function sortedSources(sources) {
  return [...sources].sort((left, right) => (
    left.ordinal - right.ordinal || localeCompare(left.name, right.name)
  ));
}

function lookupRegions(regionsByTemplate, template) {
  if (!regionsByTemplate) return undefined;
  const keys = [template.path, template.name, template.id].filter(Boolean);
  if (regionsByTemplate instanceof Map) {
    for (const key of keys) {
      if (regionsByTemplate.has(key)) return regionsByTemplate.get(key);
      const lowerKey = String(key).toLocaleLowerCase('en-US');
      if (regionsByTemplate.has(lowerKey)) return regionsByTemplate.get(lowerKey);
    }
    return undefined;
  }
  if (typeof regionsByTemplate === 'object' && !Array.isArray(regionsByTemplate)) {
    for (const key of keys) {
      if (regionsByTemplate[key] !== undefined) return regionsByTemplate[key];
      const lowerKey = String(key).toLocaleLowerCase('en-US');
      if (regionsByTemplate[lowerKey] !== undefined) return regionsByTemplate[lowerKey];
    }
  }
  return undefined;
}

async function resolveRegions(template, options) {
  let regions = template.regions;
  if (!Array.isArray(regions)) regions = lookupRegions(options.regionsByTemplate, template);
  if (!Array.isArray(regions) && typeof options.regionResolver === 'function') {
    regions = await options.regionResolver(template);
  }
  if (!Array.isArray(regions)) {
    throw new GroupShirtPlanError(
      `Chưa thiết lập vùng in cho ảnh nền “${template.name}”.`,
      'MISSING_GROUP_SHIRT_TEMPLATE_REGIONS',
      { template },
    );
  }
  const templateSize = Number.isInteger(Number(template.width)) &&
    Number.isInteger(Number(template.height))
    ? { width: Number(template.width), height: Number(template.height) }
    : null;
  return validateGroupShirtRegions(regions, templateSize);
}

function validateNoDuplicateSources(sources) {
  const identities = new Set();
  const logicalSlots = new Set();
  for (const source of sources) {
    const identity = sourceIdentity(source);
    if (identities.has(identity)) {
      throw new GroupShirtPlanError(
        `PNG “${source.name}” bị lặp trong danh sách.`,
        'DUPLICATE_GROUP_SHIRT_SOURCE',
        { source },
      );
    }
    identities.add(identity);
    const slot = `${groupColorKey(source.groupKey, source.color)}\u0000${source.side}\u0000${source.ordinal}`;
    if (logicalSlots.has(slot)) {
      throw new GroupShirtPlanError(
        `Nhóm “${source.group}” có nhiều PNG trùng màu, mặt và số thứ tự ${source.ordinal}.`,
        'DUPLICATE_GROUP_SHIRT_ORDINAL',
        { source },
      );
    }
    logicalSlots.add(slot);
  }
}

function validateNoDuplicateTemplates(templates) {
  const identities = new Set();
  for (const template of templates) {
    const identity = templateIdentity(template);
    if (identities.has(identity)) {
      throw new GroupShirtPlanError(
        `Ảnh nền “${template.name}” bị chọn lặp.`,
        'DUPLICATE_GROUP_SHIRT_TEMPLATE',
        { template },
      );
    }
    identities.add(identity);
  }
}

function makeAssignments(regions, frontSources, backSources) {
  let frontIndex = 0;
  let backIndex = 0;
  let frontSlot = 0;
  let backSlot = 0;
  const assignments = [];
  for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
    const region = regions[regionIndex];
    const side = normalizeGroupShirtSide(region.side);
    const source = side === 'front'
      ? frontSources[frontIndex++]
      : backSources[backIndex++];
    const sideSlotIndex = side === 'front' ? frontSlot++ : backSlot++;
    if (source) {
      assignments.push({
        region,
        regionIndex,
        side,
        sideSlotIndex,
        source,
      });
    }
  }
  return assignments;
}

async function createGroupShirtPlan(options = {}) {
  if (!Array.isArray(options.sources) || options.sources.length === 0) {
    throw new GroupShirtPlanError(
      'Cần chọn ít nhất một PNG Group Shirt.',
      'NO_GROUP_SHIRT_SOURCES',
    );
  }
  if (!Array.isArray(options.templates) || options.templates.length === 0) {
    throw new GroupShirtPlanError(
      'Cần chọn ít nhất một ảnh nền mkg.',
      'NO_GROUP_SHIRT_TEMPLATES',
    );
  }
  if (options.regionResolver !== undefined && typeof options.regionResolver !== 'function') {
    throw new TypeError('regionResolver phải là một hàm.');
  }

  const sources = options.sources.map(normalizeSourceDescriptor);
  const templates = options.templates.map(normalizeTemplateDescriptor);
  validateNoDuplicateSources(sources);
  validateNoDuplicateTemplates(templates);

  const sourcesByGroupColor = new Map();
  for (const source of sources) {
    const key = groupColorKey(source.groupKey, source.color);
    if (!sourcesByGroupColor.has(key)) {
      sourcesByGroupColor.set(key, {
        key,
        group: source.group,
        groupKey: source.groupKey,
        color: source.color,
        front: [],
        back: [],
      });
    }
    sourcesByGroupColor.get(key)[source.side === 'b' ? 'back' : 'front'].push(source);
  }
  for (const group of sourcesByGroupColor.values()) {
    group.front = sortedSources(group.front);
    group.back = sortedSources(group.back);
  }

  const templatesByGroupColor = new Map();
  for (const template of templates) {
    const key = groupColorKey(template.groupKey, template.color);
    if (!templatesByGroupColor.has(key)) templatesByGroupColor.set(key, []);
    templatesByGroupColor.get(key).push(template);
  }
  for (const variants of templatesByGroupColor.values()) {
    variants.sort((left, right) => localeCompare(left.name, right.name));
  }

  const missingTemplates = [...sourcesByGroupColor.values()].filter(
    (group) => !templatesByGroupColor.has(group.key),
  );
  if (missingTemplates.length > 0) {
    throw new GroupShirtPlanError(
      `Không có ảnh nền phù hợp cho: ${missingTemplates.map((group) =>
        `${group.group}.${group.color}`).join(', ')}.`,
      'MISSING_MATCHING_GROUP_SHIRT_TEMPLATE',
      { missing: missingTemplates.map((group) => ({
        group: group.group,
        groupKey: group.groupKey,
        color: group.color,
      })) },
    );
  }

  const orderedGroups = [...sourcesByGroupColor.values()].sort((left, right) => (
    localeCompare(left.group, right.group) || localeCompare(left.color, right.color)
  ));
  const outputs = [];
  const resolvedTemplateRegions = new Map();
  for (const group of orderedGroups) {
    const variants = templatesByGroupColor.get(group.key);
    for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
      const template = variants[variantIndex];
      const regions = await resolveRegions(template, options);
      resolvedTemplateRegions.set(templateIdentity(template), regions);
      const frontCapacity = regions.filter((region) => region.side === 'front').length;
      const backCapacity = regions.filter((region) => region.side === 'back').length;
      if (group.front.length > 0 && frontCapacity === 0) {
        throw new GroupShirtPlanError(
          `Ảnh nền “${template.name}” chưa có vùng in mặt trước.`,
          'MISSING_GROUP_SHIRT_FRONT_REGION',
          { template, group: group.group },
        );
      }
      if (group.back.length > 0 && backCapacity === 0) {
        throw new GroupShirtPlanError(
          `Ảnh nền “${template.name}” chưa có vùng in mặt sau.`,
          'MISSING_GROUP_SHIRT_BACK_REGION',
          { template, group: group.group },
        );
      }
      const frontPageCount = group.front.length > 0
        ? Math.ceil(group.front.length / frontCapacity)
        : 0;
      const backPageCount = group.back.length > 0
        ? Math.ceil(group.back.length / backCapacity)
        : 0;
      const batchCount = Math.max(frontPageCount, backPageCount);
      for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        const frontSources = group.front.slice(
          batchIndex * frontCapacity,
          (batchIndex + 1) * frontCapacity,
        );
        const backSources = group.back.slice(
          batchIndex * backCapacity,
          (batchIndex + 1) * backCapacity,
        );
        outputs.push({
          outputIndex: outputs.length,
          group: group.group,
          groupKey: group.groupKey,
          color: group.color,
          template,
          variantIndex,
          variantCount: variants.length,
          batchIndex,
          batchCount,
          frontSources,
          backSources,
          assignments: makeAssignments(regions, frontSources, backSources),
        });
      }
    }
  }

  const usedTemplateIds = new Set(outputs.map((output) => templateIdentity(output.template)));
  return {
    sources,
    templates,
    outputs,
    outputCount: outputs.length,
    groups: orderedGroups.map((group) => ({
      group: group.group,
      groupKey: group.groupKey,
      color: group.color,
      frontCount: group.front.length,
      backCount: group.back.length,
      templateCount: templatesByGroupColor.get(group.key).length,
    })),
    unusedTemplates: templates.filter((template) => !usedTemplateIds.has(templateIdentity(template))),
    resolvedTemplateRegions,
  };
}

function selectLightGroupShirtSources(sources) {
  if (!Array.isArray(sources)) throw new TypeError('sources phải là một mảng.');
  return sources.map(normalizeSourceDescriptor).filter((source) => source.color === 'wh');
}

module.exports = {
  GroupShirtPlanError,
  normalizeGroupShirtSourceDescriptor: normalizeSourceDescriptor,
  normalizeGroupShirtTemplateDescriptor: normalizeTemplateDescriptor,
  selectLightGroupShirtSources,
  createGroupShirtPlan,
};
