import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createEraserTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  const pixels: Array<{ x: number; y: number }> = [];

  return {
    name: 'eraser',
    label: 'Eraser',
    shortcut: 'E',
    cursor: 'crosshair',

    onStart(x, y) {
      active = true;
      pixels.length = 0;
      pixels.push({ x, y });
    },

    onMove(x, y) {
      if (!active) return;
      const last = pixels[pixels.length - 1];
      if (last && last.x === x && last.y === y) return;
      pixels.push({ x, y });
    },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas || pixels.length === 0) return;
      const operations = pixels.map(p => ({ type: 'pixel', canvas, x: p.x, y: p.y, color: '#00000000' }));
      await cb.sendDraw('batch', { operations });
      pixels.length = 0;
    },

    getPreview(): PreviewShape | null {
      if (!active || pixels.length === 0) return null;
      return { type: 'pixels', color: '#ff000080', points: [...pixels] };
    },

    reset() { active = false; pixels.length = 0; },
  };
}
