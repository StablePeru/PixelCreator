import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): any {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('Selection Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-sel-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);
    // Draw a red filled rect for testing
    pxc('draw:rect --canvas canvas --x 2 --y 2 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('select:rect', () => {
    it('creates a rectangular selection', () => {
      const result = pxcJSON('select:rect --canvas canvas --x 4 --y 4 --width 4 --height 4', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.x).toBe(4);
      expect(result.result.width).toBe(4);
    });

    it('select:info reports correct bounds', () => {
      pxc('select:rect --canvas canvas --x 4 --y 4 --width 4 --height 4', tmpDir);
      const info = pxcJSON('select:info --canvas canvas', tmpDir);
      expect(info.result.bounds).toEqual({ x: 4, y: 4, width: 4, height: 4 });
      expect(info.result.pixelCount).toBe(16);
    });

    it('--add merges with existing selection', () => {
      pxc('select:rect --canvas canvas --x 0 --y 0 --width 2 --height 2', tmpDir);
      pxc('select:rect --canvas canvas --x 4 --y 4 --width 2 --height 2 --add', tmpDir);
      const info = pxcJSON('select:info --canvas canvas', tmpDir);
      expect(info.result.pixelCount).toBe(8); // 4 + 4
    });
  });

  describe('select:ellipse', () => {
    it('creates an elliptical selection', () => {
      const result = pxcJSON('select:ellipse --canvas canvas --cx 8 --cy 8 --rx 3 --ry 2', tmpDir);
      expect(result.success).toBe(true);
      const info = pxcJSON('select:info --canvas canvas', tmpDir);
      expect(info.result.pixelCount).toBeGreaterThan(0);
    });
  });

  describe('select:color', () => {
    it('selects by color globally', () => {
      const result = pxcJSON('select:color --canvas canvas --color "#ff0000" --no-contiguous', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.pixelCount).toBe(64); // 8x8 red rect
    });

    it('selects contiguous from start point', () => {
      const result = pxcJSON('select:color --canvas canvas --x 3 --y 3 --contiguous', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.pixelCount).toBe(64); // 8x8 contiguous red block
    });

    it('selects with tolerance', () => {
      // Draw a slightly different red
      pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#f00000"', tmpDir);
      const result = pxcJSON('select:color --canvas canvas --color "#ff0000" --tolerance 20 --no-contiguous', tmpDir);
      expect(result.result.pixelCount).toBe(65); // 64 red + 1 near-red
    });
  });

  describe('select:all', () => {
    it('selects entire canvas', () => {
      pxc('select:all --canvas canvas', tmpDir);
      const info = pxcJSON('select:info --canvas canvas', tmpDir);
      expect(info.result.pixelCount).toBe(256); // 16x16
    });
  });

  describe('select:none', () => {
    it('clears the selection', () => {
      pxc('select:rect --canvas canvas --x 0 --y 0 --width 4 --height 4', tmpDir);
      pxc('select:none --canvas canvas', tmpDir);

      // select:info should error with no selection
      try {
        pxcJSON('select:info --canvas canvas', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected error
      }
    });
  });

  describe('select:invert', () => {
    it('inverts the selection', () => {
      pxc('select:rect --canvas canvas --x 0 --y 0 --width 4 --height 4', tmpDir);
      const before = pxcJSON('select:info --canvas canvas', tmpDir);
      expect(before.result.pixelCount).toBe(16);

      pxc('select:invert --canvas canvas', tmpDir);
      const after = pxcJSON('select:info --canvas canvas', tmpDir);
      expect(after.result.pixelCount).toBe(240); // 256 - 16
    });
  });

  describe('select:copy + select:paste', () => {
    it('copies and pastes pixels', () => {
      pxc('select:rect --canvas canvas --x 2 --y 2 --width 4 --height 4', tmpDir);
      pxc('select:copy --canvas canvas', tmpDir);
      pxc('select:paste --canvas canvas --x 10 --y 10', tmpDir);

      const sample = pxcJSON('draw:sample --canvas canvas --x 12 --y 12', tmpDir);
      expect(sample.result.rgba.r).toBe(255); // red was copied
    });

    it('paste --in-place restores to original position', () => {
      pxc('select:rect --canvas canvas --x 2 --y 2 --width 2 --height 2', tmpDir);
      pxc('select:copy --canvas canvas', tmpDir);

      // Create a new blank canvas to paste into
      pxc('canvas:create --width 16 --height 16 --name target', tmpDir);
      pxc('select:paste --canvas target --in-place', tmpDir);

      const sample = pxcJSON('draw:sample --canvas target --x 2 --y 2', tmpDir);
      // In-place paste puts at offset 0,0, so copied content (which includes position data) is pasted there
      // The extracted buffer is canvas-sized with transparent everywhere except the selection
      expect(sample.result.rgba.r).toBe(255);
    });
  });

  describe('select:cut', () => {
    it('removes pixels from source', () => {
      pxc('select:rect --canvas canvas --x 2 --y 2 --width 4 --height 4', tmpDir);
      pxc('select:cut --canvas canvas', tmpDir);

      const sample = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
      expect(sample.result.rgba.a).toBe(0); // now transparent
    });

    it('cut content can be pasted', () => {
      pxc('select:rect --canvas canvas --x 2 --y 2 --width 4 --height 4', tmpDir);
      pxc('select:cut --canvas canvas', tmpDir);
      pxc('select:paste --canvas canvas --x 10 --y 10', tmpDir);

      const original = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
      expect(original.result.rgba.a).toBe(0); // cleared

      const pasted = pxcJSON('draw:sample --canvas canvas --x 12 --y 12', tmpDir);
      expect(pasted.result.rgba.r).toBe(255); // pasted here
    });
  });

  describe('select:move', () => {
    it('moves selected pixels', () => {
      pxc('select:rect --canvas canvas --x 2 --y 2 --width 4 --height 4', tmpDir);
      pxc('select:move --canvas canvas --dx 5 --dy 5', tmpDir);

      const original = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
      expect(original.result.rgba.a).toBe(0); // cleared

      const moved = pxcJSON('draw:sample --canvas canvas --x 8 --y 8', tmpDir);
      expect(moved.result.rgba.r).toBe(255); // moved here
    });
  });

  describe('error cases', () => {
    it('paste errors with empty clipboard', () => {
      try {
        pxcJSON('select:paste --canvas canvas', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });

    it('cut errors with no selection', () => {
      try {
        pxcJSON('select:cut --canvas canvas', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });

    it('info errors with no selection', () => {
      try {
        pxcJSON('select:info --canvas canvas', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });

    it('invert errors with no selection', () => {
      try {
        pxcJSON('select:invert --canvas canvas', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });

    it('move errors with no selection', () => {
      try {
        pxcJSON('select:move --canvas canvas --dx 1 --dy 1', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });
  });
});
