import { describe, it, expect } from 'vitest';
import { parsePoint, parsePoints, parseRect } from '../../src/utils/point-parser.js';

describe('parsePoint', () => {
  it('parses valid point', () => {
    expect(parsePoint('3,5')).toEqual({ x: 3, y: 5 });
  });

  it('parses negative coordinates', () => {
    expect(parsePoint('-2,10')).toEqual({ x: -2, y: 10 });
  });

  it('throws on invalid format', () => {
    expect(() => parsePoint('3')).toThrow();
    expect(() => parsePoint('3,4,5')).toThrow();
  });

  it('throws on non-numeric values', () => {
    expect(() => parsePoint('a,b')).toThrow();
  });
});

describe('parsePoints', () => {
  it('parses multiple points', () => {
    expect(parsePoints('0,0 10,5 20,10')).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 10 },
    ]);
  });

  it('parses single point', () => {
    expect(parsePoints('5,7')).toEqual([{ x: 5, y: 7 }]);
  });

  it('throws on empty string', () => {
    expect(() => parsePoints('')).toThrow();
    expect(() => parsePoints('  ')).toThrow();
  });
});

describe('parseRect', () => {
  it('parses valid rect', () => {
    expect(parseRect('2,3,10,8')).toEqual({ x: 2, y: 3, width: 10, height: 8 });
  });

  it('throws on invalid format', () => {
    expect(() => parseRect('1,2,3')).toThrow();
    expect(() => parseRect('a,b,c,d')).toThrow();
  });
});
