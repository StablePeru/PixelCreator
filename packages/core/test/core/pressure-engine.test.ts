import { describe, it, expect } from 'vitest';
import {
  applyPressureCurve,
  pressureToSize,
  pressureToOpacity,
  interpolateStrokePressure,
} from '../../src/core/pressure-engine.js';

describe('applyPressureCurve', () => {
  it('linear: passes through unchanged', () => {
    expect(applyPressureCurve(0, 'linear')).toBe(0);
    expect(applyPressureCurve(0.5, 'linear')).toBe(0.5);
    expect(applyPressureCurve(1, 'linear')).toBe(1);
  });

  it('soft: applies sqrt curve', () => {
    expect(applyPressureCurve(0, 'soft')).toBe(0);
    expect(applyPressureCurve(0.25, 'soft')).toBe(0.5);
    expect(applyPressureCurve(1, 'soft')).toBe(1);
  });

  it('hard: applies squared curve', () => {
    expect(applyPressureCurve(0, 'hard')).toBe(0);
    expect(applyPressureCurve(0.5, 'hard')).toBe(0.25);
    expect(applyPressureCurve(1, 'hard')).toBe(1);
  });

  it('clamps values below 0 and above 1', () => {
    expect(applyPressureCurve(-0.5, 'linear')).toBe(0);
    expect(applyPressureCurve(1.5, 'linear')).toBe(1);
  });
});

describe('pressureToSize', () => {
  const config = { enabled: true, curve: 'linear' as const, minSize: 0.2, minOpacity: 0.2 };

  it('pressure=1 returns full baseSize', () => {
    expect(pressureToSize(1, 10, config)).toBe(10);
  });

  it('pressure=0 returns minSize fraction of baseSize', () => {
    expect(pressureToSize(0, 10, config)).toBe(2);
  });

  it('pressure=0.5 linear interpolates between minSize and baseSize', () => {
    // minSz = 10 * 0.2 = 2, range = 8, 2 + 8*0.5 = 6
    expect(pressureToSize(0.5, 10, config)).toBe(6);
  });

  it('disabled config returns baseSize regardless of pressure', () => {
    const disabled = { ...config, enabled: false };
    expect(pressureToSize(0, 10, disabled)).toBe(10);
    expect(pressureToSize(0.5, 10, disabled)).toBe(10);
  });
});

describe('pressureToOpacity', () => {
  const config = { enabled: true, curve: 'linear' as const, minSize: 0.2, minOpacity: 0.2 };

  it('pressure=1 returns full baseOpacity', () => {
    expect(pressureToOpacity(1, 255, config)).toBe(255);
  });

  it('pressure=0 returns minOpacity fraction of baseOpacity', () => {
    expect(pressureToOpacity(0, 255, config)).toBe(51);
  });

  it('pressure=0.5 linear interpolates between minOpacity and baseOpacity', () => {
    // minOp = 255 * 0.2 = 51, range = 204, 51 + 204*0.5 = 153
    expect(pressureToOpacity(0.5, 255, config)).toBe(153);
  });

  it('disabled config returns baseOpacity regardless of pressure', () => {
    const disabled = { ...config, enabled: false };
    expect(pressureToOpacity(0, 255, disabled)).toBe(255);
    expect(pressureToOpacity(0.5, 255, disabled)).toBe(255);
  });
});

describe('interpolateStrokePressure', () => {
  it('single point returns same point and pressure', () => {
    const pts = [{ x: 5, y: 5 }];
    const pres = [0.7];
    const result = interpolateStrokePressure(pts, pres, 1);
    expect(result.points).toEqual([{ x: 5, y: 5 }]);
    expect(result.pressure).toEqual([0.7]);
  });

  it('empty array returns empty result', () => {
    const result = interpolateStrokePressure([], [], 1);
    expect(result.points).toEqual([]);
    expect(result.pressure).toEqual([]);
  });

  it('two points produce interpolated points and pressure', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const pres = [0.2, 0.8];
    const result = interpolateStrokePressure(pts, pres, 2);
    expect(result.points.length).toBeGreaterThan(2);
    expect(result.pressure[0]).toBe(0.2);
    expect(result.pressure[result.pressure.length - 1]).toBe(0.8);
    for (let i = 1; i < result.pressure.length - 1; i++) {
      expect(result.pressure[i]).toBeGreaterThanOrEqual(0.2);
      expect(result.pressure[i]).toBeLessThanOrEqual(0.8);
    }
  });

  it('pressure values are correctly interpolated linearly', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }];
    const pres = [0.0, 1.0];
    const result = interpolateStrokePressure(pts, pres, 1);
    for (let i = 1; i < result.pressure.length; i++) {
      expect(result.pressure[i]).toBeGreaterThanOrEqual(result.pressure[i - 1]);
    }
  });

  it('treats spacing <= 0 as spacing 1 (safe fallback)', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }];
    const pres = [0.0, 1.0];
    const withZero = interpolateStrokePressure(pts, pres, 0);
    const withNeg = interpolateStrokePressure(pts, pres, -5);
    const withOne = interpolateStrokePressure(pts, pres, 1);
    expect(withZero).toEqual(withOne);
    expect(withNeg).toEqual(withOne);
  });

  it('does not mutate original arrays', () => {
    const pts = [{ x: 0, y: 0 }, { x: 5, y: 0 }];
    const pres = [0.3, 0.9];
    const ptsCopy = [{ x: 0, y: 0 }, { x: 5, y: 0 }];
    const presCopy = [0.3, 0.9];
    interpolateStrokePressure(pts, pres, 1);
    expect(pts).toEqual(ptsCopy);
    expect(pres).toEqual(presCopy);
  });
});
