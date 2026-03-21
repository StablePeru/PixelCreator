import type { Point, Rect } from '../types/common.js';

export function parsePoint(str: string): Point {
  const parts = str.split(',');
  if (parts.length !== 2) {
    throw new Error(`Invalid point format: "${str}". Expected "x,y"`);
  }
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (isNaN(x) || isNaN(y)) {
    throw new Error(`Invalid point coordinates: "${str}". Expected integer values`);
  }
  return { x, y };
}

export function parsePoints(str: string): Point[] {
  const trimmed = str.trim();
  if (!trimmed) {
    throw new Error('Empty points string');
  }
  const pairs = trimmed.split(/\s+/);
  return pairs.map((pair) => parsePoint(pair));
}

export function parseRect(str: string): Rect {
  const parts = str.split(',');
  if (parts.length !== 4) {
    throw new Error(`Invalid rect format: "${str}". Expected "x,y,w,h"`);
  }
  const [x, y, width, height] = parts.map((p) => parseInt(p, 10));
  if ([x, y, width, height].some(isNaN)) {
    throw new Error(`Invalid rect values: "${str}". Expected integer values`);
  }
  return { x, y, width, height };
}
