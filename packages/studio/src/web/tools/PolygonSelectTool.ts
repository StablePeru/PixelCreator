import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createPolygonSelectTool(cb: ToolCallbacks): DrawTool {
  const vertices: Array<{ x: number; y: number }> = [];
  let active = false;

  return {
    name: 'polyselect',
    label: 'Poly Select',
    shortcut: 'Y',
    cursor: 'crosshair',

    onStart(x, y) {
      if (!active) {
        active = true;
        vertices.length = 0;
      }
      // Close polygon when clicking near first vertex
      if (vertices.length >= 3) {
        const first = vertices[0];
        if (Math.abs(x - first.x) <= 1 && Math.abs(y - first.y) <= 1) {
          this.onEnd();
          return;
        }
      }
      vertices.push({ x, y });
    },

    onMove() {},

    async onEnd() {
      if (!active || vertices.length < 3) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) {
        vertices.length = 0;
        return;
      }
      await fetch('/api/select/polygon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, points: [...vertices] }),
      });
      vertices.length = 0;
    },

    getPreview(): PreviewShape | null {
      if (!active || vertices.length === 0) return null;
      return { type: 'pixels', color: '#ffffff', points: [...vertices] };
    },

    reset() {
      active = false;
      vertices.length = 0;
    },
  };
}
