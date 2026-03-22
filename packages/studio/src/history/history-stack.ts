import { readLayerFrame, writeLayerFrame } from '@pixelcreator/core';
import type { PixelBuffer } from '@pixelcreator/core';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  operation: string;
  canvasName: string;
  layerId: string;
  frameId: string;
  beforeBuffer: PixelBuffer;
}

export class HistoryStack {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  push(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
    const full: HistoryEntry = {
      ...entry,
      id: `hist-${Date.now().toString(36)}`,
      timestamp: Date.now(),
    };

    this.undoStack.push(full);
    this.redoStack.length = 0; // New action clears redo

    // Evict oldest if over limit
    while (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    return full;
  }

  undo(projectPath: string): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    // Read current state (this becomes the redo "before")
    const currentBuffer = readLayerFrame(
      projectPath, entry.canvasName, entry.layerId, entry.frameId,
    );

    // Restore the before state
    writeLayerFrame(
      projectPath, entry.canvasName, entry.layerId, entry.frameId, entry.beforeBuffer,
    );

    // Push to redo with current state as beforeBuffer
    this.redoStack.push({
      ...entry,
      beforeBuffer: currentBuffer,
    });

    return entry;
  }

  redo(projectPath: string): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    // Read current state
    const currentBuffer = readLayerFrame(
      projectPath, entry.canvasName, entry.layerId, entry.frameId,
    );

    // Restore the redo state (entry.beforeBuffer is the "after" from the original operation)
    writeLayerFrame(
      projectPath, entry.canvasName, entry.layerId, entry.frameId, entry.beforeBuffer,
    );

    // Push back to undo
    this.undoStack.push({
      ...entry,
      beforeBuffer: currentBuffer,
    });

    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  status() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
