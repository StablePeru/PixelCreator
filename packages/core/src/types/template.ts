import type { LayerType, BlendMode } from './canvas.js';

export interface TemplateLayerDef {
  name: string;
  type: LayerType;
  opacity: number;
  blendMode: BlendMode;
}

export interface TemplateData {
  name: string;
  description: string;
  width: number;
  height: number;
  palette: string | null;
  layers: TemplateLayerDef[];
  tags: Record<string, string[]>;
  created: string;
  modified: string;
}
