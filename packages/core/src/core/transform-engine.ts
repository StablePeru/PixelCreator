import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { findNearestColor } from './palette-engine.js';

export function flipBufferH(buffer: PixelBuffer): PixelBuffer {
  const { width, height } = buffer;
  const result = new PixelBuffer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result.setPixel(width - 1 - x, y, buffer.getPixel(x, y));
    }
  }
  return result;
}

export function flipBufferV(buffer: PixelBuffer): PixelBuffer {
  const { width, height } = buffer;
  const result = new PixelBuffer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result.setPixel(x, height - 1 - y, buffer.getPixel(x, y));
    }
  }
  return result;
}

export function rotateBuffer90(buffer: PixelBuffer, turns: 1 | 2 | 3): PixelBuffer {
  const { width, height } = buffer;

  if (turns === 2) {
    const result = new PixelBuffer(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result.setPixel(width - 1 - x, height - 1 - y, buffer.getPixel(x, y));
      }
    }
    return result;
  }

  // 90° (turns=1) or 270° (turns=3): dimensions swap
  const result = new PixelBuffer(height, width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (turns === 1) {
        result.setPixel(height - 1 - y, x, buffer.getPixel(x, y));
      } else {
        result.setPixel(y, width - 1 - x, buffer.getPixel(x, y));
      }
    }
  }
  return result;
}

export function scaleBufferNearest(buffer: PixelBuffer, newWidth: number, newHeight: number): PixelBuffer {
  if (newWidth < 1 || newHeight < 1) {
    throw new Error('Target dimensions must be at least 1x1.');
  }
  const { width: srcW, height: srcH } = buffer;
  const result = new PixelBuffer(newWidth, newHeight);
  for (let dy = 0; dy < newHeight; dy++) {
    const sy = Math.floor(dy * srcH / newHeight);
    for (let dx = 0; dx < newWidth; dx++) {
      const sx = Math.floor(dx * srcW / newWidth);
      result.setPixel(dx, dy, buffer.getPixel(sx, sy));
    }
  }
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function adjustBrightness(buffer: PixelBuffer, amount: number): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = result.getPixel(x, y);
      if (px.a === 0) continue;
      result.setPixel(x, y, {
        r: clamp(px.r + amount, 0, 255),
        g: clamp(px.g + amount, 0, 255),
        b: clamp(px.b + amount, 0, 255),
        a: px.a,
      });
    }
  }
  return result;
}

export function adjustContrast(buffer: PixelBuffer, amount: number): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();
  const factor = (259 * (amount + 255)) / (255 * (259 - amount));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = result.getPixel(x, y);
      if (px.a === 0) continue;
      result.setPixel(x, y, {
        r: clamp(factor * (px.r - 128) + 128, 0, 255),
        g: clamp(factor * (px.g - 128) + 128, 0, 255),
        b: clamp(factor * (px.b - 128) + 128, 0, 255),
        a: px.a,
      });
    }
  }
  return result;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) / 6;
  } else {
    h = ((rn - gn) / d + 4) / 6;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function invertColors(buffer: PixelBuffer): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = result.getPixel(x, y);
      if (px.a === 0) continue;
      result.setPixel(x, y, {
        r: 255 - px.r,
        g: 255 - px.g,
        b: 255 - px.b,
        a: px.a,
      });
    }
  }
  return result;
}

export function desaturate(buffer: PixelBuffer, amount: number): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();
  const factor = amount / 100;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = result.getPixel(x, y);
      if (px.a === 0) continue;
      const L = 0.2126 * px.r + 0.7152 * px.g + 0.0722 * px.b;
      result.setPixel(x, y, {
        r: clamp(px.r + (L - px.r) * factor, 0, 255),
        g: clamp(px.g + (L - px.g) * factor, 0, 255),
        b: clamp(px.b + (L - px.b) * factor, 0, 255),
        a: px.a,
      });
    }
  }
  return result;
}

export function hueShift(buffer: PixelBuffer, degrees: number): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();
  const shift = degrees / 360;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = result.getPixel(x, y);
      if (px.a === 0) continue;
      const hsl = rgbToHsl(px.r, px.g, px.b);
      let newH = hsl.h + shift;
      if (newH < 0) newH += 1;
      if (newH >= 1) newH -= 1;
      const rgb = hslToRgb(newH, hsl.s, hsl.l);
      result.setPixel(x, y, { r: rgb.r, g: rgb.g, b: rgb.b, a: px.a });
    }
  }
  return result;
}

export function posterize(buffer: PixelBuffer, levels: number): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();
  const divisor = 255 / (levels - 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = result.getPixel(x, y);
      if (px.a === 0) continue;
      result.setPixel(x, y, {
        r: clamp(Math.round(px.r / divisor) * divisor, 0, 255),
        g: clamp(Math.round(px.g / divisor) * divisor, 0, 255),
        b: clamp(Math.round(px.b / divisor) * divisor, 0, 255),
        a: px.a,
      });
    }
  }
  return result;
}

