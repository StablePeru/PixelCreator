import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createPolygonTool(cb: ToolCallbacks): DrawTool {
  const points: Array<{ x: number; y: number }> = [];
  let active = false;

  return {
    name: 'polygon',
    label: 'Polygon',
    shortcut: 'P',
    cursor: 'crosshair',

    onStart(x, y) {
      if (!active) {
        active = true;
        points.length = 0;
      }
      // Double-click detection: if close to first point, close polygon
      if (points.length >= 3) {
        const first = points[0];
        if (Math.abs(x - first.x) <= 1 && Math.abs(y - first.y) <= 1) {
          this.onEnd();
          return;
        }
      }
      points.push({ x, y });
    },

    onMove() {},

    async onEnd() {
      if (!active || points.length < 3) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      await cb.sendDraw('polygon', {
        canvas,
        points: [...points],
        color: cb.getColor(),
        fill: cb.getFillMode(),
        thickness: cb.getThickness(),
      });
      points.length = 0;
    },

    getPreview(): PreviewShape | null {
      if (!active || points.length === 0) return null;
      return { type: 'pixels', color: cb.getColor(), points: [...points] };
    },

    reset() { active = false; points.length = 0; },
  };
}
