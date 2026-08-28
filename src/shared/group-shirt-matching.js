'use strict';

(function exposeGroupShirtMatching(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.groupShirtMatching = api;
})(typeof globalThis === 'object' ? globalThis : this, () => {
  const PROFILES = Object.freeze({
    PLAIN: 'plain',
    SIDE_ONLY: 'side-only',
    COLOR_ONLY: 'color-only',
    COLOR_SIDE: 'color-side',
  });

  function normalizeColor(value) {
    return String(value ?? 'wh').trim().toLocaleLowerCase('en-US') === 'bl' ? 'bl' : 'wh';
  }

  function normalizeSide(value) {
    const side = String(value ?? 'front').trim().toLocaleLowerCase('en-US');
    return side === 'b' || side === 'back' ? 'back' : 'front';
  }

  function normalizeProfile(value) {
    const profile = String(value ?? '').trim();
    if (Object.values(PROFILES).includes(profile)) return profile;
    throw new TypeError(`Profile Group Shirt không hợp lệ: ${String(value)}.`);
  }

  function groupShirtProfile(sources) {
    if (!Array.isArray(sources)) throw new TypeError('Danh sách PNG Group Shirt phải là một mảng.');
    const hasColor = sources.some((source) => Boolean(source?.explicitColor));
    const hasSide = sources.some((source) => Boolean(source?.explicitSide));
    if (hasColor && hasSide) return PROFILES.COLOR_SIDE;
    if (hasColor) return PROFILES.COLOR_ONLY;
    if (hasSide) return PROFILES.SIDE_ONLY;
    return PROFILES.PLAIN;
  }

  function sourcePoolKey(profileValue, source) {
    const profile = normalizeProfile(profileValue);
    if (profile === PROFILES.PLAIN) return 'all';
    const side = normalizeSide(source?.side);
    if (profile === PROFILES.SIDE_ONLY) return `side:${side}`;
    const color = normalizeColor(source?.color);
    if (profile === PROFILES.COLOR_ONLY) return `color:${color}`;
    return `track:${color}.${side}`;
  }

  function regionPoolKey(profileValue, region) {
    const profile = normalizeProfile(profileValue);
    const side = normalizeSide(region?.side);
    const color = normalizeColor(region?.color);
    // Untagged groups share one source pool across both colors, on the front only.
    if (profile === PROFILES.PLAIN) return side === 'front' ? 'all' : null;
    if (profile === PROFILES.SIDE_ONLY) return `side:${side}`;
    if (profile === PROFILES.COLOR_ONLY) {
      return side === 'front' ? `color:${color}` : null;
    }
    return `track:${color}.${side}`;
  }

  function sourcePoolKeys(profile, sources) {
    return [...new Set(sources.map((source) => sourcePoolKey(profile, source)))];
  }

  function poolLabel(key) {
    if (key === 'all') return 'mặt trước của áo sáng hoặc tối';
    if (key === 'side:front') return 'mặt trước';
    if (key === 'side:back') return 'mặt sau';
    if (key === 'color:wh') return 'áo sáng mặt trước';
    if (key === 'color:bl') return 'áo tối mặt trước';
    const match = String(key).match(/^track:(wh|bl)\.(front|back)$/u);
    if (!match) return String(key);
    return `${match[1] === 'bl' ? 'áo tối' : 'áo sáng'} ${match[2] === 'back' ? 'mặt sau' : 'mặt trước'}`;
  }

  function incompatible(reason, sourceKeys, details = {}) {
    return {
      compatible: false,
      reason,
      regions: [],
      coveredPoolKeys: [],
      sourcePoolKeys: sourceKeys,
      ignoredRegionCount: details.regionCount || 0,
      ...details,
    };
  }

  function matchGroupShirtTemplate(profileValue, sources, regions) {
    const profile = normalizeProfile(profileValue);
    if (!Array.isArray(sources) || sources.length === 0) {
      throw new TypeError('Cần ít nhất một PNG để xét ảnh nền Group Shirt.');
    }
    if (!Array.isArray(regions)) throw new TypeError('Danh sách vùng in phải là một mảng.');
    const sourceKeys = sourcePoolKeys(profile, sources);
    const sourceKeySet = new Set(sourceKeys);
    if (regions.length === 0) return incompatible('không có vùng in', sourceKeys);

    const hasBackRegion = regions.some((region) => normalizeSide(region?.side) === 'back');
    if (profile === PROFILES.COLOR_ONLY && hasBackRegion) {
      return incompatible(
        'nhóm chỉ tag màu chỉ dùng nền có vùng mặt trước',
        sourceKeys,
        { regionCount: regions.length },
      );
    }

    const matchedRegions = [];
    const covered = new Set();
    for (const region of regions) {
      const key = regionPoolKey(profile, region);
      if (!key || !sourceKeySet.has(key)) continue;
      matchedRegions.push(region);
      covered.add(key);
    }

    if (profile === PROFILES.SIDE_ONLY) {
      const missingSides = sourceKeys.filter((key) => !covered.has(key));
      if (missingSides.length > 0) {
        return incompatible(
          `thiếu vùng ${missingSides.map(poolLabel).join(' và ')} có PNG tương ứng`,
          sourceKeys,
          { missingPoolKeys: missingSides, regionCount: regions.length },
        );
      }
    }

    if (matchedRegions.length === 0) {
      const reasons = {
        [PROFILES.PLAIN]: 'không có vùng mặt trước',
        [PROFILES.SIDE_ONLY]: 'không có vùng đúng mặt trước hoặc mặt sau',
        [PROFILES.COLOR_ONLY]: 'không có vùng mặt trước đúng màu PNG',
        [PROFILES.COLOR_SIDE]: 'không có vùng đúng màu và mặt của PNG',
      };
      return incompatible(reasons[profile], sourceKeys, { regionCount: regions.length });
    }

    return {
      compatible: true,
      reason: null,
      regions: matchedRegions,
      coveredPoolKeys: [...covered],
      sourcePoolKeys: sourceKeys,
      ignoredRegionCount: regions.length - matchedRegions.length,
    };
  }

  function missingSourcePoolKeys(profile, sources, matches) {
    const required = sourcePoolKeys(profile, sources);
    const covered = new Set();
    for (const match of matches || []) {
      if (!match?.compatible) continue;
      for (const key of match.coveredPoolKeys || []) covered.add(key);
    }
    return required.filter((key) => !covered.has(key));
  }

  return Object.freeze({
    PROFILES,
    normalizeColor,
    normalizeSide,
    groupShirtProfile,
    sourcePoolKey,
    regionPoolKey,
    sourcePoolKeys,
    poolLabel,
    matchGroupShirtTemplate,
    missingSourcePoolKeys,
  });
});
