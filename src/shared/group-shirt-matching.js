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

  function normalizeGender(value) {
    const gender = String(value ?? '').trim().toLocaleLowerCase('en-US');
    if (gender === 'm' || gender === 'male') return 'm';
    if (gender === 'w' || gender === 'female') return 'w';
    return null;
  }

  function genderPoolKey(gender, key) {
    return gender ? `gender:${gender}|${key}` : key;
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
    const gender = source?.explicitGender ? normalizeGender(source.gender) : null;
    if (profile === PROFILES.PLAIN) return genderPoolKey(gender, 'all');
    const side = normalizeSide(source?.side);
    if (profile === PROFILES.SIDE_ONLY) return genderPoolKey(gender, `side:${side}`);
    const color = source?.explicitColor ? normalizeColor(source.color) : '*';
    if (profile === PROFILES.COLOR_ONLY) return genderPoolKey(gender, `color:${color}`);
    return genderPoolKey(gender, `track:${color}.${side}`);
  }

  function regionPoolKey(profileValue, region) {
    const profile = normalizeProfile(profileValue);
    const side = normalizeSide(region?.side);
    const color = normalizeColor(region?.color);
    const gender = normalizeGender(region?.gender);
    // Untagged groups share one source pool across both colors, on the front only.
    if (profile === PROFILES.PLAIN) return side === 'front' ? genderPoolKey(gender, 'all') : null;
    if (profile === PROFILES.SIDE_ONLY) return genderPoolKey(gender, `side:${side}`);
    if (profile === PROFILES.COLOR_ONLY) {
      return side === 'front' ? genderPoolKey(gender, `color:${color}`) : null;
    }
    return genderPoolKey(gender, `track:${color}.${side}`);
  }

  function sourcePoolKeys(profile, sources) {
    return [...new Set(sources.map((source) => sourcePoolKey(profile, source)))];
  }

  function regionSourcePoolKeys(profileValue, region) {
    const profile = normalizeProfile(profileValue);
    const exact = regionPoolKey(profile, region);
    if (!exact) return [];
    const gender = normalizeGender(region?.gender);
    const keys = [exact];
    if (profile === PROFILES.COLOR_ONLY) keys.push(genderPoolKey(gender, 'color:*'));
    if (profile === PROFILES.COLOR_SIDE) {
      keys.push(genderPoolKey(gender, `track:*.${normalizeSide(region?.side)}`));
    }

    // A PNG without .m/.w is gender-neutral: it can fill a male or female
    // region while color/side matching continues to apply. Explicit .m/.w
    // sources remain in gender-prefixed pools and therefore cannot cross over.
    if (gender) {
      const genericExact = regionPoolKey(profile, { ...region, gender: null });
      if (genericExact) keys.push(genericExact);
      if (profile === PROFILES.COLOR_ONLY) keys.push('color:*');
      if (profile === PROFILES.COLOR_SIDE) {
        keys.push(`track:*.${normalizeSide(region?.side)}`);
      }
    }
    return [...new Set(keys)];
  }

  function poolLabel(key) {
    const genderMatch = String(key).match(/^gender:(m|w)\|(.*)$/u);
    const genderLabel = genderMatch ? (genderMatch[1] === 'm' ? 'áo nam' : 'áo nữ') : null;
    const baseKey = genderMatch ? genderMatch[2] : String(key);
    let label;
    if (baseKey === 'all') label = 'mặt trước của áo sáng hoặc tối';
    else if (baseKey === 'side:front') label = 'mặt trước';
    else if (baseKey === 'side:back') label = 'mặt sau';
    else if (baseKey === 'color:wh') label = 'áo sáng mặt trước';
    else if (baseKey === 'color:bl') label = 'áo tối mặt trước';
    else if (baseKey === 'color:*') label = 'mặt trước của áo sáng hoặc tối';
    const match = baseKey.match(/^track:(wh|bl|\*)\.(front|back)$/u);
    if (!label && !match) label = baseKey;
    if (!label && match[1] === '*') {
      label = `${match[2] === 'back' ? 'mặt sau' : 'mặt trước'} của áo sáng hoặc tối`;
    }
    if (!label) {
      label = `${match[1] === 'bl' ? 'áo tối' : 'áo sáng'} ${match[2] === 'back' ? 'mặt sau' : 'mặt trước'}`;
    }
    return genderLabel ? `${genderLabel}, ${label}` : label;
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

    const hasGenderNeutralSource = sources.some((source) => (
      !source?.explicitGender || !normalizeGender(source.gender)
    ));
    const requiredGenders = new Set(sources
      .filter((source) => source?.explicitGender)
      .map((source) => normalizeGender(source.gender))
      .filter(Boolean));
    const genderRegions = hasGenderNeutralSource
      ? regions
      : regions.filter((region) => requiredGenders.has(normalizeGender(region?.gender)));
    if (genderRegions.length === 0) {
      return incompatible('không có vùng đúng giới tính PNG', sourceKeys, {
        regionCount: regions.length,
      });
    }

    const hasBackRegion = genderRegions.some((region) => normalizeSide(region?.side) === 'back');
    const hasBackSource = sources.some((source) => normalizeSide(source?.side) === 'back');
    if (hasBackRegion && !hasBackSource) {
      return incompatible(
        'nhóm không có PNG mặt sau nên bỏ qua nền có vùng mặt sau',
        sourceKeys,
        { regionCount: genderRegions.length },
      );
    }

    const matchedRegions = [];
    const covered = new Set();
    for (const region of genderRegions) {
      const keys = regionSourcePoolKeys(profile, region).filter((key) => sourceKeySet.has(key));
      if (keys.length === 0) continue;
      matchedRegions.push(region);
      for (const key of keys) covered.add(key);
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
    normalizeGender,
    groupShirtProfile,
    sourcePoolKey,
    regionPoolKey,
    sourcePoolKeys,
    regionSourcePoolKeys,
    poolLabel,
    matchGroupShirtTemplate,
    missingSourcePoolKeys,
  });
});
