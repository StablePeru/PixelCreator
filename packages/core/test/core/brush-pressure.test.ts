import { describe, it, expect } from 'vitest';
import { applyPressureStroke, applySymmetricPressureStroke } from '../../src/core/brush-engine.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { BrushPreset, SymmetryConfig } from '../../src/types/brush.js';

const WHITE = { r: 255, g: 255, b: 255, a: 255 };

function makePreset(overrides?: Partial<BrushPreset>): BrushPreset {
  return {
    id: 'test',
    name: 'Test',
    size: 3,
    shape: 'square',
    spacing: 1,
    opacity: 255,
    pixelPerfect: false,
    pressureSensitivity: {
      enabled: true,
      curve: 'linear',
      minSize: 0.2,
      minOpacity: 0.2,
    },
    ...overrides,
  };
}

describe('applyPressureStroke', () => {
  it('draws pixels on buffer when given points with pressure', () => {
    const buf = new PixelBuffer(16, 16);
    const points = [{ x: 4, y: 4 }, { x: 8, y: 4 }];
    const pressure = [0.5, 1.0];
    applyPressureStroke(buf, points, pressure, WHITE, makePreset());
    // At least some pixels should be non-zero after a stroke
    const data = buf.data;
    let nonZero = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(0);
  });

  it('falls back to regular stroke when pressure is disabled', () => {
    const buf = new PixelBuffer(16, 16);
    const points = [{ x: 4, y: 4 }, { x: 8, y: 4 }];
    const pressure = [0.5, 1.0];
    const preset = makePreset({ pressureSensitivity: { enabled: false, curve: 'linear', minSize: 0.2, minOpacity: 0.2 } });
    applyPressureStroke(buf, points, pressure, WHITE, preset);
    const data = buf.data;
    let nonZero = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(0);
  });

  it('lower pressure produces smaller/fainter marks than full pressure', () => {
    const bufLow = new PixelBuffer(16, 16);
    const bufHigh = new PixelBuffer(16, 16);
    const points = [{ x: 8, y: 8 }];
    applyPressureStroke(bufLow, points, [0.1], WHITE, makePreset());
    applyPressureStroke(bufHigh, points, [1.0], WHITE, makePreset());

    let sumLow = 0;
    let sumHigh = 0;
    for (let i = 3; i < bufLow.data.length; i += 4) {
      sumLow += bufLow.data[i];
      sumHigh += bufHigh.data[i];
    }
    expect(sumHigh).toBeGreaterThanOrEqual(sumLow);
  });
});

describe('applySymmetricPressureStroke', () => {
  it('draws on both sides with horizontal symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const points = [{ x: 2, y: 8 }];
    const pressure = [1.0];
    const symmetry: SymmetryConfig = { mode: 'horizontal', axisX: 8 };
    applySymmetricPressureStroke(buf, points, pressure, WHITE, makePreset(), symmetry);

    // Check left side has pixels
    let leftAlpha = 0;
    let rightAlpha = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        leftAlpha += buf.data[(y * 16 + x) * 4 + 3];
      }
      for (let x = 8; x < 16; x++) {
        rightAlpha += buf.data[(y * 16 + x) * 4 + 3];
      }
    }
    expect(leftAlpha).toBeGreaterThan(0);
    expect(rightAlpha).toBeGreaterThan(0);
  });

  it('with symmetry=none behaves like applyPressureStroke', () => {
    const buf1 = new PixelBuffer(16, 16);
    const buf2 = new PixelBuffer(16, 16);
    const points = [{ x: 4, y: 4 }];
    const pressure = [0.8];
    const preset = makePreset();
    const noSym: SymmetryConfig = { mode: 'none' };

    applyPressureStroke(buf1, points, pressure, WHITE, preset);
    applySymmetricPressureStroke(buf2, points, pressure, WHITE, preset, noSym);

    expect(Buffer.from(buf1.data)).toEqual(Buffer.from(buf2.data));
  });
});
