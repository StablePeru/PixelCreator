import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 10000 });
}

function pxcJSON(args: string, cwd: string): any {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('Canvas Utilities & draw:sample', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-canvas-util-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite', tmpDir);
    pxc('draw:rect --canvas sprite --x 2 --y 2 --width 4 --height 4 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('draw:sample', () => {
    it('samples a colored pixel', () => {
      const result = pxcJSON('draw:sample --canvas sprite --x 3 --y 3', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.color).toBe('#ff0000');
      expect(result.result.rgba).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });

    it('samples a transparent pixel', () => {
      const result = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.rgba.a).toBe(0);
    });

    it('samples with --flatten flag', () => {
      const result = pxcJSON('draw:sample --canvas sprite --x 3 --y 3 --flatten', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.flattened).toBe(true);
      expect(result.result.color).toBe('#ff0000');
    });

    it('errors on out-of-bounds coordinates', () => {
      expect(() => {
        pxc('draw:sample --canvas sprite --x 10 --y 10', tmpDir);
      }).toThrow();
    });

    it('errors with --flatten and --layer together', () => {
      expect(() => {
        pxc('draw:sample --canvas sprite --x 0 --y 0 --flatten --layer layer-001', tmpDir);
      }).toThrow();
    });
  });

  describe('canvas:rename', () => {
    it('renames a canvas', () => {
      const result = pxcJSON('canvas:rename --canvas sprite --name hero', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.oldName).toBe('sprite');
      expect(result.result.newName).toBe('hero');
    });

    it('updates canvas list after rename', () => {
      pxc('canvas:rename --canvas sprite --name hero', tmpDir);
      const list = pxcJSON('canvas:list', tmpDir);
      expect(list.result.canvases[0].name).toBe('hero');
    });

    it('errors for non-existent canvas', () => {
      expect(() => {
        pxc('canvas:rename --canvas nonexistent --name hero', tmpDir);
      }).toThrow();
    });

    it('errors when target name already exists', () => {
      pxc('canvas:create --width 4 --height 4 --name other', tmpDir);
      expect(() => {
        pxc('canvas:rename --canvas sprite --name other', tmpDir);
      }).toThrow();
    });
  });

  describe('canvas:clone', () => {
    it('clones a canvas', () => {
      const result = pxcJSON('canvas:clone --canvas sprite --name sprite-copy', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.source).toBe('sprite');
      expect(result.result.clone).toBe('sprite-copy');
      expect(result.result.width).toBe(8);
      expect(result.result.height).toBe(8);
    });

    it('cloned canvas has same pixel data', () => {
      pxc('canvas:clone --canvas sprite --name cloned', tmpDir);
      const sample = pxcJSON('draw:sample --canvas cloned --x 3 --y 3', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });

    it('appears in canvas list', () => {
      pxc('canvas:clone --canvas sprite --name cloned', tmpDir);
      const list = pxcJSON('canvas:list', tmpDir);
      expect(list.result.canvases).toHaveLength(2);
    });
  });

  describe('canvas:stats', () => {
    it('returns pixel statistics', () => {
      const result = pxcJSON('canvas:stats --canvas sprite', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.width).toBe(8);
      expect(result.result.height).toBe(8);
      expect(result.result.totalPixels).toBe(64);
      expect(result.result.opaquePixels).toBe(16); // 4x4 red rect
      expect(result.result.transparentPixels).toBe(48);
      expect(result.result.uniqueColors).toBe(1);
    });

    it('includes color distribution', () => {
      const result = pxcJSON('canvas:stats --canvas sprite', tmpDir);
      expect(result.result.colorDistribution.length).toBeGreaterThan(0);
      expect(result.result.colorDistribution[0].color).toBe('#ff0000');
      expect(result.result.colorDistribution[0].count).toBe(16);
    });
  });

  describe('canvas:crop', () => {
    it('crops to content bounds', () => {
      const result = pxcJSON('canvas:crop --canvas sprite', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.oldWidth).toBe(8);
      expect(result.result.oldHeight).toBe(8);
      expect(result.result.newWidth).toBe(4);
      expect(result.result.newHeight).toBe(4);
    });

    it('respects padding', () => {
      const result = pxcJSON('canvas:crop --canvas sprite --padding 1', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newWidth).toBe(6);
      expect(result.result.newHeight).toBe(6);
    });

    it('errors on fully transparent canvas', () => {
      pxc('canvas:create --width 4 --height 4 --name empty', tmpDir);
      expect(() => {
        pxc('canvas:crop --canvas empty', tmpDir);
      }).toThrow();
    });

    it('preserves pixel data after crop', () => {
      pxc('canvas:crop --canvas sprite', tmpDir);
      // After cropping 8x8 to 4x4, the red rect starts at (0,0)
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      expect(sample.result.color).toBe('#ff0000');
    });
  });
});
