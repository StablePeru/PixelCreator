import { describe, it, expect } from 'vitest';
import {
  addFlag,
  emptyFlagsFile,
  listFlags,
  removeFlag,
  resolveFlag,
} from '../../src/core/validation-engine.js';

describe('validation flags CRUD', () => {
  const canvas = 'hero';
  const baseInput = {
    canvas,
    severity: 'warning' as const,
    category: 'palette' as const,
    note: '3 pixels off-palette',
  };

  it('empty flags file starts with no flags', () => {
    const file = emptyFlagsFile(canvas);
    expect(file).toEqual({ version: 1, canvas, flags: [] });
  });

  it('addFlag assigns sequential ids starting at flag-001', () => {
    let file = emptyFlagsFile(canvas);
    file = addFlag(file, { ...baseInput, now: 1000 });
    file = addFlag(file, { ...baseInput, now: 2000 });
    file = addFlag(file, { ...baseInput, now: 3000 });
    expect(file.flags.map((f) => f.id)).toEqual(['flag-001', 'flag-002', 'flag-003']);
  });

  it('addFlag preserves optional scope fields when provided', () => {
    const file = addFlag(emptyFlagsFile(canvas), {
      ...baseInput,
      frameIndex: 2,
      layerId: 'layer-003',
      region: { x: 4, y: 8, w: 10, h: 6 },
      tags: ['body', 'shade'],
    });
    const flag = file.flags[0];
    expect(flag.frameIndex).toBe(2);
    expect(flag.layerId).toBe('layer-003');
    expect(flag.region).toEqual({ x: 4, y: 8, w: 10, h: 6 });
    expect(flag.tags).toEqual(['body', 'shade']);
  });

  it('addFlag omits optional fields when not provided', () => {
    const file = addFlag(emptyFlagsFile(canvas), baseInput);
    const flag = file.flags[0];
    expect(flag.frameIndex).toBeUndefined();
    expect(flag.layerId).toBeUndefined();
    expect(flag.region).toBeUndefined();
    expect(flag.resolvedAt).toBeUndefined();
  });

  it('addFlag rejects empty note', () => {
    expect(() => addFlag(emptyFlagsFile(canvas), { ...baseInput, note: '   ' })).toThrow(
      /note is required/i,
    );
  });

  it('addFlag rejects canvas mismatch', () => {
    expect(() => addFlag(emptyFlagsFile('hero'), { ...baseInput, canvas: 'villain' })).toThrow(
      /does not match/i,
    );
  });

  it('addFlag rejects non-positive regions', () => {
    expect(() =>
      addFlag(emptyFlagsFile(canvas), { ...baseInput, region: { x: 0, y: 0, w: 0, h: 5 } }),
    ).toThrow(/positive width\/height/);
  });

  it('addFlag is immutable (does not mutate input file)', () => {
    const file = emptyFlagsFile(canvas);
    const next = addFlag(file, baseInput);
    expect(file.flags).toHaveLength(0);
    expect(next.flags).toHaveLength(1);
    expect(next).not.toBe(file);
  });

  it('resolveFlag stamps resolvedAt + resolution', () => {
    let file = addFlag(emptyFlagsFile(canvas), baseInput);
    file = resolveFlag(file, 'flag-001', 'fixed palette in layer-001', 9999);
    const flag = file.flags[0];
    expect(flag.resolvedAt).toBe(9999);
    expect(flag.resolution).toBe('fixed palette in layer-001');
  });

  it('resolveFlag throws on unknown id and on double-resolve', () => {
    let file = addFlag(emptyFlagsFile(canvas), baseInput);
    expect(() => resolveFlag(file, 'flag-999', 'x')).toThrow(/not found/);
    file = resolveFlag(file, 'flag-001', 'fixed');
    expect(() => resolveFlag(file, 'flag-001', 'again')).toThrow(/already resolved/);
  });

  it('removeFlag drops the entry', () => {
    let file = addFlag(emptyFlagsFile(canvas), baseInput);
    file = addFlag(file, baseInput);
    file = removeFlag(file, 'flag-001');
    expect(file.flags.map((f) => f.id)).toEqual(['flag-002']);
  });

  it('removeFlag throws on unknown id', () => {
    const file = addFlag(emptyFlagsFile(canvas), baseInput);
    expect(() => removeFlag(file, 'flag-999')).toThrow(/not found/);
  });

  it('listFlags openOnly filters resolved flags', () => {
    let file = addFlag(emptyFlagsFile(canvas), baseInput);
    file = addFlag(file, baseInput);
    file = resolveFlag(file, 'flag-001', 'done');
    expect(listFlags(file).map((f) => f.id)).toEqual(['flag-001', 'flag-002']);
    expect(listFlags(file, { openOnly: true }).map((f) => f.id)).toEqual(['flag-002']);
  });

  it('listFlags filters by severity, category, frame, layer', () => {
    let file = emptyFlagsFile(canvas);
    file = addFlag(file, { ...baseInput, severity: 'error', frameIndex: 0, layerId: 'layer-001' });
    file = addFlag(file, { ...baseInput, severity: 'warning', frameIndex: 1, layerId: 'layer-002' });
    file = addFlag(file, { ...baseInput, severity: 'info', category: 'animation', frameIndex: 1 });

    expect(listFlags(file, { severity: 'error' }).map((f) => f.id)).toEqual(['flag-001']);
    expect(listFlags(file, { category: 'animation' }).map((f) => f.id)).toEqual(['flag-003']);
    expect(listFlags(file, { frameIndex: 1 }).map((f) => f.id)).toEqual(['flag-002', 'flag-003']);
    expect(listFlags(file, { layerId: 'layer-002' }).map((f) => f.id)).toEqual(['flag-002']);
  });
});
