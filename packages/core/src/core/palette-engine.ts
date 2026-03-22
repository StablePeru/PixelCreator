import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { hexToRGBA, colorDistance, rgbaToHex } from '../types/common.js';
import type { PaletteData, PaletteColor } from '../types/palette.js';

export type PaletteSortMode = 'hue' | 'luminance' | 'saturation' | 'index' | 'name';

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const rgba = hexToRGBA(hex);
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return { h, s, l };
}

export function sortPaletteColors(colors: PaletteColor[], mode: PaletteSortMode, reverse: boolean): PaletteColor[] {
  const sorted = [...colors];

  sorted.sort((a, b) => {
    switch (mode) {
      case 'hue': {
        const hslA = hexToHSL(a.hex);
        const hslB = hexToHSL(b.hex);
        return hslA.h - hslB.h;
      }
      case 'luminance': {
        const rgbaA = hexToRGBA(a.hex);
        const rgbaB = hexToRGBA(b.hex);
        const lumA = 0.2126 * rgbaA.r + 0.7152 * rgbaA.g + 0.0722 * rgbaA.b;
        const lumB = 0.2126 * rgbaB.r + 0.7152 * rgbaB.g + 0.0722 * rgbaB.b;
        return lumA - lumB;
      }
      case 'saturation': {
        const hslA = hexToHSL(a.hex);
        const hslB = hexToHSL(b.hex);
        return hslA.s - hslB.s;
      }
      case 'index':
        return a.index - b.index;
      case 'name': {
        if (a.name === null && b.name === null) return 0;
        if (a.name === null) return 1;
        if (b.name === null) return -1;
        return a.name.localeCompare(b.name);
      }
    }
  });

  if (reverse) sorted.reverse();

  for (let i = 0; i < sorted.length; i++) {
    sorted[i] = { ...sorted[i], index: i };
  }

  return sorted;
}

export function generateRamp(startHex: string, endHex: string, steps: number): string[] {
  if (steps <= 0) return [];
  if (steps === 1) return [startHex];

  const start = hexToRGBA(startHex);
  const end = hexToRGBA(endHex);
  const result: string[] = [];

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const color: RGBA = {
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t),
      a: Math.round(start.a + (end.a - start.a) * t),
    };
    result.push(rgbaToHex(color));
  }

  return result;
}

export function samplePixelColor(buffer: PixelBuffer, x: number, y: number): RGBA {
  return buffer.getPixel(x, y);
}

export function extractUniqueColors(buffer: PixelBuffer, includeTransparent: boolean): string[] {
  const colorSet = new Set<string>();

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (!includeTransparent && pixel.a === 0) continue;
      colorSet.add(rgbaToHex(pixel));
    }
  }

  return [...colorSet].sort();
}

export interface PaletteViolation {
  x: number;
  y: number;
  layer: string;
  frame: string;
  color: string;
  nearestPaletteColor: string;
  distance: number;
}

export function findNearestColor(color: RGBA, paletteColors: RGBA[]): { color: RGBA; index: number; distance: number } {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < paletteColors.length; i++) {
    const d = colorDistance(color, paletteColors[i]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }

  return { color: paletteColors[bestIndex], index: bestIndex, distance: bestDistance };
}

export function validateBufferAgainstPalette(
  buffer: PixelBuffer,
  palette: PaletteData,
  layerName: string,
  frameName: string,
): PaletteViolation[] {
  const violations: PaletteViolation[] = [];
  const paletteRGBA = palette.colors.map((c) => hexToRGBA(c.hex));

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) continue;

      const nearest = findNearestColor(pixel, paletteRGBA);
      if (nearest.distance > 0) {
        violations.push({
          x,
          y,
          layer: layerName,
          frame: frameName,
          color: rgbaToHex(pixel),
          nearestPaletteColor: rgbaToHex(nearest.color),
          distance: nearest.distance,
        });
      }
    }
  }

  return violations;
}
