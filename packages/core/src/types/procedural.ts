export type NoiseType = 'simplex' | 'fbm' | 'turbulence';
export type PatternType = 'checkerboard' | 'stripes' | 'grid-dots' | 'brick';
export type NoiseMappingMode = 'grayscale' | 'palette' | 'threshold';

export interface SimplexNoiseOptions {
  seed: number;
  scale: number;
}

export interface FbmNoiseOptions extends SimplexNoiseOptions {
  octaves: number;
  lacunarity: number;
  persistence: number;
}

export interface TurbulenceNoiseOptions extends FbmNoiseOptions {}

export type NoiseOptions = SimplexNoiseOptions | FbmNoiseOptions | TurbulenceNoiseOptions;

export interface NoiseToPixelOptions {
  mode: NoiseMappingMode;
  threshold?: number;
  colorAbove?: string;
  colorBelow?: string;
  paletteColors?: string[];
}

export interface CheckerboardOptions {
  cellSize: number;
  color1: string;
  color2: string;
}

export interface StripesOptions {
  direction: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';
  widths: number[];
  colors: string[];
}

export interface GridDotsOptions {
  spacingX: number;
  spacingY: number;
  dotSize: number;
  color: string;
  background?: string;
}

export interface BrickOptions {
  brickWidth: number;
  brickHeight: number;
  mortarSize: number;
  brickColor: string;
  mortarColor: string;
  offset: number;
}
