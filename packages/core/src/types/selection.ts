export interface SelectionMask {
  width: number;
  height: number;
  /** Uint8Array where 0 = unselected, 255 = selected. Same dimensions as canvas. */
  data: Uint8Array;
}

export type SelectionShape = 'rect' | 'ellipse' | 'color' | 'all';

export interface SelectionInfo {
  shape: SelectionShape;
  bounds: { x: number; y: number; width: number; height: number } | null;
  pixelCount: number;
  canvas: string;
}

export interface ClipboardData {
  width: number;
  height: number;
  source: string;
  offsetX: number;
  offsetY: number;
  created: string;
}
