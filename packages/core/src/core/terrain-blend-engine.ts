import { PixelBuffer } from '../io/png-codec.js';
import { BLOB_47_CONFIGS } from './autotile-engine.js';

// 8-direction bit flags — must match autotile-engine.
const N = 1;
const NE = 2;
const E = 4;
const SE = 8;
const S = 16;
const SW = 32;
const W = 64;
const NW = 128;

export const BLOB_47_COUNT = BLOB_47_CONFIGS.length;

export type TerrainBlendMode = 'dither' | 'alpha-mask';

export interface BlendOptions {
  tileSize: { width: number; height: number };
  mode: TerrainBlendMode;
  strength: number; // 0..1
}

export interface BuildTransitionOptions {
  mode: TerrainBlendMode;
  strength: number;
  includeInverse: boolean;
}

// 4x4 Bayer matrix, normalized threshold in [0, 1).
// Produces deterministic ordered dither.
const BAYER_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function bayerThreshold(x: number, y: number): number {
  return BAYER_4x4[y & 3][x & 3] / 16;
}

/**
 * Compute the probability that the target (foreground) biome should show
 * at pixel (x, y) for a given blob-47 neighbor bitmask.
 * Returns a value in [0, 1]: 1 = full target, 0 = full source.
 *
 * Each unset neighbor bit (= A neighbor) pulls the pixel toward source
 * on that edge/corner. Contributions are combined with max() so two
 * adjacent A edges don't double-dip.
 */
function targetProbability(bitmask: number, x: number, y: number, w: number, h: number): number {
  // Normalized pixel position [0, 1] (center of pixel)
  const nx = (x + 0.5) / w;
  const ny = (y + 0.5) / h;

  let aWeight = 0;

  // Cardinals: gradient from the relevant edge inward
  if ((bitmask & N) === 0) aWeight = Math.max(aWeight, 1 - ny);
  if ((bitmask & S) === 0) aWeight = Math.max(aWeight, ny);
  if ((bitmask & E) === 0) aWeight = Math.max(aWeight, nx);
  if ((bitmask & W) === 0) aWeight = Math.max(aWeight, 1 - nx);

  // Corners: bilinear toward that corner
  if ((bitmask & NE) === 0) aWeight = Math.max(aWeight, nx * (1 - ny));
  if ((bitmask & NW) === 0) aWeight = Math.max(aWeight, (1 - nx) * (1 - ny));
  if ((bitmask & SE) === 0) aWeight = Math.max(aWeight, nx * ny);
  if ((bitmask & SW) === 0) aWeight = Math.max(aWeight, (1 - nx) * ny);

  // Target probability = 1 - A weight
  return 1 - aWeight;
}

// Smoothstep: softens the linear gradient into a sigmoid-like curve.
// Keeps the extremes fixed (0→0, 1→1) while pulling intermediate values
// toward a gentler S-curve, yielding softer alpha-mask transitions.
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Generate the 47 blob-47 blend masks for a given tile size.
 * Each mask is a PixelBuffer where alpha == 255 means "show target (B)"
 * and alpha == 0 means "show source (A)". Color channels are zeroed.
 *
 * In 'dither' mode the mask is strictly binary (0 or 255) — the gradient
 * is resolved by an ordered Bayer 4x4 pattern, giving clean pixel-art edges.
 *
 * In 'alpha-mask' mode the mask carries the continuous target probability
 * in its alpha channel (0..255), shaped by a smoothstep kernel. This lets
 * `composeBlendedTile` interpolate source/target colors for soft edges.
 */
export function generateBlendMasks(options: BlendOptions): PixelBuffer[] {
  const { tileSize, mode, strength } = options;
  const { width: w, height: h } = tileSize;
  const s = Math.max(0, Math.min(1, strength));

  const masks: PixelBuffer[] = [];
  for (const bitmask of BLOB_47_CONFIGS) {
    const mask = new PixelBuffer(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pTarget = targetProbability(bitmask, x, y, w, h);
        // Scale A weight by strength: strength=0 -> always target.
        const adjusted = 1 - (1 - pTarget) * s;
        let alpha: number;
        if (mode === 'alpha-mask') {
          alpha = Math.round(smoothstep(adjusted) * 255);
        } else {
          const threshold = bayerThreshold(x, y);
          alpha = adjusted > threshold ? 255 : 0;
        }
        mask.setPixel(x, y, { r: 0, g: 0, b: 0, a: alpha });
      }
    }
    masks.push(mask);
  }
  return masks;
}

/**
 * Compose one blended tile: the mask's alpha channel is the target weight
 * (0 = pure source, 255 = pure target, intermediate = linear mix of RGB).
 *
 * Binary dither masks produce pixel-perfect source/target picks; alpha-mask
 * masks produce softly interpolated pixels. The output alpha is the max of
 * source and target alpha so transparent source pixels remain transparent
 * where the target is opaque (and vice versa).
 *
 * Pure — never mutates inputs.
 */
export function composeBlendedTile(
  source: PixelBuffer,
  target: PixelBuffer,
  mask: PixelBuffer,
): PixelBuffer {
  if (
    source.width !== target.width ||
    source.height !== target.height ||
    mask.width !== source.width ||
    mask.height !== source.height
  ) {
    throw new Error(
      `composeBlendedTile size mismatch: source=${source.width}x${source.height}, ` +
        `target=${target.width}x${target.height}, mask=${mask.width}x${mask.height}`,
    );
  }

  const out = new PixelBuffer(source.width, source.height);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const t = mask.getPixel(x, y).a / 255;
      if (t === 0) {
        out.setPixel(x, y, source.getPixel(x, y));
        continue;
      }
      if (t === 1) {
        out.setPixel(x, y, target.getPixel(x, y));
        continue;
      }
      const src = source.getPixel(x, y);
      const tgt = target.getPixel(x, y);
      out.setPixel(x, y, {
        r: Math.round(src.r * (1 - t) + tgt.r * t),
        g: Math.round(src.g * (1 - t) + tgt.g * t),
        b: Math.round(src.b * (1 - t) + tgt.b * t),
        a: Math.max(src.a, tgt.a),
      });
    }
  }
  return out;
}

/**
 * Build the 47 transition tiles between `source` (bioma A) and `target` (bioma B).
 * When `includeInverse` is set, also appends the 47 inverse tiles (B over A).
 */
export function buildTransitionTileset(
  source: PixelBuffer,
  target: PixelBuffer,
  options: BuildTransitionOptions,
): PixelBuffer[] {
  if (source.width !== target.width || source.height !== target.height) {
    throw new Error(
      `buildTransitionTileset size mismatch: source=${source.width}x${source.height}, ` +
        `target=${target.width}x${target.height}`,
    );
  }

  const masks = generateBlendMasks({
    tileSize: { width: source.width, height: source.height },
    mode: options.mode,
    strength: options.strength,
  });

  const forward = masks.map((m) => composeBlendedTile(source, target, m));
  if (!options.includeInverse) return forward;

  const inverse = masks.map((m) => composeBlendedTile(target, source, m));
  return [...forward, ...inverse];
}
