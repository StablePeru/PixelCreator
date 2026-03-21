import { describe, it, expect } from 'vitest';
import { generateId, generateSequentialId } from '../../src/utils/id-generator.js';

describe('generateId', () => {
  it('generates unique ids with prefix', () => {
    const id1 = generateId('layer');
    const id2 = generateId('layer');
    expect(id1).toMatch(/^layer-/);
    expect(id1).not.toBe(id2);
  });
});

describe('generateSequentialId', () => {
  it('generates padded sequential ids', () => {
    expect(generateSequentialId('frame', 1)).toBe('frame-001');
    expect(generateSequentialId('frame', 42)).toBe('frame-042');
    expect(generateSequentialId('layer', 100)).toBe('layer-100');
  });
});
