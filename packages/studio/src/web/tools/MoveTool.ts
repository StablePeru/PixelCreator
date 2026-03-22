import type { DrawTool, PreviewShape, ToolCallbacks } from './types';

export function createMoveTool(cb: ToolCallbacks): DrawTool {
  let active = false;
  let startX = 0, startY = 0, curX = 0, curY = 0;

  return {
    name: 'move',
    label: 'Move',
    shortcut: 'V',
    cursor: 'move',

    onStart(x, y) {
      active = true;
      startX = x; startY = y;
      curX = x; curY = y;
    },

    onMove(x, y) {
      if (!active) return;
      curX = x; curY = y;
    },

    async onEnd() {
      if (!active) return;
      active = false;
      const canvas = cb.getCanvasName();
      if (!canvas) return;
      const dx = curX - startX;
      const dy = curY - startY;
      if (dx === 0 && dy === 0) return;

      // Cut selection, paste at offset
      await fetch('/api/clipboard/cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas }),
      });
      await fetch('/api/clipboard/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, x: dx, y: dy }),
      });
    },

    getPreview(): PreviewShape | null {
      if (!active) return null;
      const dx = curX - startX;
      const dy = curY - startY;
      return { type: 'line', color: '#ffffff80', x1: startX, y1: startY, x2: curX, y2: curY };
    },

    reset() { active = false; },
  };
}
