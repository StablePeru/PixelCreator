export type LayerType = 'normal' | 'reference' | 'tilemap';
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'addition'
  | 'subtract';

export type EffectType = 'drop-shadow' | 'outer-glow' | 'outline' | 'color-overlay';

export interface DropShadowParams {
  offsetX: number;
  offsetY: number;
  color: string;
  blur: number;
  opacity: number;
}

export interface OuterGlowParams {
  color: string;
  radius: number;
  intensity: number;
}

export interface OutlineParams {
  color: string;
  thickness: number;
  position: 'outside' | 'inside' | 'center';
}

export interface ColorOverlayParams {
  color: string;
  opacity: number;
  blendMode: BlendMode;
}

export type EffectParams = DropShadowParams | OuterGlowParams | OutlineParams | ColorOverlayParams;

export interface LayerEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: EffectParams;
}

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
  referenceSource?: string;
  effects?: LayerEffect[];
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

export type BatchFrameTransform =
  | 'flip-h'
  | 'flip-v'
  | 'rotate-90'
  | 'rotate-180'
  | 'rotate-270'
  | 'brightness'
  | 'contrast'
  | 'invert'
  | 'desaturate'
  | 'hue-shift'
  | 'posterize';

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
  symmetry?: import('./brush.js').SymmetryConfig;
  guides?: import('./guide.js').GuideConfig;
}
