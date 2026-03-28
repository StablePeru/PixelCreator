import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { rgbaEqual, colorDistance } from '../types/common.js';
import type { SelectionMask } from '../types/selection.js';

export function createRectSelection(
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
): SelectionMask {
  const data = new Uint8Array(canvasWidth * canvasHeight);

  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(canvasWidth, x + width);
  const y1 = Math.min(canvasHeight, y + height);

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      data[py * canvasWidth + px] = 255;
    }
  }

  return { width: canvasWidth, height: canvasHeight, data };
}

export function createEllipseSelection(
  canvasWidth: number,
  canvasHeight: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): SelectionMask {
  const data = new Uint8Array(canvasWidth * canvasHeight);

  if (rx === 0 && ry === 0) {
    if (cx >= 0 && cx < canvasWidth && cy >= 0 && cy < canvasHeight) {
      data[cy * canvasWidth + cx] = 255;
    }
    return { width: canvasWidth, height: canvasHeight, data };
  }

  if (rx === 0) {
    for (let py = cy - ry; py <= cy + ry; py++) {
      if (py >= 0 && py < canvasHeight && cx >= 0 && cx < canvasWidth) {
        data[py * canvasWidth + cx] = 255;
      }
    }
    return { width: canvasWidth, height: canvasHeight, data };
  }

  if (ry === 0) {
    for (let px = cx - rx; px <= cx + rx; px++) {
      if (px >= 0 && px < canvasWidth && cy >= 0 && cy < canvasHeight) {
        data[cy * canvasWidth + px] = 255;
      }
    }
    return { width: canvasWidth, height: canvasHeight, data };
  }

  // Filled ellipse using midpoint algorithm
  const rx2 = rx * rx;
  const ry2 = ry * ry;

  const fillSpan = (sy: number, x0: number, x1: number) => {
    if (sy < 0 || sy >= canvasHeight) return;
    const sx0 = Math.max(0, x0);
    const sx1 = Math.min(canvasWidth - 1, x1);
    for (let px = sx0; px <= sx1; px++) {
      data[sy * canvasWidth + px] = 255;
    }
  };

  let x = 0;
  let y = ry;
  let d1 = ry2 - rx2 * ry + 0.25 * rx2;
  let dx = 2 * ry2 * x;
  let dy = 2 * rx2 * y;

  while (dx < dy) {
    fillSpan(cy + y, cx - x, cx + x);
    fillSpan(cy - y, cx - x, cx + x);
    x++;
    dx += 2 * ry2;
    if (d1 < 0) {
      d1 += dx + ry2;
    } else {
      y--;
      dy -= 2 * rx2;
      d1 += dx - dy + ry2;
    }
  }

  let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;

  while (y >= 0) {
    fillSpan(cy + y, cx - x, cx + x);
    fillSpan(cy - y, cx - x, cx + x);
    y--;
    dy -= 2 * rx2;
    if (d2 > 0) {
      d2 += rx2 - dy;
    } else {
      x++;
      dx += 2 * ry2;
      d2 += dx - dy + rx2;
    }
  }

  return { width: canvasWidth, height: canvasHeight, data };
}

export function createColorSelection(
  buffer: PixelBuffer,
  targetColor: RGBA,
  tolerance: number,
  contiguous: boolean,
  startX?: number,
  startY?: number,
): SelectionMask {
  const { width, height } = buffer;
  const data = new Uint8Array(width * height);

  const matches = (pixel: RGBA): boolean => {
    return tolerance === 0
      ? rgbaEqual(pixel, targetColor)
      : colorDistance(pixel, targetColor) <= tolerance;
  };

  if (!contiguous) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (matches(buffer.getPixel(x, y))) {
          data[y * width + x] = 255;
        }
      }
    }
    return { width, height, data };
  }

  // BFS flood fill for contiguous selection
  if (startX === undefined || startY === undefined) {
    return { width, height, data };
  }

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return { width, height, data };
  }

  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [[startX, startY]];
  visited[startY * width + startX] = 1;

  if (matches(buffer.getPixel(startX, startY))) {
    data[startY * width + startX] = 255;
  } else {
    return { width, height, data };
  }

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;

    const neighbors: [number, number][] = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = ny * width + nx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      if (matches(buffer.getPixel(nx, ny))) {
        data[idx] = 255;
        queue.push([nx, ny]);
      }
    }
  }

  return { width, height, data };
}

export function createAllSelection(width: number, height: number): SelectionMask {
  const data = new Uint8Array(width * height);
  data.fill(255);
  return { width, height, data };
}

export function invertSelection(mask: SelectionMask): SelectionMask {
  const data = new Uint8Array(mask.width * mask.height);
  for (let i = 0; i < data.length; i++) {
    data[i] = mask.data[i] === 0 ? 255 : 0;
  }
  return { width: mask.width, height: mask.height, data };
}

export function mergeSelections(a: SelectionMask, b: SelectionMask): SelectionMask {
  const data = new Uint8Array(a.width * a.height);
  for (let i = 0; i < data.length; i++) {
    data[i] = a.data[i] || b.data[i] ? 255 : 0;
  }
  return { width: a.width, height: a.height, data };
}

