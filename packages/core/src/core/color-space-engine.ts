import type { RGBA } from '../types/common.js';
import { hexToRGBA, rgbaToHex } from '../types/common.js';
import type { HueShiftRampConfig } from '../types/palette.js';

// --- OKLab / OKLCH conversions ---
// Based on Björn Ottosson's OKLab: https://bottosson.github.io/posts/oklab/

export interface OKLab {
  L: number;
  a: number;
  b: number;
}

export interface OKLCH {
  L: number;
  C: number;
  h: number;
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function delinearize(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToOklab(r: number, g: number, b: number): OKLab {
  const lr = linearize(r / 255);
  const lg = linearize(g / 255);
  const lb = linearize(b / 255);

  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_cbrt = Math.cbrt(l_);
  const m_cbrt = Math.cbrt(m_);
  const s_cbrt = Math.cbrt(s_);

  return {
    L: 0.2104542553 * l_cbrt + 0.793617785 * m_cbrt - 0.0040720468 * s_cbrt,
    a: 1.9779984951 * l_cbrt - 2.428592205 * m_cbrt + 0.4505937099 * s_cbrt,
    b: 0.0259040371 * l_cbrt + 0.7827717662 * m_cbrt - 0.808675766 * s_cbrt,
  };
}

export function oklabToRgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: Math.round(Math.min(255, Math.max(0, delinearize(rLin) * 255))),
    g: Math.round(Math.min(255, Math.max(0, delinearize(gLin) * 255))),
    b: Math.round(Math.min(255, Math.max(0, delinearize(bLin) * 255))),
  };
}

export function rgbToOklch(r: number, g: number, b: number): OKLCH {
  const lab = rgbToOklab(r, g, b);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { L: lab.L, C, h };
}

export function oklchToRgb(L: number, C: number, h: number): { r: number; g: number; b: number } {
  const hRad = h * (Math.PI / 180);
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b);
}

// --- Perceptual color distance (Delta E OKLab) ---

export function perceptualDistance(a: RGBA, b: RGBA): number {
  const labA = rgbToOklab(a.r, a.g, a.b);
  const labB = rgbToOklab(b.r, b.g, b.b);
  return Math.sqrt((labA.L - labB.L) ** 2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2);
}

export function perceptualNearestColor(
  color: RGBA,
  palette: RGBA[],
): { color: RGBA; index: number; distance: number } {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const d = perceptualDistance(color, palette[i]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }

  return { color: palette[bestIndex], index: bestIndex, distance: bestDistance };
}

export function snapToPalette(color: RGBA, palette: RGBA[]): RGBA {
  if (palette.length === 0) return color;
  return perceptualNearestColor(color, palette).color;
}

// --- Internal HSL (float-based, h in degrees, s/l in 0-1) ---
// Not exported to avoid collision with color-analysis-engine's integer-based HSL

function rgbToHslFloat(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;

  return { h, s, l };
}

function hslToRgbFloat(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

// --- Ramp generation (internal — public API is via palette-engine) ---

export function generateOklchRamp(startHex: string, endHex: string, steps: number): string[] {
  if (steps <= 0) return [];
  if (steps === 1) return [startHex];

  const startRgba = hexToRGBA(startHex);
  const endRgba = hexToRGBA(endHex);

  const startLch = rgbToOklch(startRgba.r, startRgba.g, startRgba.b);
  const endLch = rgbToOklch(endRgba.r, endRgba.g, endRgba.b);

  let dh = endLch.h - startLch.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  const result: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const L = startLch.L + (endLch.L - startLch.L) * t;
    const C = startLch.C + (endLch.C - startLch.C) * t;
    let h = startLch.h + dh * t;
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;

    const rgb = oklchToRgb(L, C, h);
    const a = Math.round(startRgba.a + (endRgba.a - startRgba.a) * t);
    result.push(rgbaToHex({ ...rgb, a }));
  }

  return result;
}

export function generateHslRamp(startHex: string, endHex: string, steps: number): string[] {
  if (steps <= 0) return [];
  if (steps === 1) return [startHex];

  const startRgba = hexToRGBA(startHex);
  const endRgba = hexToRGBA(endHex);

  const startHsl = rgbToHslFloat(startRgba.r, startRgba.g, startRgba.b);
  const endHsl = rgbToHslFloat(endRgba.r, endRgba.g, endRgba.b);

  let dh = endHsl.h - startHsl.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  const result: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let h = startHsl.h + dh * t;
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;
    const s = startHsl.s + (endHsl.s - startHsl.s) * t;
    const l = startHsl.l + (endHsl.l - startHsl.l) * t;

    const rgb = hslToRgbFloat(h, s, l);
    const a = Math.round(startRgba.a + (endRgba.a - startRgba.a) * t);
    result.push(rgbaToHex({ ...rgb, a }));
  }

  return result;
}

/**
 * Generate a hue-shifting ramp — the signature Stardew Valley technique.
 * Shadows shift toward one hue, highlights toward another, with chroma variation.
 */
export function generateHueShiftRampCore(
  baseHex: string,
  steps: number,
  config: HueShiftRampConfig,
): string[] {
  if (steps <= 0) return [];
  if (steps === 1) return [baseHex];

  const baseRgba = hexToRGBA(baseHex);
  const baseLch = rgbToOklch(baseRgba.r, baseRgba.g, baseRgba.b);

  const { hueShift, saturationShift, lightnessStart, lightnessEnd } = config;

  const result: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);

    const L = lightnessStart + (lightnessEnd - lightnessStart) * t;

    const hueOffset = hueShift * (t - 0.5);
    let h = baseLch.h + hueOffset;
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;

    const satCurve = 1 - Math.abs(t - 0.5) * 2 * Math.abs(saturationShift);
    const C = baseLch.C * Math.max(0, satCurve + saturationShift * (t - 0.5));

    const rgb = oklchToRgb(L, C, h);
    result.push(rgbaToHex({ ...rgb, a: baseRgba.a }));
  }

  return result;
}
