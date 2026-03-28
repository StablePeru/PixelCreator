export type GuideOrientation = 'horizontal' | 'vertical';

export interface GuideInfo {
  id: string;
  orientation: GuideOrientation;
  position: number;
  color?: string;
  locked?: boolean;
}

export interface GuideConfig {
  guides: GuideInfo[];
  snapEnabled: boolean;
  snapThreshold: number;
  visible: boolean;
}

export interface StudioPreferences {
  showGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  snapToGuide: boolean;
  snapThreshold: number;
  defaultCanvasWidth: number;
  defaultCanvasHeight: number;
  defaultBackground: string | null;
}
