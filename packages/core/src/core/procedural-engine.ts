import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA, Rect } from '../types/common.js';
import { hexToRGBA } from '../types/common.js';
import type {
  NoiseType, SimplexNoiseOptions, FbmNoiseOptions, TurbulenceNoiseOptions,
  NoiseToPixelOptions, CheckerboardOptions, StripesOptions, GridDotsOptions, BrickOptions,
} from '../types/procedural.js';

// --- Simplex Noise 2D ---

export interface SimplexNoiseGenerator {
  noise2D(x: number, y: number): number;
}

const GRAD2: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export function createSimplexNoise(seed: number): SimplexNoiseGenerator {
  const perm = new Uint8Array(512);
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) table[i] = i;

  // Seeded shuffle (mulberry32)
  let s = (seed * 2654435761) >>> 0;
  if (s === 0) s = 1;
  for (let i = 255; i > 0; i--) {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rng = ((t ^ (t >>> 14)) >>> 0);
    const j = rng % (i + 1);
    const tmp = table[i]; table[i] = table[j]; table[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = table[i & 255];

  function dot2(gi: number, x: number, y: number): number {
    const g = GRAD2[gi % 12];
    return g[0] * x + g[1] * y;
  }

  return {
    noise2D(x: number, y: number): number {
      const s0 = (x + y) * F2;
      const i = Math.floor(x + s0);
      const j = Math.floor(y + s0);
      const t0 = (i + j) * G2;
      const x0 = x - (i - t0);
      const y0 = y - (j - t0);

      let i1: number, j1: number;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;

      const ii = i & 255;
      const jj = j & 255;

      let n0 = 0, n1 = 0, n2 = 0;

      let t = 0.5 - x0 * x0 - y0 * y0;
      if (t >= 0) { t *= t; n0 = t * t * dot2(perm[ii + perm[jj]], x0, y0); }

      t = 0.5 - x1 * x1 - y1 * y1;
      if (t >= 0) { t *= t; n1 = t * t * dot2(perm[ii + i1 + perm[jj + j1]], x1, y1); }

      t = 0.5 - x2 * x2 - y2 * y2;
      if (t >= 0) { t *= t; n2 = t * t * dot2(perm[ii + 1 + perm[jj + 1]], x2, y2); }

      return 70 * (n0 + n1 + n2); // [-1, 1]
    },
  };
}

// --- Noise Map Generation ---

export function generateNoiseMap(
  width: number,
  height: number,
  type: NoiseType,
  options: SimplexNoiseOptions | FbmNoiseOptions | TurbulenceNoiseOptions,
): Float64Array {
  const noise = createSimplexNoise(options.seed);
  const map = new Float64Array(width * height);
  const scale = options.scale || 0.1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value: number;
      const nx = x * scale;
      const ny = y * scale;

      if (type === 'simplex') {
        value = (noise.noise2D(nx, ny) + 1) / 2;
      } else {
        const opts = options as FbmNoiseOptions;
        const octaves = opts.octaves || 4;
        const lacunarity = opts.lacunarity || 2;
        const persistence = opts.persistence || 0.5;

        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxVal = 0;

        for (let o = 0; o < octaves; o++) {
          const n = noise.noise2D(nx * frequency, ny * frequency);
          total += (type === 'turbulence' ? Math.abs(n) : n) * amplitude;
          maxVal += amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        value = type === 'turbulence'
          ? total / maxVal
          : (total / maxVal + 1) / 2;
      }

      map[y * width + x] = Math.max(0, Math.min(1, value));
    }
  }

  return map;
}

// --- Noise to Pixels ---

export function mapNoiseToPixels(
  buffer: PixelBuffer,
  noiseMap: Float64Array,
  mapping: NoiseToPixelOptions,
  region?: Rect,
): void {
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;

  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const px = rx + dx;
      const py = ry + dy;
      if (px >= buffer.width || py >= buffer.height) continue;

      const value = noiseMap[dy * rw + dx] ?? 0;
      const color = mapValueToColor(value, mapping);
      buffer.setPixel(px, py, color);
    }
  }
}

function mapValueToColor(value: number, mapping: NoiseToPixelOptions): RGBA {
  if (mapping.mode === 'threshold') {
    const threshold = mapping.threshold ?? 0.5;
    const hex = value >= threshold
      ? (mapping.colorAbove ?? '#ffffff')
      : (mapping.colorBelow ?? '#000000');
    return hexToRGBA(hex);
  }

  if (mapping.mode === 'palette' && mapping.paletteColors && mapping.paletteColors.length > 0) {
    const colors = mapping.paletteColors;
    const idx = Math.min(Math.floor(value * colors.length), colors.length - 1);
    return hexToRGBA(colors[idx]);
  }

  // grayscale
  const v = Math.round(value * 255);
  return { r: v, g: v, b: v, a: 255 };
}

