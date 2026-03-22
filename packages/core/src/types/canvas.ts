export type LayerType = 'normal' | 'reference' | 'tilemap';
export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'addition' | 'subtract';

export interface LayerInfo {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  order: number;
  parentId?: string | null;
  isGroup?: boolean;
  clipping?: boolean;
}

export interface FrameInfo {
  id: string;
  index: number;
  duration: number;
  label?: string;
}

export type AnimationDirection = 'forward' | 'reverse' | 'pingpong';

export interface AnimationTag {
  name: string;
  from: number;
  to: number;
  direction: AnimationDirection;
  repeat: number;
}

export interface CanvasData {
  name: string;
  width: number;
  height: number;
  created: string;
  modified: string;
  palette: string | null;
  layers: LayerInfo[];
  frames: FrameInfo[];
  animationTags: AnimationTag[];
}
