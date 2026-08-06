'use strict';

class LayoutError extends Error {
  constructor(message, code = 'LAYOUT_ERROR') {
    super(message);
    this.name = 'LayoutError';
    this.code = code;
  }
}

function asNonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new LayoutError(`${label} phải là số nguyên không âm.`, 'INVALID_SETTING');
  }
  return parsed;
}

function asPositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new LayoutError(`${label} phải là số nguyên lớn hơn 0.`, 'INVALID_SETTING');
  }
  return parsed;
}

function balanceCounts(total, groupCount) {
  total = asNonNegativeInteger(total, 'Số lượng PNG');
  groupCount = asPositiveInteger(groupCount, 'Số mockup');

  if (total === 0) {
    throw new LayoutError('Cần chọn ít nhất một file PNG.', 'NO_FILES');
  }
  if (groupCount > total) {
    throw new LayoutError(
      `Số mockup (${groupCount}) không được lớn hơn số PNG đã chọn (${total}).`,
      'TOO_MANY_GROUPS',
    );
  }

  const base = Math.floor(total / groupCount);
  const remainder = total % groupCount;
  return Array.from(
    { length: groupCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

function splitBalanced(items, groupCount) {
  const counts = balanceCounts(items.length, groupCount);
  let cursor = 0;
  return counts.map((count) => {
    const group = items.slice(cursor, cursor + count);
    cursor += count;
    return group;
  });
}

function validateLayoutArea(templateWidth, templateHeight, settings) {
  const width = asPositiveInteger(templateWidth, 'Chiều rộng ảnh nền');
  const height = asPositiveInteger(templateHeight, 'Chiều cao ảnh nền');
  const topMargin = asNonNegativeInteger(settings.topMargin, 'Lề trên');
  const bottomMargin = asNonNegativeInteger(settings.bottomMargin, 'Lề dưới');
  const sideMargin = asNonNegativeInteger(settings.sideMargin, 'Lề trái/phải');
  const gap = asNonNegativeInteger(settings.gap, 'Khoảng cách');

  if (topMargin + bottomMargin >= height) {
    throw new LayoutError(
      `Ảnh nền cao ${height}px nhưng tổng lề trên và dưới là ${topMargin + bottomMargin}px. ` +
        'Hãy chọn ảnh nền cao hơn hoặc giảm lề.',
      'VERTICAL_AREA_EMPTY',
    );
  }
  if (sideMargin * 2 >= width) {
    throw new LayoutError(
      `Ảnh nền rộng ${width}px nhưng tổng lề ngang là ${sideMargin * 2}px. Hãy giảm lề trái/phải.`,
      'HORIZONTAL_AREA_EMPTY',
    );
  }

  return {
    x: sideMargin,
    y: topMargin,
    width: width - sideMargin * 2,
    height: height - topMargin - bottomMargin,
    right: width - sideMargin,
    bottom: height - bottomMargin,
    gap,
  };
}

function renderedAreaForCell(asset, cellWidth, cellHeight) {
  const scale = Math.min(cellWidth / asset.width, cellHeight / asset.height);
  return Math.max(1e-9, asset.width * scale * asset.height * scale);
}

function chooseGrid(assets, areaWidth, areaHeight, gap) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new LayoutError('Không có PNG để tính lưới.', 'NO_FILES');
  }

  const n = assets.length;
  const candidates = [];
  const ratios = assets.map((asset) => asset.width / asset.height).sort((a, b) => a - b);
  const medianRatio = ratios[Math.floor(ratios.length / 2)];

  for (let rows = 1; rows <= n; rows += 1) {
    const cols = Math.ceil(n / rows);
    const cellWidth = (areaWidth - (cols - 1) * gap) / cols;
    const cellHeight = (areaHeight - (rows - 1) * gap) / rows;
    if (cellWidth < 1 || cellHeight < 1) continue;

    const logAreas = assets.map((asset) =>
      Math.log(renderedAreaForCell(asset, cellWidth, cellHeight)),
    );
    const geometricArea = Math.exp(logAreas.reduce((sum, value) => sum + value, 0) / n);
    const occupancy = n / (rows * cols);
    const score = geometricArea * occupancy;
    const emptyCells = rows * cols - n;
    const shapeDistance = Math.abs(Math.log(cellWidth / cellHeight) - Math.log(medianRatio));

    candidates.push({
      rows,
      cols,
      cellWidth,
      cellHeight,
      score,
      emptyCells,
      shapeDistance,
    });
  }

  if (candidates.length === 0) {
    throw new LayoutError(
      'Khoảng cách đang quá lớn nên không còn đủ diện tích cho PNG. Hãy giảm khoảng cách hoặc lề.',
      'NO_VALID_GRID',
    );
  }

  candidates.sort((a, b) => {
    const scoreDelta = b.score - a.score;
    if (Math.abs(scoreDelta) > 1e-7) return scoreDelta;
    if (a.emptyCells !== b.emptyCells) return a.emptyCells - b.emptyCells;
    const shapeDelta = a.shapeDistance - b.shapeDistance;
    if (Math.abs(shapeDelta) > 1e-7) return shapeDelta;
    return a.rows - b.rows;
  });

  return candidates[0];
}

function buildPlacements(assets, templateWidth, templateHeight, settings) {
  const area = validateLayoutArea(templateWidth, templateHeight, settings);
  const grid = chooseGrid(assets, area.width, area.height, area.gap);
  const rowCounts = balanceCounts(assets.length, grid.rows);
  const placements = [];
  let assetIndex = 0;

  for (let row = 0; row < grid.rows; row += 1) {
    const count = rowCounts[row];
    const rowWidth = count * grid.cellWidth + (count - 1) * area.gap;
    const rowStartX = area.x + (area.width - rowWidth) / 2;
    const cellY = area.y + row * (grid.cellHeight + area.gap);

    for (let col = 0; col < count; col += 1) {
      const asset = assets[assetIndex];
      const widthScale = grid.cellWidth / asset.width;
      const heightScale = grid.cellHeight / asset.height;
      const scale = Math.min(widthScale, heightScale);
      let width;
      let height;
      if (widthScale <= heightScale) {
        width = Math.max(1, Math.floor(grid.cellWidth));
        height = Math.max(1, Math.min(Math.floor(grid.cellHeight), Math.round(width / (asset.width / asset.height))));
      } else {
        height = Math.max(1, Math.floor(grid.cellHeight));
        width = Math.max(1, Math.min(Math.floor(grid.cellWidth), Math.round(height * (asset.width / asset.height))));
      }
      const cellX = rowStartX + col * (grid.cellWidth + area.gap);
      const left = Math.round(cellX + (grid.cellWidth - width) / 2);
      const top = Math.round(cellY + (grid.cellHeight - height) / 2);

      placements.push({
        assetIndex,
        sourcePath: asset.path,
        row,
        col,
        left,
        top,
        width,
        height,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        scale,
      });
      assetIndex += 1;
    }
  }

  return {
    area,
    grid: {
      rows: grid.rows,
      cols: grid.cols,
      cellWidth: grid.cellWidth,
      cellHeight: grid.cellHeight,
      rowCounts,
    },
    placements,
  };
}

module.exports = {
  LayoutError,
  balanceCounts,
  splitBalanced,
  validateLayoutArea,
  chooseGrid,
  buildPlacements,
};
