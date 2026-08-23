'use strict';

const path = require('node:path');
const {
  normalizeGroupKey,
  parseGroupShirtSourceName,
  parseGroupShirtTemplateName,
} = require('./group-shirt-filenames');
const {
  normalizeGroupShirtColor,
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
  ) ? parseGroupShirtSourceName(fileValue) : null;
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
    marker: candidate.marker || parsed?.marker || 'mgs',
    variant: candidate.variant ?? parsed?.variant ?? null,
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

function trackKey(color, side) {
  const normalizedSide = side === 'b' || side === 'back' ? 'back' : 'front';
  return `${normalizedColor(color)}\0${normalizedSide}`;
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
    const slot = `${source.groupKey}\0${source.color}\0${source.side}\0${source.ordinal}`;
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

function profileFromSources(sources) {
  const hasColor = sources.some((source) => source.explicitColor);
  const hasSide = sources.some((source) => source.explicitSide);
  if (hasColor && hasSide) return 'color-side';
  if (hasColor) return 'color-only';
  if (hasSide) return 'side-only';
  return 'plain';
}

function buildSourceGroup(groupSources) {
  const first = groupSources[0];
  const tracks = new Map();
  for (const source of groupSources) {
    const key = trackKey(source.color, source.side);
    if (!tracks.has(key)) tracks.set(key, []);
    tracks.get(key).push(source);
  }
  for (const [key, items] of tracks) tracks.set(key, sortedSources(items));
  return {
    group: first.group,
    groupKey: first.groupKey,
    profile: profileFromSources(groupSources),
    sources: sortedSources(groupSources),
    tracks,
  };
}

function countRegionsByTrack(regions) {
  const counts = new Map();
  for (const region of regions) {
    const key = trackKey(normalizeGroupShirtColor(region.color), normalizeGroupShirtSide(region.side));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function templateCompatibility(group, regions) {
  if (regions.length === 0) return { compatible: false, reason: 'không có vùng in' };
  const regionTracks = countRegionsByTrack(regions);
  const sourceTrackKeys = new Set(group.tracks.keys());
  const regionTrackKeys = new Set(regionTracks.keys());
  const missingTrack = [...sourceTrackKeys].find((key) => !regionTrackKeys.has(key));
  if (missingTrack) {
    return { compatible: false, reason: 'thiếu vùng đúng màu hoặc mặt của PNG' };
  }
  const extraTrack = [...regionTrackKeys].find((key) => !sourceTrackKeys.has(key));
  if (extraTrack) {
    return { compatible: false, reason: 'có vùng màu hoặc mặt không có PNG tương ứng' };
  }

  const frontCount = regions.filter((region) => region.side === 'front').length;
  const backCount = regions.filter((region) => region.side === 'back').length;
  const darkCount = regions.filter((region) => region.color === 'bl').length;
  if (group.profile === 'plain' && (backCount > 0 || darkCount > 0)) {
    return { compatible: false, reason: 'nhóm không tag chỉ dùng vùng trước áo sáng' };
  }
  if (group.profile === 'side-only' && (darkCount > 0 || frontCount === 0 || backCount === 0)) {
    return { compatible: false, reason: 'nhóm chỉ tag mặt cần vùng trước và sau áo sáng' };
  }
  if (group.profile === 'color-only' && backCount > 0) {
    return { compatible: false, reason: 'nhóm chỉ tag màu không dùng nền có vùng mặt sau' };
  }
  if (group.profile === 'color-side' && (frontCount === 0 || backCount === 0)) {
    return { compatible: false, reason: 'nhóm đủ tag màu/mặt cần nền có cả vùng trước và sau' };
  }
  return { compatible: true, regionTracks };
}

function randomIndex(maxExclusive, random) {
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new GroupShirtPlanError(
      'Bộ sinh số ngẫu nhiên phải trả về giá trị từ 0 đến nhỏ hơn 1.',
      'INVALID_GROUP_SHIRT_RANDOM_VALUE',
    );
  }
  return Math.floor(value * maxExclusive);
}

function makeAssignments(regions, group, batchIndex, random) {
  const capacities = countRegionsByTrack(regions);
  const slotIndexes = new Map();
  return regions.map((region, regionIndex) => {
    const key = trackKey(region.color, region.side);
    const sources = group.tracks.get(key);
    const slotIndex = slotIndexes.get(key) || 0;
    slotIndexes.set(key, slotIndex + 1);
    const sourceIndex = batchIndex * capacities.get(key) + slotIndex;
    const repeated = sourceIndex >= sources.length;
    const source = repeated ? sources[randomIndex(sources.length, random)] : sources[sourceIndex];
    return {
      region,
      regionIndex,
      color: region.color,
      side: region.side,
      trackSlotIndex: slotIndex,
      source,
      repeated,
    };
  });
}

function batchCountFor(group, regions) {
  const capacities = countRegionsByTrack(regions);
  let count = 1;
  for (const [key, sources] of group.tracks) {
    count = Math.max(count, Math.ceil(sources.length / capacities.get(key)));
  }
  return count;
}

async function createGroupShirtPlan(options = {}) {
  if (!Array.isArray(options.sources) || options.sources.length === 0) {
    throw new GroupShirtPlanError('Cần chọn ít nhất một PNG Group Shirt.', 'NO_GROUP_SHIRT_SOURCES');
  }
  if (!Array.isArray(options.templates) || options.templates.length === 0) {
    throw new GroupShirtPlanError('Cần chọn ít nhất một ảnh nền mgs.', 'NO_GROUP_SHIRT_TEMPLATES');
  }
  if (options.regionResolver !== undefined && typeof options.regionResolver !== 'function') {
    throw new TypeError('regionResolver phải là một hàm.');
  }
  const random = options.random || Math.random;
  if (typeof random !== 'function') throw new TypeError('random phải là một hàm.');

  const sources = options.sources.map(normalizeSourceDescriptor);
  const templates = options.templates.map(normalizeTemplateDescriptor);
  validateNoDuplicateSources(sources);
  validateNoDuplicateTemplates(templates);

  const sourceBuckets = new Map();
  for (const source of sources) {
    if (!sourceBuckets.has(source.groupKey)) sourceBuckets.set(source.groupKey, []);
    sourceBuckets.get(source.groupKey).push(source);
  }
  const groups = [...sourceBuckets.values()].map(buildSourceGroup).sort((left, right) =>
    localeCompare(left.group, right.group));

  const outputs = [];
  const warnings = [];
  const resolvedTemplateRegions = new Map();
  const usedTemplateIds = new Set();
  const groupSummaries = [];
  const orderedTemplates = [...templates].sort((left, right) => localeCompare(left.name, right.name));
  for (const template of orderedTemplates) {
    const regions = await resolveRegions(template, options);
    resolvedTemplateRegions.set(templateIdentity(template), regions);
  }
  for (const group of groups) {
    const eligible = [];
    const incompatible = [];
    for (const template of orderedTemplates) {
      const regions = resolvedTemplateRegions.get(templateIdentity(template));
      const compatibility = templateCompatibility(group, regions);
      if (compatibility.compatible) eligible.push({ template, regions });
      else incompatible.push({ template, reason: compatibility.reason });
    }
    if (eligible.length === 0) {
      throw new GroupShirtPlanError(
        `Không có ảnh nền mgs có vùng in phù hợp cho nhóm “${group.group}”.`,
        'NO_COMPATIBLE_GROUP_SHIRT_TEMPLATE',
        { group, incompatible },
      );
    }
    for (const item of incompatible) {
      warnings.push({
        code: 'INCOMPATIBLE_GROUP_SHIRT_TEMPLATE',
        message: `Ảnh nền “${item.template.name}” không dùng cho nhóm “${group.group}”: ${item.reason}.`,
        template: item.template,
      });
    }

    for (let variantIndex = 0; variantIndex < eligible.length; variantIndex += 1) {
      const { template, regions } = eligible[variantIndex];
      usedTemplateIds.add(templateIdentity(template));
      const batchCount = batchCountFor(group, regions);
      for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        const assignments = makeAssignments(regions, group, batchIndex, random);
        outputs.push({
          outputIndex: outputs.length,
          group: group.group,
          displayGroup: group.group,
          groupKey: group.groupKey,
          profile: group.profile,
          template,
          variantIndex,
          variantCount: eligible.length,
          batchIndex,
          pageIndex: batchIndex,
          batchCount,
          assignments,
        });
      }
    }

    const trackCounts = {};
    for (const [key, items] of group.tracks) trackCounts[key.replace('\0', '.')] = items.length;
    groupSummaries.push({
      group: group.group,
      groupKey: group.groupKey,
      profile: group.profile,
      sourceCount: group.sources.length,
      trackCounts,
      templateCount: eligible.length,
    });
  }

  return {
    sources,
    templates,
    outputs,
    outputCount: outputs.length,
    groups: groupSummaries,
    unusedTemplates: templates.filter((template) => !usedTemplateIds.has(templateIdentity(template))),
    resolvedTemplateRegions,
    warnings,
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
