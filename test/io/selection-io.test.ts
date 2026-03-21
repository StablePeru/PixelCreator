import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readSelection,
  writeSelection,
  deleteSelection,
  readClipboard,
  writeClipboard,
  clearClipboard,
} from '../../src/io/project-io.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { createRectSelection, getSelectionPixelCount } from '../../src/core/selection-engine.js';
import type { ClipboardData } from '../../src/types/selection.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };

describe('selection I/O', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-sel-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    fs.mkdirSync(projectPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('selection read/write', () => {
    it('round-trips a selection mask', () => {
      const mask = createRectSelection(8, 8, 2, 2, 4, 3);
      writeSelection(projectPath, 'player', mask);

      const restored = readSelection(projectPath, 'player');
      expect(restored).not.toBeNull();
      expect(restored!.width).toBe(8);
      expect(restored!.height).toBe(8);
      expect(getSelectionPixelCount(restored!)).toBe(12);
    });

    it('returns null when no selection exists', () => {
      const result = readSelection(projectPath, 'nonexistent');
      expect(result).toBeNull();
    });

    it('deletes a selection', () => {
      const mask = createRectSelection(4, 4, 0, 0, 2, 2);
      writeSelection(projectPath, 'player', mask);
      expect(readSelection(projectPath, 'player')).not.toBeNull();

      deleteSelection(projectPath, 'player');
      expect(readSelection(projectPath, 'player')).toBeNull();
    });

    it('delete is safe when no selection exists', () => {
      deleteSelection(projectPath, 'nonexistent');
      // Should not throw
    });
  });

  describe('clipboard read/write', () => {
    it('round-trips clipboard data and content', () => {
      const buf = new PixelBuffer(4, 4);
      buf.setPixel(1, 1, RED);

      const data: ClipboardData = {
        width: 4,
        height: 4,
        source: 'player',
        offsetX: 2,
        offsetY: 3,
        created: new Date().toISOString(),
      };

      writeClipboard(projectPath, data, buf);
      const result = readClipboard(projectPath);

      expect(result).not.toBeNull();
      expect(result!.data.source).toBe('player');
      expect(result!.data.offsetX).toBe(2);
      expect(result!.data.offsetY).toBe(3);
      expect(result!.buffer.getPixel(1, 1)).toEqual(RED);
    });

    it('returns null when clipboard is empty', () => {
      expect(readClipboard(projectPath)).toBeNull();
    });

    it('clears clipboard', () => {
      const buf = new PixelBuffer(2, 2);
      const data: ClipboardData = {
        width: 2,
        height: 2,
        source: 'test',
        offsetX: 0,
        offsetY: 0,
        created: new Date().toISOString(),
      };

      writeClipboard(projectPath, data, buf);
      expect(readClipboard(projectPath)).not.toBeNull();

      clearClipboard(projectPath);
      expect(readClipboard(projectPath)).toBeNull();
    });

    it('clear is safe when clipboard does not exist', () => {
      clearClipboard(projectPath);
      // Should not throw
    });
  });
});
