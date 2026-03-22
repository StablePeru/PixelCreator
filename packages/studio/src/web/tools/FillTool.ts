import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createFillTool(cb: ToolCallbacks): DrawTool {
  return {
    name: 'fill',
    label: 'Fill',
    shortcut: 'G',
    cursor: 'crosshair',

    onStart(x, y) {
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      cb.sendDraw('fill', { canvas, x, y, color: cb.getColor() });
    },

    onMove() {},
    async onEnd() {},
    getPreview(): PreviewShape | null { return null; },
    reset() {},
  };
}
