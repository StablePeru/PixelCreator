import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createBezierTool(cb: ToolCallbacks): DrawTool {
  const points: Array<{ x: number; y: number }> = [];

  return {
    name: 'bezier',
    label: 'Bezier',
    shortcut: 'N',
    cursor: 'crosshair',

    onStart(x, y) {
      points.push({ x, y });
      // Auto-submit on 4th point (cubic)
      if (points.length >= 4) {
        this.onEnd();
      }
    },

    onMove() {},

    async onEnd() {
      if (points.length < 3) return;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      await cb.sendDraw('bezier', {
        canvas,
        points: [...points.slice(0, 4)],
        color: cb.getColor(),
        thickness: cb.getThickness(),
      });
      points.length = 0;
    },

    getPreview(): PreviewShape | null {
      if (points.length === 0) return null;
      return { type: 'pixels', color: cb.getColor(), points: [...points] };
    },

    reset() { points.length = 0; },
  };
}
