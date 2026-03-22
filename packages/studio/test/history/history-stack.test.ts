import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { HistoryStack } from '../../src/history/history-stack.js';
import {
  initProjectStructure,
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  createEmptyBuffer,
  writeLayerFrame,
  readLayerFrame,
  drawPixel,
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setupCanvas() {
  const canvas: CanvasData = {
    name: 'test',
    width: 8,
    height: 8,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'test', canvas);
  writeCanvasJSON(projectPath, 'test', canvas);
  writeLayerFrame(projectPath, 'test', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));
  const project = readProjectJSON(projectPath);
  project.canvases.push('test');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-history-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setupCanvas();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('HistoryStack', () => {
  it('starts empty', () => {
    const stack = new HistoryStack();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.status()).toEqual({ canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 });
  });

  it('push makes canUndo true', () => {
    const stack = new HistoryStack();
    const buf = createEmptyBuffer(8, 8);
    stack.push({ operation: 'pixel', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: buf });
    expect(stack.canUndo()).toBe(true);
    expect(stack.status().undoCount).toBe(1);
  });

  it('undo restores previous buffer', () => {
    const stack = new HistoryStack();

    // Read buffer, draw pixel, save, push to history
    const buf = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    const before = buf.clone();
    drawPixel(buf, 3, 3, { r: 255, g: 0, b: 0, a: 255 });
    writeLayerFrame(projectPath, 'test', 'layer-001', 'frame-001', buf);
    stack.push({ operation: 'pixel', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: before });

    // Verify pixel was drawn
    const afterDraw = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    expect(afterDraw.getPixel(3, 3).r).toBe(255);

    // Undo
    const entry = stack.undo(projectPath);
    expect(entry).not.toBeNull();

    // Verify pixel is gone
    const afterUndo = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    expect(afterUndo.getPixel(3, 3).r).toBe(0);
    expect(afterUndo.getPixel(3, 3).a).toBe(0);
  });

  it('redo restores the operation', () => {
    const stack = new HistoryStack();

    const buf = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    const before = buf.clone();
    drawPixel(buf, 5, 5, { r: 0, g: 255, b: 0, a: 255 });
    writeLayerFrame(projectPath, 'test', 'layer-001', 'frame-001', buf);
    stack.push({ operation: 'pixel', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: before });

    // Undo
    stack.undo(projectPath);
    expect(stack.canRedo()).toBe(true);

    // Redo
    stack.redo(projectPath);

    // Pixel is back
    const afterRedo = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    expect(afterRedo.getPixel(5, 5).g).toBe(255);
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('push clears redo stack', () => {
    const stack = new HistoryStack();
    const buf = createEmptyBuffer(8, 8);

    stack.push({ operation: 'a', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: buf });
    stack.undo(projectPath);
    expect(stack.canRedo()).toBe(true);

    // New action
    stack.push({ operation: 'b', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: buf });
    expect(stack.canRedo()).toBe(false);
  });

  it('undo on empty returns null', () => {
    const stack = new HistoryStack();
    expect(stack.undo(projectPath)).toBeNull();
  });

  it('redo on empty returns null', () => {
    const stack = new HistoryStack();
    expect(stack.redo(projectPath)).toBeNull();
  });

  it('respects maxSize', () => {
    const stack = new HistoryStack(3);
    const buf = createEmptyBuffer(8, 8);

    for (let i = 0; i < 5; i++) {
      stack.push({ operation: `op${i}`, canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: buf });
    }

    expect(stack.status().undoCount).toBe(3);
  });

  it('clear empties both stacks', () => {
    const stack = new HistoryStack();
    const buf = createEmptyBuffer(8, 8);
    stack.push({ operation: 'a', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: buf });
    stack.clear();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });

  it('multiple undo/redo chain works', () => {
    const stack = new HistoryStack();

    // Draw 3 pixels at different positions
    for (let i = 0; i < 3; i++) {
      const buf = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
      const before = buf.clone();
      drawPixel(buf, i, 0, { r: 255, g: 0, b: 0, a: 255 });
      writeLayerFrame(projectPath, 'test', 'layer-001', 'frame-001', buf);
      stack.push({ operation: 'pixel', canvasName: 'test', layerId: 'layer-001', frameId: 'frame-001', beforeBuffer: before });
    }

    expect(stack.status().undoCount).toBe(3);

    // Undo all 3
    stack.undo(projectPath);
    stack.undo(projectPath);
    stack.undo(projectPath);

    // All pixels should be gone
    const clean = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    expect(clean.getPixel(0, 0).a).toBe(0);
    expect(clean.getPixel(1, 0).a).toBe(0);
    expect(clean.getPixel(2, 0).a).toBe(0);
    expect(stack.status().redoCount).toBe(3);

    // Redo all 3
    stack.redo(projectPath);
    stack.redo(projectPath);
    stack.redo(projectPath);

    const restored = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
    expect(restored.getPixel(0, 0).r).toBe(255);
    expect(restored.getPixel(1, 0).r).toBe(255);
    expect(restored.getPixel(2, 0).r).toBe(255);
  });
});
