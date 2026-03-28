export interface PaletteColor {
  index: number;
  hex: string;
  name: string | null;
  group: string | null;
}

export interface PaletteConstraints {
  maxColors: number;
  locked: boolean;
  allowAlpha: boolean;
}

export type RampInterpolation = 'rgb' | 'hsl' | 'oklch' | 'hue-shift';

export interface HueShiftRampConfig {
  hueShift: number;
  saturationShift: number;
  lightnessStart: number;
  lightnessEnd: number;
}

export interface PaletteRamp {
  name: string;
  indices: number[];
  interpolation?: RampInterpolation;
}

export interface PaletteData {
  name: string;
  description: string;
  colors: PaletteColor[];
  constraints: PaletteConstraints;
  ramps: PaletteRamp[];
}
