import type { CanvasData } from '../types/canvas.js';
import type { TemplateData, TemplateLayerDef } from '../types/template.js';
import { generateSequentialId } from '../utils/id-generator.js';

export function createTemplateFromCanvas(canvas: CanvasData): TemplateData {
  const now = new Date().toISOString();
  const layers: TemplateLayerDef[] = canvas.layers.map((l) => ({
    name: l.name,
    type: l.type,
    opacity: l.opacity,
    blendMode: l.blendMode,
  }));

  return {
    name: '',
    description: '',
    width: canvas.width,
    height: canvas.height,
    palette: canvas.palette,
    layers,
    tags: {},
    created: now,
    modified: now,
  };
}

export function applyTemplate(
  template: TemplateData,
  canvasName: string,
  widthOverride?: number,
  heightOverride?: number,
): CanvasData {
  const now = new Date().toISOString();
  const width = widthOverride ?? template.width;
  const height = heightOverride ?? template.height;

  const layers = template.layers.map((tl, i) => ({
    id: generateSequentialId('layer', i + 1),
    name: tl.name,
    type: tl.type,
    visible: true,
    opacity: tl.opacity,
    blendMode: tl.blendMode,
    locked: false,
    order: i,
  }));

  return {
    name: canvasName,
    width,
    height,
    created: now,
    modified: now,
    palette: template.palette,
    layers,
    frames: [
      {
        id: generateSequentialId('frame', 1),
        index: 0,
        duration: 100,
      },
    ],
    animationTags: [],
  };
}
