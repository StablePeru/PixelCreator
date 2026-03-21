import { describe, it, expect } from 'vitest';
import { hexToRGBA, rgbaToHex, rgbaEqual, colorDistance } from '../../src/types/common.js';

describe('hexToRGBA', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRGBA('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(hexToRGBA('#00ff00')).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    expect(hexToRGBA('#1a1c2c')).toEqual({ r: 26, g: 28, b: 44, a: 255 });
  });

  it('parses 8-digit hex with alpha', () => {
    expect(hexToRGBA('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 });
  });

  it('handles without # prefix', () => {
    expect(hexToRGBA('ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  it('throws on invalid hex', () => {
    expect(() => hexToRGBA('#xyz')).toThrow();
  });
});

describe('rgbaToHex', () => {
  it('converts to 6-digit hex for full opacity', () => {
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 255 })).toBe('#ff0000');
  });

  it('converts to 8-digit hex for partial opacity', () => {
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 128 })).toBe('#ff000080');
  });
});

describe('rgbaEqual', () => {
  it('returns true for same colors', () => {
    expect(rgbaEqual({ r: 1, g: 2, b: 3, a: 4 }, { r: 1, g: 2, b: 3, a: 4 })).toBe(true);
  });

  it('returns false for different colors', () => {
    expect(rgbaEqual({ r: 1, g: 2, b: 3, a: 4 }, { r: 1, g: 2, b: 3, a: 5 })).toBe(false);
  });
});

describe('colorDistance', () => {
  it('returns 0 for same colors', () => {
    expect(colorDistance({ r: 0, g: 0, b: 0, a: 0 }, { r: 0, g: 0, b: 0, a: 0 })).toBe(0);
  });

  it('returns positive distance for different colors', () => {
    const d = colorDistance({ r: 255, g: 0, b: 0, a: 255 }, { r: 0, g: 0, b: 0, a: 255 });
    expect(d).toBeGreaterThan(0);
  });
});
