import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createGradientTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

  return {
    name: 'gradient',
    label: 'Gradient',
    shortcut: 'D',
    cursor: 'crosshair',

    onStart(x, y) { active = true; x1 = x; y1 = y; x2 = x; y2 = y; },
    onMove(x, y) { if (active) { x2 = x; y2 = y; } },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      await cb.sendDraw('gradient', {
        canvas, x1, y1, x2, y2,
        from: cb.getColor(),
        to: '#ffffff', // BG color would need separate callback
      });
    },

    getPreview(): PreviewShape | null {
      if (!active) return null;
      return { type: 'line', color: cb.getColor(), x1, y1, x2, y2 };
    },

    reset() { active = false; },
  };
}
