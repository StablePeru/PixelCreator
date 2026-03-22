import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createLineTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  let startX = 0, startY = 0, endX = 0, endY = 0;

  return {
    name: 'line',
    label: 'Line',
    shortcut: 'L',
    cursor: 'crosshair',

    onStart(x, y) { active = true; startX = x; startY = y; endX = x; endY = y; },
    onMove(x, y) { if (active) { endX = x; endY = y; } },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      await cb.sendDraw('line', {
        canvas, x1: startX, y1: startY, x2: endX, y2: endY,
        color: cb.getColor(), thickness: cb.getThickness(),
      });
    },

    getPreview(): PreviewShape | null {
      if (!active) return null;
      return { type: 'line', color: cb.getColor(), x1: startX, y1: startY, x2: endX, y2: endY };
    },

    reset() { active = false; },
  };
}
