import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createMagicWandTool(cb: ToolCallbacks): DrawTool {
  return {
    name: 'wand',
    label: 'Wand',
    shortcut: 'W',
    cursor: 'crosshair',

    onStart(x, y) {
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      fetch('/api/select/color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, x, y, tolerance: 0, contiguous: true }),
      });
    },

    onMove() {},
    async onEnd() {},
    getPreview(): PreviewShape | null { return null; },
    reset() {},
  };
}