export function getSelectionBounds(
  mask: SelectionMask,
): { x: number; y: number; width: number; height: number } | null {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[y * mask.width + x] === 255) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) return null;

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function getSelectionPixelCount(mask: SelectionMask): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] === 255) count++;
  }
  return count;
}

export function clearSelection(buffer: PixelBuffer, mask: SelectionMask, clearColor?: RGBA): void {
  const color = clearColor || { r: 0, g: 0, b: 0, a: 0 };
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      if (mask.data[y * mask.width + x] === 255) {
        buffer.setPixel(x, y, color);
      }
    }
  }
}

export function extractSelection(buffer: PixelBuffer, mask: SelectionMask): PixelBuffer {
  const result = new PixelBuffer(buffer.width, buffer.height);
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      if (mask.data[y * mask.width + x] === 255) {
        result.setPixel(x, y, buffer.getPixel(x, y));
      }
    }
  }
  return result;
}

export function pasteBuffer(
  dest: PixelBuffer,
  source: PixelBuffer,
  offsetX: number,
  offsetY: number,
): void {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const dx = x + offsetX;
      const dy = y + offsetY;
      if (dx < 0 || dx >= dest.width || dy < 0 || dy >= dest.height) continue;
      const pixel = source.getPixel(x, y);
      if (pixel.a === 0) continue;
      dest.setPixel(dx, dy, pixel);
    }
  }
}

export function moveSelection(
  buffer: PixelBuffer,
  mask: SelectionMask,
  dx: number,
  dy: number,
): PixelBuffer {
  const result = buffer.clone();
  const transparent: RGBA = { r: 0, g: 0, b: 0, a: 0 };

  // Clear original positions
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[y * mask.width + x] === 255) {
        result.setPixel(x, y, transparent);
      }
    }
  }

  // Paste at new positions
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[y * mask.width + x] === 255) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < buffer.width && ny >= 0 && ny < buffer.height) {
          result.setPixel(nx, ny, buffer.getPixel(x, y));
        }
      }
    }
  }

  return result;
}

export function selectionToPixelBuffer(mask: SelectionMask): PixelBuffer {
  const buffer = new PixelBuffer(mask.width, mask.height);
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const val = mask.data[y * mask.width + x];
      buffer.setPixel(x, y, { r: val, g: val, b: val, a: 255 });
    }
  }
  return buffer;
}

export function pixelBufferToSelection(buffer: PixelBuffer): SelectionMask {
  const data = new Uint8Array(buffer.width * buffer.height);
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      data[y * buffer.width + x] = pixel.r > 127 ? 255 : 0;
    }
  }
  return { width: buffer.width, height: buffer.height, data };
}

/**
 * Rasterize a polygon to a bitmask using scanline fill (even-odd rule).
 * For each row y, find all edge intersections, sort by x, fill between pairs.
 */
function rasterizePolygonToMask(
  canvasWidth: number,
  canvasHeight: number,
  points: ReadonlyArray<{ x: number; y: number }>,
): Uint8Array {
  const data = new Uint8Array(canvasWidth * canvasHeight);
  const n = points.length;

  const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))));
  const maxY = Math.min(canvasHeight - 1, Math.ceil(Math.max(...points.map((p) => p.y))));

  for (let y = minY; y <= maxY; y++) {
    const scanY = y + 0.5;
    const intersections: number[] = [];

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const yi = points[i].y;
      const yj = points[j].y;

      if ((yi <= scanY && yj > scanY) || (yj <= scanY && yi > scanY)) {
        const t = (scanY - yi) / (yj - yi);
        intersections.push(points[i].x + t * (points[j].x - points[i].x));
      }
    }

    intersections.sort((a, b) => a - b);

    for (let k = 0; k < intersections.length - 1; k += 2) {
      const x0 = Math.max(0, Math.ceil(intersections[k]));
      const x1 = Math.min(canvasWidth - 1, Math.floor(intersections[k + 1]));
      for (let x = x0; x <= x1; x++) {
        data[y * canvasWidth + x] = 255;
      }
    }
  }

  return data;
}

/**
 * Create a freehand lasso selection from a list of points.
 * The points form a closed polygon rasterized with even-odd fill.
 */
export function createLassoSelection(
  canvasWidth: number,
  canvasHeight: number,
  points: ReadonlyArray<{ x: number; y: number }>,
): SelectionMask {
  if (points.length < 3) {
    throw new Error('Lasso selection requires at least 3 points');
  }
  const data = rasterizePolygonToMask(canvasWidth, canvasHeight, points);
  return { width: canvasWidth, height: canvasHeight, data };
}

/**
 * Create a polygon selection from a list of vertices.
 * The vertices form a closed polygon rasterized with even-odd fill.
 */
export function createPolygonSelection(
  canvasWidth: number,
  canvasHeight: number,
  vertices: ReadonlyArray<{ x: number; y: number }>,
): SelectionMask {
  if (vertices.length < 3) {
    throw new Error('Polygon selection requires at least 3 vertices');
  }
  const data = rasterizePolygonToMask(canvasWidth, canvasHeight, vertices);
  return { width: canvasWidth, height: canvasHeight, data };
}
