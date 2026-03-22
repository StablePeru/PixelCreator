import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { rgbaToHex } from '../types/common.js';

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sn = s / 100;
  const ln = l / 100;
  const hn = h / 360;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

export function colorHistogram(buffer: PixelBuffer): Map<string, { color: RGBA; count: number }> {
  const map = new Map<string, { color: RGBA; count: number }>();

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) continue;
      const key = rgbaToHex(pixel);
      const entry = map.get(key);
      if (entry) {
        entry.count++;
      } else {
        map.set(key, { color: pixel, count: 1 });
      }
    }
  }

  return map;
}

export function topColors(
  buffer: PixelBuffer,
  n: number,
): Array<{ color: RGBA; count: number; percentage: number }> {
  const hist = colorHistogram(buffer);
  let total = 0;
  for (const entry of hist.values()) total += entry.count;

  const sorted = [...hist.values()].sort((a, b) => b.count - a.count);
  return sorted.slice(0, n).map((entry) => ({
    color: entry.color,
    count: entry.count,
    percentage: total > 0 ? Math.round((entry.count / total) * 10000) / 100 : 0,
  }));
}

export function generatePalette(buffer: PixelBuffer, maxColors: number): RGBA[] {
  const hist = colorHistogram(buffer);
  if (hist.size <= maxColors) {
    return [...hist.values()].map((e) => e.color);
  }

  // Simple popularity-based reduction: take top N most used colors
  const sorted = [...hist.values()].sort((a, b) => b.count - a.count);
  return sorted.slice(0, maxColors).map((e) => e.color);
}

export type HarmonyType = 'complementary' | 'triadic' | 'analogous' | 'split-complementary';

export function colorHarmony(base: RGBA, type: HarmonyType): RGBA[] {
  const hsl = rgbToHsl(base.r, base.g, base.b);

  const makeColor = (h: number): RGBA => {
    const nh = ((h % 360) + 360) % 360;
    const rgb = hslToRgb(nh, hsl.s, hsl.l);
    return { ...rgb, a: 255 };
  };

  switch (type) {
    case 'complementary':
      return [base, makeColor(hsl.h + 180)];
    case 'triadic':
      return [base, makeColor(hsl.h + 120), makeColor(hsl.h + 240)];
    case 'analogous':
      return [makeColor(hsl.h - 30), base, makeColor(hsl.h + 30)];
    case 'split-complementary':
      return [base, makeColor(hsl.h + 150), makeColor(hsl.h + 210)];
    default:
      return [base];
  }
}

export function compareBuffers(
  a: PixelBuffer,
  b: PixelBuffer,
): { identical: boolean; diffCount: number; diffPercentage: number; diffBuffer: PixelBuffer } {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const diffBuffer = new PixelBuffer(width, height);
  let diffCount = 0;
  const totalPixels = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pa = x < a.width && y < a.height ? a.getPixel(x, y) : { r: 0, g: 0, b: 0, a: 0 };
      const pb = x < b.width && y < b.height ? b.getPixel(x, y) : { r: 0, g: 0, b: 0, a: 0 };

      if (pa.r !== pb.r || pa.g !== pb.g || pa.b !== pb.b || pa.a !== pb.a) {
        diffBuffer.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
        diffCount++;
      } else {
        const gray = Math.round((pa.r + pa.g + pa.b) / 3);
        diffBuffer.setPixel(x, y, { r: gray, g: gray, b: gray, a: pa.a > 0 ? 128 : 0 });
      }
    }
  }

  return {
    identical: diffCount === 0,
    diffCount,
    diffPercentage: totalPixels > 0 ? Math.round((diffCount / totalPixels) * 10000) / 100 : 0,
    diffBuffer,
  };
}
