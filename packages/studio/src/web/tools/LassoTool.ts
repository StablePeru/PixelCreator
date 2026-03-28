import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createLassoTool(cb: ToolCallbacks): DrawTool {
  const points: Array<{ x: number; y: number }> = [];
  let active = false;

  return {
    name: 'lasso',
    label: 'Lasso',
    shortcut: 'L',
    cursor: 'crosshair',

    onStart(x, y) {
      active = true;
      points.length = 0;
      points.push({ x, y });
    },

    onMove(x, y) {
      if (!active) return;
      const last = points[points.length - 1];
      if (last.x !== x || last.y !== y) {
        points.push({ x, y });
      }
    },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas || points.length < 3) {
        points.length = 0;
        return;
      }
      await fetch('/api/select/lasso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, points: [...points] }),
      });
      points.length = 0;
    },

    getPreview(): PreviewShape | null {
      if (!active || points.length === 0) return null;
      return { type: 'pixels', color: '#ffffff', points: [...points] };
    },

    reset() {
      active = false;
      points.length = 0;
    },
  };
}
