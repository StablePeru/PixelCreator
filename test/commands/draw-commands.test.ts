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

describe('Draw Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-draw-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('draw:pixel', () => {
    it('sets a pixel and can be sampled', () => {
      pxc('draw:pixel --canvas canvas --x 3 --y 4 --color "#ff0000"', tmpDir);
      const sample = pxcJSON('draw:sample --canvas canvas --x 3 --y 4', tmpDir);
      expect(sample.result.rgba.r).toBe(255);
      expect(sample.result.rgba.g).toBe(0);
      expect(sample.result.rgba.b).toBe(0);
    });
  });

  describe('draw:line', () => {
    it('draws a horizontal line', () => {
      const result = pxcJSON('draw:line --canvas canvas --x1 0 --y1 0 --x2 7 --y2 0 --color "#00ff00"', tmpDir);
      expect(result.success).toBe(true);
      const sample = pxcJSON('draw:sample --canvas canvas --x 4 --y 0', tmpDir);
      expect(sample.result.rgba.g).toBe(255);
    });

    it('draws a diagonal line', () => {
      pxc('draw:line --canvas canvas --x1 0 --y1 0 --x2 7 --y2 7 --color "#0000ff"', tmpDir);
      const sample = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
      expect(sample.result.rgba.b).toBe(255);
    });
  });

  describe('draw:rect', () => {
    it('draws a filled rectangle', () => {
      pxc('draw:rect --canvas canvas --x 1 --y 1 --width 3 --height 3 --color "#ff0000" --fill', tmpDir);
      const inside = pxcJSON('draw:sample --canvas canvas --x 2 --y 2', tmpDir);
      expect(inside.result.rgba.r).toBe(255);
      const outside = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
      expect(outside.result.rgba.a).toBe(0);
    });

    it('draws an outline rectangle', () => {
      pxc('draw:rect --canvas canvas --x 1 --y 1 --width 4 --height 4 --color "#00ff00"', tmpDir);
      const edge = pxcJSON('draw:sample --canvas canvas --x 1 --y 1', tmpDir);
      expect(edge.result.rgba.g).toBe(255);
      const inside = pxcJSON('draw:sample --canvas canvas --x 2 --y 2', tmpDir);
      expect(inside.result.rgba.a).toBe(0);
    });
  });

  describe('draw:circle', () => {
    it('draws a filled circle', () => {
      const result = pxcJSON('draw:circle --canvas canvas --cx 4 --cy 4 --radius 2 --color "#ff0000" --fill', tmpDir);
      expect(result.success).toBe(true);
      const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(center.result.rgba.r).toBe(255);
    });
  });

  describe('draw:ellipse', () => {
    it('draws a filled ellipse', () => {
      const result = pxcJSON('draw:ellipse --canvas canvas --cx 4 --cy 4 --rx 3 --ry 2 --color "#0000ff" --fill', tmpDir);
      expect(result.success).toBe(true);
      const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(center.result.rgba.b).toBe(255);
    });
  });

  describe('draw:fill', () => {
    it('flood fills contiguous area', () => {
      pxc('draw:fill --canvas canvas --x 0 --y 0 --color "#ff0000"', tmpDir);
      const sample = pxcJSON('draw:sample --canvas canvas --x 7 --y 7', tmpDir);
      expect(sample.result.rgba.r).toBe(255);
    });

    it('non-contiguous fill replaces all matching', () => {
      pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#aabbcc"', tmpDir);
      pxc('draw:pixel --canvas canvas --x 7 --y 7 --color "#aabbcc"', tmpDir);
      pxc('draw:fill --canvas canvas --x 0 --y 0 --color "#ff0000" --no-contiguous', tmpDir);
      const s1 = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
      const s2 = pxcJSON('draw:sample --canvas canvas --x 7 --y 7', tmpDir);
      expect(s1.result.rgba.r).toBe(255);
      expect(s2.result.rgba.r).toBe(255);
    });
  });

  describe('draw:replace-color', () => {
    it('replaces color across entire layer', () => {
      pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
      const result = pxcJSON('draw:replace-color --canvas canvas --from "#ff0000" --to "#0000ff"', tmpDir);
      expect(result.success).toBe(true);
      const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
      expect(sample.result.rgba.b).toBe(255);
      expect(sample.result.rgba.r).toBe(0);
    });
  });

  describe('draw:sample', () => {
    it('samples from specific layer', () => {
      pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#123456"', tmpDir);
      const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0 --layer layer-001', tmpDir);
      expect(sample.result.rgba.r).toBe(0x12);
      expect(sample.result.rgba.g).toBe(0x34);
      expect(sample.result.rgba.b).toBe(0x56);
    });
  });

  describe('draw:gradient', () => {
    it('draws horizontal gradient', () => {
      const result = pxcJSON('draw:gradient --canvas canvas --x1 0 --y1 0 --x2 7 --y2 0 --from "#000000" --to "#ffffff"', tmpDir);
      expect(result.success).toBe(true);
      const left = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
      const right = pxcJSON('draw:sample --canvas canvas --x 7 --y 0', tmpDir);
      expect(left.result.rgba.r).toBe(0);
      expect(right.result.rgba.r).toBe(255);
    });
  });

  describe('draw:outline', () => {
    it('generates outline around content', () => {
      pxc('draw:rect --canvas canvas --x 3 --y 3 --width 2 --height 2 --color "#ff0000" --fill', tmpDir);
      const result = pxcJSON('draw:outline --canvas canvas --color "#000000" --thickness 1', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.outlinePixels).toBeGreaterThan(0);
      // Check outline pixel exists
      const outline = pxcJSON('draw:sample --canvas canvas --x 2 --y 3', tmpDir);
      expect(outline.result.rgba.r).toBe(0);
      expect(outline.result.rgba.a).toBe(255);
    });
  });
});
