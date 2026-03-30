import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA, Point } from '../types/common.js';
import type {
  BrushPreset,
  BrushShape,
  SymmetryConfig,
  SymmetryMode,
  DitherMode,
} from '../types/brush.js';
import { snapToPalette } from './color-space-engine.js';
import { shouldDitherPixel } from './dither-engine.js';
import { interpolateStrokePressure, pressureToSize, pressureToOpacity } from './pressure-engine.js';
import { z } from 'zod';

// --- Brush Mask Generation ---

export function createBrushMask(preset: BrushPreset): boolean[][] {
  const { size, shape, pattern } = preset;
  if (shape === 'custom' && pattern) {
    return pattern;
  }
  const mask: boolean[][] = [];
  const half = Math.floor(size / 2);
  for (let y = 0; y < size; y++) {
    mask[y] = [];
    for (let x = 0; x < size; x++) {
      mask[y][x] = evaluateShape(shape, x, y, size, half);
    }
  }
  return mask;
}

function evaluateShape(
  shape: BrushShape,
  x: number,
  y: number,
  size: number,
  half: number,
): boolean {
  const cx = x - half;
  const cy = y - half;
  switch (shape) {
    case 'square':
      return true;
    case 'circle': {
      const r = size / 2;
      return (cx + 0.5) * (cx + 0.5) + (cy + 0.5) * (cy + 0.5) <= r * r;
    }
    case 'diamond':
      return Math.abs(cx) + Math.abs(cy) <= half;
    case 'custom':
      return true;
  }
}

export function generateDiamondMask(size: number): boolean[][] {
  const half = Math.floor(size / 2);
  const mask: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    mask[y] = [];
    for (let x = 0; x < size; x++) {
      mask[y][x] = Math.abs(x - half) + Math.abs(y - half) <= half;
    }
  }
  return mask;
}

// --- Brush Application ---

export interface BrushStampOptions {
  opacity?: number;
  paletteLockColors?: RGBA[];
  ditherMode?: DitherMode;
  ditherRatio?: number;
}

export function applyBrushStamp(
  buffer: PixelBuffer,
  x: number,
  y: number,
  color: RGBA,
  mask: boolean[][],
  opacityOrOptions: number | BrushStampOptions = 255,
  paletteLockColors?: RGBA[],
): void {
  const opts: BrushStampOptions =
    typeof opacityOrOptions === 'number'
      ? { opacity: opacityOrOptions, paletteLockColors }
      : opacityOrOptions;

  const opacity = opts.opacity ?? 255;
  const lockColors = opts.paletteLockColors ?? paletteLockColors;
  const ditherMode = opts.ditherMode ?? 'none';
  const ditherRatio = opts.ditherRatio ?? 1.0;

  const maskH = mask.length;
  const maskW = mask[0]?.length ?? 0;
  const halfW = Math.floor(maskW / 2);
  const halfH = Math.floor(maskH / 2);

  const drawColor = lockColors ? snapToPalette(color, lockColors) : color;

  const stampColor: RGBA = {
    r: drawColor.r,
    g: drawColor.g,
    b: drawColor.b,
    a: Math.round((drawColor.a * opacity) / 255),
  };

  for (let my = 0; my < maskH; my++) {
    for (let mx = 0; mx < maskW; mx++) {
      if (mask[my][mx]) {
        const px = x - halfW + mx;
        const py = y - halfH + my;

        // Skip pixel if dithering says no
        if (ditherMode !== 'none' && !shouldDitherPixel(px, py, ditherRatio, ditherMode)) {
          continue;
        }

        if (opacity < 255) {
          blendPixel(buffer, px, py, stampColor);
        } else {
          buffer.setPixel(px, py, drawColor);
        }
      }
    }
  }
}

function blendPixel(buffer: PixelBuffer, x: number, y: number, color: RGBA): void {
  if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) return;
  const existing = buffer.getPixel(x, y);
  const srcA = color.a / 255;
  const dstA = existing.a / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) {
    buffer.setPixel(x, y, { r: 0, g: 0, b: 0, a: 0 });
    return;
  }
  buffer.setPixel(x, y, {
    r: Math.round((color.r * srcA + existing.r * dstA * (1 - srcA)) / outA),
    g: Math.round((color.g * srcA + existing.g * dstA * (1 - srcA)) / outA),
    b: Math.round((color.b * srcA + existing.b * dstA * (1 - srcA)) / outA),
    a: Math.round(outA * 255),
  });
}

