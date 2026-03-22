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

export interface PaletteRamp {
  name: string;
  indices: number[];
}

export interface PaletteData {
  name: string;
  description: string;
  colors: PaletteColor[];
  constraints: PaletteConstraints;
  ramps: PaletteRamp[];
}
