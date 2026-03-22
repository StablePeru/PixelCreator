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

describe('Transform Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-transform-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 6 --name sprite', tmpDir);
    pxc('draw:rect --canvas sprite --x 0 --y 0 --width 2 --height 1 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('canvas:flip', () => {
    it('flips canvas horizontally', () => {
      const result = pxcJSON('canvas:flip --canvas sprite --direction horizontal', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.direction).toBe('horizontal');
      expect(result.result.layersProcessed).toBe(1);
      expect(result.result.framesProcessed).toBe(1);
      // Red was at (0,0) and (1,0), after flip should be at (6,0) and (7,0)
      const sample = pxcJSON('draw:sample --canvas sprite --x 7 --y 0', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });

    it('flips canvas vertically', () => {
      const result = pxcJSON('canvas:flip --canvas sprite --direction vertical', tmpDir);
      expect(result.success).toBe(true);
      // Red was at row 0, after vertical flip should be at row 5
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 5', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });

    it('skips locked layers when flipping whole canvas', () => {
      pxc('layer:add --canvas sprite --name locked-layer', tmpDir);
      pxc('layer:edit --canvas sprite --layer layer-002 --locked true', tmpDir);
      const result = pxcJSON('canvas:flip --canvas sprite --direction horizontal', tmpDir);
      expect(result.result.layersProcessed).toBe(1); // only unlocked layer
    });

    it('errors when targeting a locked layer', () => {
      pxc('layer:edit --canvas sprite --layer layer-001 --locked true', tmpDir);
      expect(() => {
        pxc('canvas:flip --canvas sprite --direction horizontal --layer layer-001', tmpDir);
      }).toThrow();
    });
  });

  describe('canvas:rotate', () => {
    it('rotates 90° and swaps dimensions', () => {
      const result = pxcJSON('canvas:rotate --canvas sprite --angle 90', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.oldWidth).toBe(8);
      expect(result.result.oldHeight).toBe(6);
      expect(result.result.newWidth).toBe(6);
      expect(result.result.newHeight).toBe(8);
    });

    it('rotates 180° and keeps dimensions', () => {
      const result = pxcJSON('canvas:rotate --canvas sprite --angle 180', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newWidth).toBe(8);
      expect(result.result.newHeight).toBe(6);
    });

    it('errors on 90° single layer in non-square canvas', () => {
      expect(() => {
        pxc('canvas:rotate --canvas sprite --angle 90 --layer layer-001', tmpDir);
      }).toThrow();
    });
  });

  describe('canvas:scale', () => {
    it('scales by factor', () => {
      const result = pxcJSON('canvas:scale --canvas sprite --factor 2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newWidth).toBe(16);
      expect(result.result.newHeight).toBe(12);
      expect(result.result.method).toBe('factor');
      // Red pixel should be scaled
      const sample = pxcJSON('draw:sample --canvas sprite --x 1 --y 0', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });

    it('scales to specific dimensions', () => {
      const result = pxcJSON('canvas:scale --canvas sprite --width 4 --height 3', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newWidth).toBe(4);
      expect(result.result.newHeight).toBe(3);
      expect(result.result.method).toBe('dimensions');
    });

    it('errors when using both factor and dimensions', () => {
      expect(() => {
        pxc('canvas:scale --canvas sprite --factor 2 --width 4 --height 3', tmpDir);
      }).toThrow();
    });

    it('errors with no scaling option', () => {
      expect(() => {
        pxc('canvas:scale --canvas sprite', tmpDir);
      }).toThrow();
    });
  });
});

describe('Layer Transform Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-layer-transform-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite', tmpDir);
    pxc('draw:rect --canvas sprite --x 0 --y 0 --width 2 --height 1 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:flip', () => {
    it('flips a layer horizontally', () => {
      const result = pxcJSON('layer:flip --canvas sprite --layer layer-001 --direction horizontal', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.framesProcessed).toBe(1);
      const sample = pxcJSON('draw:sample --canvas sprite --x 7 --y 0', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });

    it('errors on locked layer', () => {
      pxc('layer:edit --canvas sprite --layer layer-001 --locked true', tmpDir);
      expect(() => {
        pxc('layer:flip --canvas sprite --layer layer-001 --direction horizontal', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:rotate', () => {
    it('rotates layer 180° in square canvas', () => {
      const result = pxcJSON('layer:rotate --canvas sprite --layer layer-001 --angle 180', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.angle).toBe(180);
      // Red was at (0,0) and (1,0), after 180° → (7,7) and (6,7)
      const sample = pxcJSON('draw:sample --canvas sprite --x 7 --y 7', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });

    it('rotates layer 90° in square canvas', () => {
      const result = pxcJSON('layer:rotate --canvas sprite --layer layer-001 --angle 90', tmpDir);
      expect(result.success).toBe(true);
    });

    it('errors on 90° rotate in non-square canvas', () => {
      pxc('canvas:create --width 8 --height 6 --name rect', tmpDir);
      expect(() => {
        pxc('layer:rotate --canvas rect --layer layer-001 --angle 90', tmpDir);
      }).toThrow();
    });
  });
});
