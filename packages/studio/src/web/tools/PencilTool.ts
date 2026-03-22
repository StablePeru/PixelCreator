import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createPencilTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  const pixels: Array<{ x: number; y: number }> = [];

  return {
    name: 'pencil',
    label: 'Pencil',
    shortcut: 'B',
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
      const color = cb.getColor();
      // Batch all pixels in a single API call
      const operations = pixels.map(p => ({ type: 'pixel', canvas, x: p.x, y: p.y, color }));
      await cb.sendDraw('batch', { operations });
      pixels.length = 0;
    },

    getPreview(): PreviewShape | null {
      if (!active || pixels.length === 0) return null;
      return { type: 'pixels', color: cb.getColor(), points: [...pixels] };
    },

    reset() { active = false; pixels.length = 0; },
  };
}
