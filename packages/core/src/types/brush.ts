export type BrushShape = 'circle' | 'square' | 'diamond' | 'custom';

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'both' | 'radial';

export type DitherMode = 'none' | 'ordered-2x2' | 'ordered-4x4' | 'ordered-8x8';

export interface BrushPreset {
  id: string;
  name: string;
  size: number;
  shape: BrushShape;
  pattern?: boolean[][];
  spacing: number;
  opacity: number;
  pixelPerfect: boolean;
  ditherMode?: DitherMode;
  paletteLock?: boolean;
}

export interface SymmetryConfig {
  mode: SymmetryMode;
  axisX?: number;
  axisY?: number;
  radialSegments?: number;
  radialCenterX?: number;
  radialCenterY?: number;
}

export interface BrushStroke {
  points: Array<{ x: number; y: number }>;
  brushId: string;
  color: string;
  symmetry: SymmetryConfig;
}
