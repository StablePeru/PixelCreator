import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createMarqueeRectTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

  return {
    name: 'marquee',
    label: 'Marquee',
    shortcut: 'M',
    cursor: 'crosshair',

    onStart(x, y) { active = true; x1 = x; y1 = y; x2 = x; y2 = y; },
    onMove(x, y) { if (active) { x2 = x; y2 = y; } },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1) + 1, rh = Math.abs(y2 - y1) + 1;
      if (rw < 1 || rh < 1) return;
      await fetch('/api/select/rect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, x: rx, y: ry, width: rw, height: rh }),
      });
    },

    getPreview(): PreviewShape | null {
      if (!active) return null;
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      return {
        type: 'rect', color: '#ffffff',
        x: rx, y: ry, w: Math.abs(x2 - x1) + 1, h: Math.abs(y2 - y1) + 1,
      };
    },

    reset() { active = false; },
  };
}
