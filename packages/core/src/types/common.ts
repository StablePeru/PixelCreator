export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OutputFormat = 'text' | 'json' | 'silent';

export interface CommandResult<T = unknown> {
  success: boolean;
  command: string;
  args: Record<string, unknown>;
  result: T;
  duration: number;
}

export function hexToRGBA(hex: string): RGBA {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
      a: 255,
    };
  }
  if (clean.length === 8) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
      a: parseInt(clean.slice(6, 8), 16),
    };
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

export function rgbaToHex(color: RGBA): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  if (color.a === 255) return `#${r}${g}${b}`;
  const a = color.a.toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

export function rgbaEqual(a: RGBA, b: RGBA): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function colorDistance(a: RGBA, b: RGBA): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2 + (a.a - b.a) ** 2,
  );
}
