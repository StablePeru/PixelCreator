import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import type { DitherMode } from '../types/brush.js';

// --- Bayer Dither Matrices ---

const BAYER_2X2 = [
  [0, 2],
  [3, 1],
];

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function getBayerMatrix(mode: DitherMode): { matrix: number[][]; size: number; max: number } {
  switch (mode) {
    case 'ordered-2x2':
      return { matrix: BAYER_2X2, size: 2, max: 4 };
    case 'ordered-4x4':
      return { matrix: BAYER_4X4, size: 4, max: 16 };
    case 'ordered-8x8':
      return { matrix: BAYER_8X8, size: 8, max: 64 };
    default:
      return { matrix: BAYER_4X4, size: 4, max: 16 };
  }
}

/**
 * Get the Bayer threshold for a given pixel position.
 * Returns a value between 0 and 1.
 */
export function getBayerThreshold(x: number, y: number, mode: DitherMode): number {
  const { matrix, size, max } = getBayerMatrix(mode);
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  return (matrix[my][mx] + 0.5) / max;
}

/**
 * Determine whether a pixel should be drawn based on dither pattern.
 * Used for interactive dither-brush mode: given a ratio (0-1),
 * returns true if the pixel at (x,y) should be filled.
 *
 * ratio = 0.0 → no pixels drawn
 * ratio = 0.5 → ~50% pixels drawn (checkerboard-like)
 * ratio = 1.0 → all pixels drawn
 */
export function shouldDitherPixel(x: number, y: number, ratio: number, mode: DitherMode): boolean {
  if (mode === 'none') return true;
  return getBayerThreshold(x, y, mode) < ratio;
}

/**
 * Generate a dithered gradient between two colors on a buffer.
 * Instead of blending RGB values, uses ordered dithering to alternate
 * between the two palette colors — the classic pixel art technique.
 */
export function drawDitheredGradient(
  buffer: PixelBuffer,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color1: RGBA,
  color2: RGBA,
  mode: DitherMode,
  region?: { x: number; y: number; width: number; height: number },
): void {
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const nx = dx / len;
  const ny = dy / len;

  for (let py = ry; py < ry + rh && py < buffer.height; py++) {
    for (let px = rx; px < rx + rw && px < buffer.width; px++) {
      // Project pixel onto gradient line
      const dot = (px - x1) * nx + (py - y1) * ny;
      const t = Math.max(0, Math.min(1, dot / len));

      // Use dither threshold to pick color1 or color2
      const drawColor = shouldDitherPixel(px, py, t, mode) ? color2 : color1;
      buffer.setPixel(px, py, drawColor);
    }
  }
}

/**
 * Apply ordered dithering to an existing buffer, reducing it to a palette.
 * Each pixel is snapped to the nearest palette color using Bayer threshold
 * to choose between the two closest colors.
 */
export function ditherBufferToPalette(
  buffer: PixelBuffer,
  palette: RGBA[],
  mode: DitherMode,
): PixelBuffer {
  if (mode === 'none' || palette.length === 0) {
    return buffer.clone();
  }

  const result = new PixelBuffer(buffer.width, buffer.height);
  const { matrix, size, max } = getBayerMatrix(mode);

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) {
        result.setPixel(x, y, pixel);
        continue;
      }

      // Find two closest palette colors
      let best1Idx = 0;
      let best1Dist = Infinity;
      let best2Idx = 0;
      let best2Dist = Infinity;

      for (let i = 0; i < palette.length; i++) {
        const dr = pixel.r - palette[i].r;
        const dg = pixel.g - palette[i].g;
        const db = pixel.b - palette[i].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < best1Dist) {
          best2Idx = best1Idx;
          best2Dist = best1Dist;
          best1Idx = i;
          best1Dist = dist;
        } else if (dist < best2Dist) {
          best2Idx = i;
          best2Dist = dist;
        }
      }

      if (best1Dist === 0 || best2Dist === Infinity) {
        result.setPixel(x, y, { ...palette[best1Idx], a: pixel.a });
        continue;
      }

      // Use total distance to compute ratio
      const totalDist = best1Dist + best2Dist;
      const ratio = best1Dist / totalDist;

      const mx = ((x % size) + size) % size;
      const my = ((y % size) + size) % size;
      const threshold = (matrix[my][mx] + 0.5) / max;

      const chosen = threshold < ratio ? palette[best2Idx] : palette[best1Idx];
      result.setPixel(x, y, { ...chosen, a: pixel.a });
    }
  }

  return result;
}