function bayerMatrix(size: 2 | 4 | 8): number[][] {
  const m2 = [
    [0, 2],
    [3, 1],
  ];

  if (size === 2) {
    return m2.map((row) => row.map((v) => v / 4));
  }

  function recurse(prev: number[][], n: number): number[][] {
    const pSize = prev.length;
    const newSize = pSize * 2;
    const result: number[][] = Array.from({ length: newSize }, () => new Array(newSize));
    for (let y = 0; y < newSize; y++) {
      for (let x = 0; x < newSize; x++) {
        const py = y % pSize;
        const px = x % pSize;
        const quadrant = (y < pSize ? 0 : 1) * 2 + (x < pSize ? 0 : 1);
        const offsets = [0, 2, 3, 1];
        result[y][x] = 4 * prev[py][px] + offsets[quadrant];
      }
    }
    return result;
  }

  let matrix = m2;
  let current = 2;
  while (current < size) {
    matrix = recurse(matrix, current);
    current *= 2;
  }

  const total = size * size;
  return matrix.map((row) => row.map((v) => v / total));
}

export function ditherBuffer(
  buffer: PixelBuffer,
  palette: RGBA[],
  method: 'ordered' | 'floyd-steinberg',
  matrixSize: 2 | 4 | 8 = 4,
): PixelBuffer {
  const { width, height } = buffer;
  const result = buffer.clone();

  if (method === 'ordered') {
    const matrix = bayerMatrix(matrixSize);
    const mSize = matrixSize;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = result.getPixel(x, y);
        if (px.a === 0) continue;

        const threshold = matrix[y % mSize][x % mSize] - 0.5;
        const bias = threshold * (255 / (palette.length > 1 ? palette.length - 1 : 1));

        const biased: RGBA = {
          r: clamp(px.r + bias, 0, 255),
          g: clamp(px.g + bias, 0, 255),
          b: clamp(px.b + bias, 0, 255),
          a: px.a,
        };

        const nearest = findNearestColor(biased, palette);
        result.setPixel(x, y, { ...nearest.color, a: px.a });
      }
    }
  } else {
    // Floyd-Steinberg error diffusion
    // Work on float arrays to accumulate error
    const rArr = new Float64Array(width * height);
    const gArr = new Float64Array(width * height);
    const bArr = new Float64Array(width * height);
    const aArr = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = buffer.getPixel(x, y);
        const idx = y * width + x;
        rArr[idx] = px.r;
        gArr[idx] = px.g;
        bArr[idx] = px.b;
        aArr[idx] = px.a;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (aArr[idx] === 0) continue;

        const old: RGBA = {
          r: clamp(rArr[idx], 0, 255),
          g: clamp(gArr[idx], 0, 255),
          b: clamp(bArr[idx], 0, 255),
          a: aArr[idx],
        };

        const nearest = findNearestColor(old, palette);
        result.setPixel(x, y, { ...nearest.color, a: old.a });

        const errR = old.r - nearest.color.r;
        const errG = old.g - nearest.color.g;
        const errB = old.b - nearest.color.b;

        const distribute = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
          const ni = ny * width + nx;
          if (aArr[ni] === 0) return;
          rArr[ni] += errR * factor;
          gArr[ni] += errG * factor;
          bArr[ni] += errB * factor;
        };

        distribute(1, 0, 7 / 16);
        distribute(-1, 1, 3 / 16);
        distribute(0, 1, 5 / 16);
        distribute(1, 1, 1 / 16);
      }
    }
  }

  return result;
}

export function scaleBufferBilinear(
  buffer: PixelBuffer,
  newWidth: number,
  newHeight: number,
): PixelBuffer {
  const result = new PixelBuffer(newWidth, newHeight);
  const xRatio = buffer.width / newWidth;
  const yRatio = buffer.height / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, buffer.width - 1);
      const y1 = Math.min(y0 + 1, buffer.height - 1);
      const xFrac = srcX - x0;
      const yFrac = srcY - y0;

      const p00 = buffer.getPixel(x0, y0);
      const p10 = buffer.getPixel(x1, y0);
      const p01 = buffer.getPixel(x0, y1);
      const p11 = buffer.getPixel(x1, y1);

      const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

      result.setPixel(x, y, {
        r: lerp(lerp(p00.r, p10.r, xFrac), lerp(p01.r, p11.r, xFrac), yFrac),
        g: lerp(lerp(p00.g, p10.g, xFrac), lerp(p01.g, p11.g, xFrac), yFrac),
        b: lerp(lerp(p00.b, p10.b, xFrac), lerp(p01.b, p11.b, xFrac), yFrac),
        a: lerp(lerp(p00.a, p10.a, xFrac), lerp(p01.a, p11.a, xFrac), yFrac),
      });
    }
  }

  return result;
}
