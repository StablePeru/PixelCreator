import { PixelBuffer } from '../io/png-codec.js';

export type EaseFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export function tweenFrames(from: PixelBuffer, to: PixelBuffer, steps: number): PixelBuffer[] {
  if (steps <= 0) return [];
  if (from.width !== to.width || from.height !== to.height) {
    throw new Error('Frame dimensions must match for tweening');
  }

  const results: PixelBuffer[] = [];

  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const buf = new PixelBuffer(from.width, from.height);

    for (let y = 0; y < from.height; y++) {
      for (let x = 0; x < from.width; x++) {
        const a = from.getPixel(x, y);
        const b = to.getPixel(x, y);

        buf.setPixel(x, y, {
          r: Math.round(a.r * (1 - t) + b.r * t),
          g: Math.round(a.g * (1 - t) + b.g * t),
          b: Math.round(a.b * (1 - t) + b.b * t),
          a: Math.round(a.a * (1 - t) + b.a * t),
        });
      }
    }

    results.push(buf);
  }

  return results;
}

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function applyEasing(
  durations: number[],
  ease: EaseFunction,
  totalDuration?: number,
): number[] {
  if (durations.length === 0) return [];
  if (durations.length === 1) return totalDuration ? [totalDuration] : [...durations];

  const total = totalDuration ?? durations.reduce((s, d) => s + d, 0);
  const n = durations.length;
  const result: number[] = [];

  if (ease === 'linear') {
    const perFrame = Math.round(total / n);
    for (let i = 0; i < n; i++) {
      result.push(perFrame);
    }
    return result;
  }

  // Compute eased time distribution
  let easeFn: (t: number) => number;
  switch (ease) {
    case 'ease-in': easeFn = easeInQuad; break;
    case 'ease-out': easeFn = easeOutQuad; break;
    case 'ease-in-out': easeFn = easeInOutQuad; break;
    default: easeFn = (t) => t;
  }

  // Generate weights from easing curve derivative
  const weights: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const w = easeFn(t1) - easeFn(t0);
    weights.push(Math.max(0.001, w));
  }

  const weightSum = weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < n; i++) {
    result.push(Math.max(1, Math.round(total * weights[i] / weightSum)));
  }

  return result;
}
