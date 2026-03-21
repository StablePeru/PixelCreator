import { describe, it, expect } from 'vitest';
import {
  parseGpl, serializeGpl,
  parseJasc, serializeJasc,
  parseHex, serializeHex,
  detectPaletteFormat,
} from '../../src/io/palette-codec.js';

describe('GPL format', () => {
  const sampleGpl = `GIMP Palette
Name: Test Palette
Columns: 8
#
255   0   0\tRed
  0 255   0\tGreen
  0   0 255\tBlue
`;

  it('parses valid GPL file', () => {
    const result = parseGpl(sampleGpl);
    expect(result.name).toBe('Test Palette');
    expect(result.colors).toHaveLength(3);
    expect(result.colors[0]).toEqual({ r: 255, g: 0, b: 0, name: 'Red' });
    expect(result.colors[1]).toEqual({ r: 0, g: 255, b: 0, name: 'Green' });
    expect(result.colors[2]).toEqual({ r: 0, g: 0, b: 255, name: 'Blue' });
  });

  it('parses GPL without color names', () => {
    const gpl = 'GIMP Palette\n#\n255 0 0\n0 255 0\n';
    const result = parseGpl(gpl);
    expect(result.colors).toHaveLength(2);
    expect(result.colors[0].name).toBeNull();
  });

  it('throws on invalid header', () => {
    expect(() => parseGpl('Not a palette\n255 0 0')).toThrow();
  });

  it('serializes GPL correctly', () => {
    const colors = [
      { r: 255, g: 0, b: 0, name: 'Red' as string | null },
      { r: 0, g: 128, b: 255, name: null },
    ];
    const output = serializeGpl('My Palette', colors);
    expect(output).toContain('GIMP Palette');
    expect(output).toContain('Name: My Palette');
    expect(output).toContain('255   0   0\tRed');
    expect(output).toContain('  0 128 255\tUntitled');
  });

  it('roundtrips GPL', () => {
    const colors = [
      { r: 10, g: 20, b: 30, name: 'Dark' as string | null },
      { r: 200, g: 100, b: 50, name: 'Warm' as string | null },
    ];
    const serialized = serializeGpl('Roundtrip', colors);
    const parsed = parseGpl(serialized);
    expect(parsed.name).toBe('Roundtrip');
    expect(parsed.colors).toHaveLength(2);
    expect(parsed.colors[0].r).toBe(10);
    expect(parsed.colors[1].name).toBe('Warm');
  });
});

describe('JASC-PAL format', () => {
  const sampleJasc = 'JASC-PAL\n0100\n3\n255 0 0\n0 255 0\n0 0 255\n';

  it('parses valid JASC file', () => {
    const result = parseJasc(sampleJasc);
    expect(result.colors).toHaveLength(3);
    expect(result.colors[0]).toEqual({ r: 255, g: 0, b: 0, name: null });
  });

  it('throws on invalid header', () => {
    expect(() => parseJasc('WRONG\n0100\n1\n255 0 0')).toThrow();
  });

  it('serializes JASC correctly', () => {
    const colors = [
      { r: 255, g: 0, b: 0, name: null },
      { r: 0, g: 255, b: 0, name: null },
    ];
    const output = serializeJasc(colors);
    expect(output).toContain('JASC-PAL');
    expect(output).toContain('0100');
    expect(output).toContain('2');
    expect(output).toContain('255 0 0');
  });

  it('roundtrips JASC', () => {
    const colors = [
      { r: 100, g: 150, b: 200, name: null },
    ];
    const serialized = serializeJasc(colors);
    const parsed = parseJasc(serialized);
    expect(parsed.colors[0].r).toBe(100);
    expect(parsed.colors[0].g).toBe(150);
  });
});

describe('HEX format', () => {
  it('parses hex lines', () => {
    const result = parseHex('ff0000\n00ff00\n0000ff\n');
    expect(result.colors).toHaveLength(3);
    expect(result.colors[0]).toEqual({ r: 255, g: 0, b: 0, name: null });
  });

  it('handles # prefix', () => {
    const result = parseHex('#ff0000\n#00ff00\n');
    expect(result.colors).toHaveLength(2);
    expect(result.colors[0].r).toBe(255);
  });

  it('skips invalid lines', () => {
    const result = parseHex('ff0000\ninvalid\n00ff00\n');
    expect(result.colors).toHaveLength(2);
  });

  it('serializes hex correctly', () => {
    const colors = [
      { r: 255, g: 0, b: 0, name: null },
      { r: 0, g: 128, b: 255, name: null },
    ];
    const output = serializeHex(colors);
    expect(output).toBe('ff0000\n0080ff\n');
  });

  it('roundtrips HEX', () => {
    const input = 'aabbcc\n112233\n';
    const parsed = parseHex(input);
    const serialized = serializeHex(parsed.colors);
    expect(serialized).toBe(input);
  });
});

describe('detectPaletteFormat', () => {
  it('detects GPL', () => {
    expect(detectPaletteFormat('GIMP Palette\n255 0 0')).toBe('gpl');
  });

  it('detects JASC', () => {
    expect(detectPaletteFormat('JASC-PAL\n0100\n1\n255 0 0')).toBe('jasc');
  });

  it('detects HEX', () => {
    expect(detectPaletteFormat('ff0000\n00ff00\n0000ff')).toBe('hex');
  });

  it('detects HEX with # prefix', () => {
    expect(detectPaletteFormat('#ff0000\n#00ff00')).toBe('hex');
  });

  it('returns null for unknown', () => {
    expect(detectPaletteFormat('random text\nwith stuff')).toBeNull();
  });
});
