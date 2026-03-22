import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createCircleTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  let cx = 0, cy = 0, ex = 0, ey = 0;

  return {
    name: 'circle',
    label: 'Circle',
    shortcut: 'C',
    cursor: 'crosshair',

    onStart(x, y) { active = true; cx = x; cy = y; ex = x; ey = y; },
    onMove(x, y) { if (active) { ex = x; ey = y; } },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      const radius = Math.round(Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2));
      if (radius < 1) return;
      await cb.sendDraw('circle', {
        canvas, cx, cy, radius,
        color: cb.getColor(), fill: cb.getFillMode(),
      });
    },

    getPreview(): PreviewShape | null {
      if (!active) return null;
      const r = Math.round(Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2));
      return { type: 'circle', color: cb.getColor(), fill: cb.getFillMode(), cx, cy, r };
    },

    reset() { active = false; },
  };
}
