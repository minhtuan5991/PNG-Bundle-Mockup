'use strict';

const path = require('node:path');
const {
  normalizeGroupKey,
  parseGroupShirtSourceName,
  parseGroupShirtTemplateName,
} = require('./group-shirt-filenames');
const {
  validateGroupShirtRegions,
} = require('./group-shirt-regions');
const {
  groupShirtProfile,
  normalizeGender,
  sourcePoolKey,
  regionPoolKey,
  regionSourcePoolKeys,
  poolLabel,
  matchGroupShirtTemplate,
  missingSourcePoolKeys,
} = require('../shared/group-shirt-matching');

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
    gender: normalizeGender(candidate.gender ?? parsed?.gender),
    explicitGender: candidate.explicitGender ?? parsed?.explicitGender ?? candidate.gender !== undefined,
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
    : `${source.name}\0${source.groupKey}\0${source.gender || ''}\0${source.color}\0${source.side}\0${source.ordinal}`;
}

function templateIdentity(template) {
  return template.path
    ? template.path.toLocaleLowerCase('en-US')
    : template.name.toLocaleLowerCase('en-US');
}

function trackKey(gender, color, side) {
  const normalizedSide = side === 'b' || side === 'back' ? 'back' : 'front';
  return `${normalizeGender(gender) || 'unisex'}\0${normalizedColor(color)}\0${normalizedSide}`;
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
    const slot = `${source.groupKey}\0${source.gender || ''}\0${source.color}\0${source.side}\0${source.ordinal}`;
    if (logicalSlots.has(slot)) {
      throw new GroupShirtPlanError(
        `Nhóm “${source.group}” có nhiều PNG trùng giới tính, màu, mặt và số thứ tự ${source.ordinal}.`,
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
  return groupShirtProfile(sources);
}

function buildSourceGroup(groupSources) {
  const first = groupSources[0];
  const profile = profileFromSources(groupSources);
  const tracks = new Map();
  const pools = new Map();
  for (const source of groupSources) {
    const track = trackKey(source.gender, source.color, source.side);
    if (!tracks.has(track)) tracks.set(track, []);
    tracks.get(track).push(source);

    const pool = sourcePoolKey(profile, source);
    if (!pools.has(pool)) pools.set(pool, []);
    pools.get(pool).push(source);
  }
  for (const [key, items] of tracks) tracks.set(key, sortedSources(items));
  for (const [key, items] of pools) pools.set(key, sortedSources(items));
  return {
    group: first.group,
    groupKey: first.groupKey,
    profile,
    sources: sortedSources(groupSources),
    tracks,
    pools,
  };
}

function countRegionsByPool(profile, regions) {
  const counts = new Map();
  for (const region of regions) {
    for (const key of regionSourcePoolKeys(profile, region)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function templateCompatibility(group, regions) {
  return matchGroupShirtTemplate(group.profile, group.sources, regions);
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

function orderedRegionIndexes(regions) {
  return regions
    .map((region, index) => ({ region, index }))
    .sort((left, right) => {
      const leftGender = left.region.gender === 'm' ? 0 : (left.region.gender === 'w' ? 1 : 2);
      const rightGender = right.region.gender === 'm' ? 0 : (right.region.gender === 'w' ? 1 : 2);
      const leftColor = left.region.color === 'bl' ? 1 : 0;
      const rightColor = right.region.color === 'bl' ? 1 : 0;
      const leftSide = left.region.side === 'back' ? 1 : 0;
      const rightSide = right.region.side === 'back' ? 1 : 0;
      return leftGender - rightGender || leftColor - rightColor || leftSide - rightSide || left.index - right.index;
    })
    .map((item) => item.index);
}

function makeAssignments(regions, group, poolIndexes, random) {
  const keysByRegion = regions.map((region) => regionSourcePoolKeys(group.profile, region));
  const selectedSources = new Map();
  const regionIndexes = orderedRegionIndexes(regions);
  // Reserve color-specific sources first, then consume one shared wildcard queue
  // across both colors. Within each compatible track, PNG ordinal order maps to
  // region 1, 2, 3...; light tracks are consumed before dark tracks. Cursors
  // persist across pages, but reset for each template.
  for (const priority of [0, 1]) {
    for (const index of regionIndexes) {
      if (selectedSources.has(index)) continue;
      const key = keysByRegion[index][priority];
      const sources = group.pools.get(key);
      const sourceIndex = poolIndexes.get(key) || 0;
      if (!sources || sourceIndex >= sources.length) continue;
      selectedSources.set(index, sources[sourceIndex]);
      poolIndexes.set(key, sourceIndex + 1);
    }
  }

  const slotIndexes = new Map();
  return regions.map((region, regionIndex) => {
    const key = regionPoolKey(group.profile, region);
    const repeated = !selectedSources.has(regionIndex);
    let source = selectedSources.get(regionIndex);
    if (repeated) {
      const sources = keysByRegion[regionIndex].flatMap((pool) => group.pools.get(pool) || []);
      if (sources.length === 0) {
        throw new GroupShirtPlanError(
          'Không tìm thấy PNG phù hợp với vùng in Group Shirt.',
          'MISSING_GROUP_SHIRT_ASSIGNMENT_POOL',
          { group, region },
        );
      }
      source = sources[randomIndex(sources.length, random)];
    }
    const slotIndex = slotIndexes.get(key) || 0;
    slotIndexes.set(key, slotIndex + 1);
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
  const capacities = countRegionsByPool(group.profile, regions);
  const sourceCountsBySide = new Map();
  const regionCountsBySide = new Map();
  for (const region of regions) {
    regionCountsBySide.set(region.side, (regionCountsBySide.get(region.side) || 0) + 1);
  }
  let count = 1;
  for (const [key, capacity] of capacities) {
    const sources = group.pools.get(key);
    if (!sources?.length) continue;
    count = Math.max(count, Math.ceil(sources.length / capacity));
    const side = sources[0].side === 'b' ? 'back' : 'front';
    sourceCountsBySide.set(side, (sourceCountsBySide.get(side) || 0) + sources.length);
  }
  // Exact and wildcard pools compete for the same slots. Count each source once
  // per side, excluding pools that this template cannot display.
  for (const [side, sourceCount] of sourceCountsBySide) {
    count = Math.max(count, Math.ceil(sourceCount / regionCountsBySide.get(side)));
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
      const allRegions = resolvedTemplateRegions.get(templateIdentity(template));
      const compatibility = templateCompatibility(group, allRegions);
      if (compatibility.compatible) {
        eligible.push({
          template,
          regions: compatibility.regions,
          compatibility,
        });
      } else {
        incompatible.push({ template, reason: compatibility.reason, compatibility });
      }
    }

    const missingPools = missingSourcePoolKeys(
      group.profile,
      group.sources,
      eligible.map((item) => item.compatibility),
    );
    if (eligible.length === 0 || missingPools.length > 0) {
      const missingDescription = missingPools.length > 0
        ? ` Thiếu ảnh nền cho ${missingPools.map(poolLabel).join(', ')}.`
        : '';
      throw new GroupShirtPlanError(
        `Không có ảnh nền mgs có vùng in phù hợp cho nhóm “${group.group}”.${missingDescription}`,
        'NO_COMPATIBLE_GROUP_SHIRT_TEMPLATE',
        { group, incompatible, missingPoolKeys: missingPools },
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
      const poolIndexes = new Map();
      for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        const assignments = makeAssignments(regions, group, poolIndexes, random);
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
    const poolCounts = {};
    for (const [key, items] of group.pools) poolCounts[key] = items.length;
    groupSummaries.push({
      group: group.group,
      groupKey: group.groupKey,
      profile: group.profile,
      sourceCount: group.sources.length,
      trackCounts,
      poolCounts,
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

function selectLightGroupShirtSourceGroups(sources) {
  const lightSources = selectLightGroupShirtSources(sources);
  const buckets = new Map();
  for (const source of lightSources) {
    if (!buckets.has(source.groupKey)) buckets.set(source.groupKey, []);
    buckets.get(source.groupKey).push(source);
  }
  return [...buckets.values()]
    .map((groupSources) => {
      const orderedSources = sortedSources(groupSources);
      return {
        group: orderedSources[0].group,
        displayGroup: orderedSources[0].group,
        groupKey: orderedSources[0].groupKey,
        sources: orderedSources,
        sourcePaths: orderedSources.map((source) => source.path),
      };
    })
    .sort((left, right) => localeCompare(left.group, right.group));
}

module.exports = {
  GroupShirtPlanError,
  normalizeGroupShirtSourceDescriptor: normalizeSourceDescriptor,
  normalizeGroupShirtTemplateDescriptor: normalizeTemplateDescriptor,
  selectLightGroupShirtSources,
  selectLightGroupShirtSourceGroups,
  createGroupShirtPlan,
};