// --- Stroke Interpolation ---

export function interpolateStrokePoints(points: Point[], spacing: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0] }];
  if (spacing <= 0) spacing = 1;

  const result: Point[] = [{ x: Math.round(points[0].x), y: Math.round(points[0].y) }];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen === 0) continue;

    const ux = dx / segLen;
    const uy = dy / segLen;
    let traveled = 0;

    while (traveled < segLen) {
      const step = spacing - accumulated;
      if (traveled + step > segLen) {
        accumulated += segLen - traveled;
        break;
      }
      traveled += step;
      accumulated = 0;
      const px = Math.round(points[i - 1].x + ux * traveled);
      const py = Math.round(points[i - 1].y + uy * traveled);
      const last = result[result.length - 1];
      if (px !== last.x || py !== last.y) {
        result.push({ x: px, y: py });
      }
    }
  }

  return result;
}

// --- Pixel Perfect ---

export function pixelPerfectFilter(points: Point[]): Point[] {
  if (points.length <= 2) return [...points];

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dxPrev = curr.x - prev.x;
    const dyPrev = curr.y - prev.y;
    const dxNext = next.x - curr.x;
    const dyNext = next.y - curr.y;

    // Remove L-shaped corners: when prev→curr is axis-aligned (H or V)
    // and curr→next is the perpendicular axis, the middle point creates a fat corner
    const isLCorner =
      Math.abs(dxPrev) + Math.abs(dyPrev) === 1 &&
      Math.abs(dxNext) + Math.abs(dyNext) === 1 &&
      dxPrev !== dxNext &&
      dyPrev !== dyNext;

    if (!isLCorner) {
      result.push(curr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

// --- Stroke Application ---

export function applyBrushStroke(
  buffer: PixelBuffer,
  points: Point[],
  color: RGBA,
  preset: BrushPreset,
  paletteLockColors?: RGBA[],
): void {
  if (points.length === 0) return;

  let strokePoints = preset.spacing > 1 ? interpolateStrokePoints(points, preset.spacing) : points;

  if (preset.pixelPerfect && preset.size === 1) {
    strokePoints = pixelPerfectFilter(strokePoints);
  }

  const mask = createBrushMask(preset);

  const stampOpts: BrushStampOptions = {
    opacity: preset.opacity,
    paletteLockColors,
    ditherMode: preset.ditherMode ?? 'none',
    ditherRatio: 1.0,
  };

  for (const pt of strokePoints) {
    applyBrushStamp(buffer, pt.x, pt.y, color, mask, stampOpts);
  }
}

// --- Symmetry ---

export function computeSymmetryPoints(
  x: number,
  y: number,
  config: SymmetryConfig,
  canvasWidth: number,
  canvasHeight: number,
): Point[] {
  const { mode } = config;

  if (mode === 'none') return [{ x, y }];

  const axisX = config.axisX ?? Math.floor(canvasWidth / 2);
  const axisY = config.axisY ?? Math.floor(canvasHeight / 2);

  if (mode === 'horizontal') {
    return [
      { x, y },
      { x: 2 * axisX - x - 1, y },
    ];
  }

  if (mode === 'vertical') {
    return [
      { x, y },
      { x, y: 2 * axisY - y - 1 },
    ];
  }

  if (mode === 'both') {
    const mx = 2 * axisX - x - 1;
    const my = 2 * axisY - y - 1;
    return [
      { x, y },
      { x: mx, y },
      { x, y: my },
      { x: mx, y: my },
    ];
  }

  if (mode === 'radial') {
    const segments = config.radialSegments ?? 4;
    const cx = config.radialCenterX ?? Math.floor(canvasWidth / 2);
    const cy = config.radialCenterY ?? Math.floor(canvasHeight / 2);
    const dx = x - cx;
    const dy = y - cy;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const result: Point[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < segments; i++) {
      const theta = angle + (2 * Math.PI * i) / segments;
      const px = Math.round(cx + dist * Math.cos(theta));
      const py = Math.round(cy + dist * Math.sin(theta));
      const key = `${px},${py}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ x: px, y: py });
      }
    }
    return result;
  }

  return [{ x, y }];
}

export function applySymmetricStroke(
  buffer: PixelBuffer,
  points: Point[],
  color: RGBA,
  preset: BrushPreset,
  symmetry: SymmetryConfig,
  paletteLockColors?: RGBA[],
): void {
  if (points.length === 0) return;

  if (symmetry.mode === 'none') {
    applyBrushStroke(buffer, points, color, preset, paletteLockColors);
    return;
  }

  // Compute symmetry offsets from the first point to build mirrored strokes
  const allStrokes: Point[][] = [];
  const firstPoint = points[0];
  const mirroredOrigins = computeSymmetryPoints(
    firstPoint.x,
    firstPoint.y,
    symmetry,
    buffer.width,
    buffer.height,
  );

  for (const origin of mirroredOrigins) {
    const dx = origin.x - firstPoint.x;
    const dy = origin.y - firstPoint.y;

    // For horizontal/vertical/both, we need to flip the offsets
    let flipX = 1;
    let flipY = 1;

    if (symmetry.mode === 'horizontal' && origin.x !== firstPoint.x) {
      flipX = -1;
    } else if (symmetry.mode === 'vertical' && origin.y !== firstPoint.y) {
      flipY = -1;
    } else if (symmetry.mode === 'both') {
      if (origin.x !== firstPoint.x) flipX = -1;
      if (origin.y !== firstPoint.y) flipY = -1;
    }

    if (symmetry.mode === 'radial') {
      // For radial symmetry, rotate all points
      const cx = symmetry.radialCenterX ?? Math.floor(buffer.width / 2);
      const cy = symmetry.radialCenterY ?? Math.floor(buffer.height / 2);
      const segments = symmetry.radialSegments ?? 4;
      const origAngle = Math.atan2(origin.y - cy, origin.x - cx);
      const firstAngle = Math.atan2(firstPoint.y - cy, firstPoint.x - cx);
      const dTheta = origAngle - firstAngle;

      const rotatedPoints = points.map((p) => {
        const px = p.x - cx;
        const py = p.y - cy;
        const cos = Math.cos(dTheta);
        const sin = Math.sin(dTheta);
        return {
          x: Math.round(cx + px * cos - py * sin),
          y: Math.round(cy + px * sin + py * cos),
        };
      });
      allStrokes.push(rotatedPoints);
    } else {
      const mirroredPoints = points.map((p) => ({
        x: origin.x + (p.x - firstPoint.x) * flipX,
        y: origin.y + (p.y - firstPoint.y) * flipY,
      }));
      allStrokes.push(mirroredPoints);
    }
  }

  for (const stroke of allStrokes) {
    applyBrushStroke(buffer, stroke, color, preset, paletteLockColors);
  }
}

// --- Default Presets ---

export function createDefaultPresets(): BrushPreset[] {
  return [
    {
      id: 'brush-001',
      name: 'Pixel',
      size: 1,
      shape: 'square',
      spacing: 1,
      opacity: 255,
      pixelPerfect: true,
    },
    {
      id: 'brush-002',
      name: 'Round 3',
      size: 3,
      shape: 'circle',
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    },
    {
      id: 'brush-003',
      name: 'Round 5',
      size: 5,
      shape: 'circle',
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    },
    {
      id: 'brush-004',
      name: 'Square 2',
      size: 2,
      shape: 'square',
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    },
    {
      id: 'brush-005',
      name: 'Square 4',
      size: 4,
      shape: 'square',
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    },
    {
      id: 'brush-006',
      name: 'Diamond 3',
      size: 3,
      shape: 'diamond',
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    },
    {
      id: 'brush-007',
      name: 'Dither 2x2',
      size: 2,
      shape: 'custom',
      pattern: [
        [true, false],
        [false, true],
      ],
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    },
    {
      id: 'brush-008',
      name: 'Spray 5',
      size: 5,
      shape: 'circle',
      spacing: 0.5,
      opacity: 128,
      pixelPerfect: false,
    },
  ];
}

// --- Validation ---

export const brushPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.number().int().min(1).max(64),
  shape: z.enum(['circle', 'square', 'diamond', 'custom']),
  pattern: z.array(z.array(z.boolean())).optional(),
  spacing: z.number().min(0.1).max(10),
  opacity: z.number().int().min(0).max(255),
  pixelPerfect: z.boolean(),
  ditherMode: z.enum(['none', 'ordered-2x2', 'ordered-4x4', 'ordered-8x8']).optional(),
  paletteLock: z.boolean().optional(),
});

export function validateBrushPreset(preset: unknown): { valid: boolean; errors?: string[] } {
  const result = brushPresetSchema.safeParse(preset);
  if (result.success) return { valid: true };
  return { valid: false, errors: result.error.issues.map((i) => i.message) };
}

// --- Pressure-Sensitive Stroke (M5a stubs) ---

export function applyPressureStroke(
  buffer: PixelBuffer,
  points: Array<{ x: number; y: number }>,
  pressure: number[],
  color: RGBA,
  preset: BrushPreset,
  paletteLockColors?: RGBA[],
): void {
  if (points.length === 0) return;

  const config = preset.pressureSensitivity;

  // If pressure disabled, delegate to regular stroke
  if (!config || !config.enabled) {
    applyBrushStroke(buffer, points, color, preset, paletteLockColors);
    return;
  }

  // Interpolate points with pressure values
  const interpolated = interpolateStrokePressure(points, pressure, preset.spacing);
  const interpPoints = interpolated.points;
  const interpPressure = interpolated.pressure;

  for (let i = 0; i < interpPoints.length; i++) {
    const pt = interpPoints[i];
    const p = interpPressure[i] ?? 1;

    const dynSize = pressureToSize(p, preset.size, config);
    const dynOpacity = pressureToOpacity(p, preset.opacity, config);

    const dynPreset: BrushPreset = { ...preset, size: dynSize };
    const mask = createBrushMask(dynPreset);

    applyBrushStamp(buffer, pt.x, pt.y, color, mask, {
      opacity: dynOpacity,
      paletteLockColors,
      ditherMode: preset.ditherMode ?? 'none',
      ditherRatio: 1.0,
    });
  }
}

export function applySymmetricPressureStroke(
  buffer: PixelBuffer,
  points: Array<{ x: number; y: number }>,
  pressure: number[],
  color: RGBA,
  preset: BrushPreset,
  symmetry: SymmetryConfig,
  paletteLockColors?: RGBA[],
): void {
  if (points.length === 0) return;

  if (symmetry.mode === 'none') {
    applyPressureStroke(buffer, points, pressure, color, preset, paletteLockColors);
    return;
  }

  // Reuse same mirroring logic as applySymmetricStroke, delegate to applyPressureStroke
  const firstPoint = points[0];
  const mirroredOrigins = computeSymmetryPoints(
    firstPoint.x,
    firstPoint.y,
    symmetry,
    buffer.width,
    buffer.height,
  );

  for (const origin of mirroredOrigins) {
    let mirroredPoints: Point[];

    if (symmetry.mode === 'radial') {
      const cx = symmetry.radialCenterX ?? Math.floor(buffer.width / 2);
      const cy = symmetry.radialCenterY ?? Math.floor(buffer.height / 2);
      const origAngle = Math.atan2(origin.y - cy, origin.x - cx);
      const firstAngle = Math.atan2(firstPoint.y - cy, firstPoint.x - cx);
      const dTheta = origAngle - firstAngle;

      mirroredPoints = points.map((p) => {
        const px = p.x - cx;
        const py = p.y - cy;
        const cos = Math.cos(dTheta);
        const sin = Math.sin(dTheta);
        return {
          x: Math.round(cx + px * cos - py * sin),
          y: Math.round(cy + px * sin + py * cos),
        };
      });
    } else {
      let flipX = 1;
      let flipY = 1;
      if (symmetry.mode === 'horizontal' && origin.x !== firstPoint.x) {
        flipX = -1;
      } else if (symmetry.mode === 'vertical' && origin.y !== firstPoint.y) {
        flipY = -1;
      } else if (symmetry.mode === 'both') {
        if (origin.x !== firstPoint.x) flipX = -1;
        if (origin.y !== firstPoint.y) flipY = -1;
      }

      mirroredPoints = points.map((p) => ({
        x: origin.x + (p.x - firstPoint.x) * flipX,
        y: origin.y + (p.y - firstPoint.y) * flipY,
      }));
    }

    applyPressureStroke(buffer, mirroredPoints, pressure, color, preset, paletteLockColors);
  }
}
