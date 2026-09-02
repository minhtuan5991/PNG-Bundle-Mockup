'use strict';

(function expose(root) {
  // Work in image pixels so rotation and the 42:48 ratio stay correct on any canvas.
  function resizeFromCorner(start, handle, delta, bounds, minimumHeight = 8) {
    const sx = handle.includes('e') ? 1 : -1;
    const sy = handle.includes('s') ? 1 : -1;
    const radians = (start.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const ratio = 42 / 48;
    const rotate = (x, y) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
    const half = rotate(sx * start.width / 2, sy * start.height / 2);
    const anchor = { x: start.centerX - half.x, y: start.centerY - half.y };
    // Use the delta from pointer-down, avoiding a jump when grabbing a handle's edge.
    const localDX = delta.x * cos + delta.y * sin;
    const localDY = -delta.x * sin + delta.y * cos;
    const preferredHeight = (ratio * (start.width + sx * localDX) +
      start.height + sy * localDY) / (ratio * ratio + 1);

    // Each corner travels on a ray from the fixed anchor. Stop at the first image edge.
    let maximumHeight = Infinity;
    for (const vector of [rotate(sx * ratio, 0), rotate(0, sy), rotate(sx * ratio, sy)]) {
      for (const [axis, limit] of [['x', bounds.width], ['y', bounds.height]]) {
        if (vector[axis] > 1e-12) {
          maximumHeight = Math.min(maximumHeight, (limit - anchor[axis]) / vector[axis]);
        } else if (vector[axis] < -1e-12) {
          maximumHeight = Math.min(maximumHeight, -anchor[axis] / vector[axis]);
        }
      }
    }
    maximumHeight = Math.max(0, maximumHeight);
    const height = Math.min(maximumHeight, Math.max(Math.min(minimumHeight, maximumHeight), preferredHeight));
    const width = height * ratio;
    const centerOffset = rotate(sx * width / 2, sy * height / 2);
    return {
      centerX: anchor.x + centerOffset.x,
      centerY: anchor.y + centerOffset.y,
      width,
      height,
    };
  }

  const api = { resizeFromCorner };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.printRegionResize = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