// --- High-level Noise Generators ---

export function generateSimplexNoise(
  buffer: PixelBuffer,
  options: SimplexNoiseOptions,
  mapping: NoiseToPixelOptions,
  region?: Rect,
): void {
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;
  const map = generateNoiseMap(rw, rh, 'simplex', options);
  mapNoiseToPixels(buffer, map, mapping, region);
}

export function generateFbm(
  buffer: PixelBuffer,
  options: FbmNoiseOptions,
  mapping: NoiseToPixelOptions,
  region?: Rect,
): void {
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;
  const map = generateNoiseMap(rw, rh, 'fbm', options);
  mapNoiseToPixels(buffer, map, mapping, region);
}

export function generateTurbulence(
  buffer: PixelBuffer,
  options: TurbulenceNoiseOptions,
  mapping: NoiseToPixelOptions,
  region?: Rect,
): void {
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;
  const map = generateNoiseMap(rw, rh, 'turbulence', options);
  mapNoiseToPixels(buffer, map, mapping, region);
}

// --- Pattern Generators ---

export function generateCheckerboard(
  buffer: PixelBuffer,
  options: CheckerboardOptions,
  region?: Rect,
): void {
  const c1 = hexToRGBA(options.color1);
  const c2 = hexToRGBA(options.color2);
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;

  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const px = rx + dx;
      const py = ry + dy;
      if (px >= buffer.width || py >= buffer.height) continue;
      const cellX = Math.floor(dx / options.cellSize);
      const cellY = Math.floor(dy / options.cellSize);
      buffer.setPixel(px, py, (cellX + cellY) % 2 === 0 ? c1 : c2);
    }
  }
}

export function generateStripes(
  buffer: PixelBuffer,
  options: StripesOptions,
  region?: Rect,
): void {
  const colors = options.colors.map(c => hexToRGBA(c));
  const widths = options.widths;
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;

  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const px = rx + dx;
      const py = ry + dy;
      if (px >= buffer.width || py >= buffer.height) continue;

      let coord: number;
      switch (options.direction) {
        case 'horizontal': coord = dy; break;
        case 'vertical': coord = dx; break;
        case 'diagonal-down': coord = dx + dy; break;
        case 'diagonal-up': coord = dx - dy + rh; break;
        default: coord = dy;
      }

      const pos = ((coord % totalWidth) + totalWidth) % totalWidth;
      let accumulated = 0;
      let colorIdx = 0;
      for (let i = 0; i < widths.length; i++) {
        accumulated += widths[i];
        if (pos < accumulated) { colorIdx = i; break; }
      }

      buffer.setPixel(px, py, colors[colorIdx % colors.length]);
    }
  }
}

export function generateGridDots(
  buffer: PixelBuffer,
  options: GridDotsOptions,
  region?: Rect,
): void {
  const dotColor = hexToRGBA(options.color);
  const bgColor = options.background ? hexToRGBA(options.background) : null;
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;

  // Fill background if specified
  if (bgColor) {
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        buffer.setPixel(rx + dx, ry + dy, bgColor);
      }
    }
  }

  // Draw dots
  const r = options.dotSize;
  const r2 = r * r;
  for (let cy = 0; cy < rh; cy += options.spacingY) {
    for (let cx = 0; cx < rw; cx += options.spacingX) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const px = rx + cx + dx;
          const py = ry + cy + dy;
          if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
            buffer.setPixel(px, py, dotColor);
          }
        }
      }
    }
  }
}

export function generateBrick(
  buffer: PixelBuffer,
  options: BrickOptions,
  region?: Rect,
): void {
  const brick = hexToRGBA(options.brickColor);
  const mortar = hexToRGBA(options.mortarColor);
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.width ?? buffer.width;
  const rh = region?.height ?? buffer.height;
  const rowH = options.brickHeight + options.mortarSize;
  const colW = options.brickWidth + options.mortarSize;

  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const px = rx + dx;
      const py = ry + dy;
      if (px >= buffer.width || py >= buffer.height) continue;

      const row = Math.floor(dy / rowH);
      const rowOffset = Math.round(row % 2 === 1 ? options.brickWidth * options.offset : 0);
      const localY = dy % rowH;
      const localX = ((dx + rowOffset) % colW + colW) % colW;

      const isMortarY = localY >= options.brickHeight;
      const isMortarX = localX >= options.brickWidth;

      buffer.setPixel(px, py, isMortarX || isMortarY ? mortar : brick);
    }
  }
}
