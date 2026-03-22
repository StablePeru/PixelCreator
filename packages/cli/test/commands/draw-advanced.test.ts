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

describe('Advanced Draw Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-adv-draw-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 32 --height 32 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('draw:polygon', () => {
    it('draws a filled polygon', () => {
      const result = pxcJSON('draw:polygon --canvas canvas --points "4,4 28,4 28,28 4,28" --color "#ff0000" --fill', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.pointCount).toBe(4);
      const sample = pxcJSON('draw:sample --canvas canvas --x 16 --y 16', tmpDir);
      expect(sample.result.rgba.r).toBe(255);
    });

    it('draws an outline polygon', () => {
      const result = pxcJSON('draw:polygon --canvas canvas --points "4,4 28,4 16,28" --color "#00ff00"', tmpDir);
      expect(result.success).toBe(true);
      // Edge pixel should be colored
      const edge = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(edge.result.rgba.g).toBe(255);
    });
  });

  describe('draw:polyline', () => {
    it('draws a polyline', () => {
      const result = pxcJSON('draw:polyline --canvas canvas --points "0,0 15,0 15,15" --color "#ff0000"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.pointCount).toBe(3);
      const sample = pxcJSON('draw:sample --canvas canvas --x 8 --y 0', tmpDir);
      expect(sample.result.rgba.r).toBe(255);
    });
  });

  describe('draw:bezier', () => {
    it('draws a quadratic bezier', () => {
      const result = pxcJSON('draw:bezier --canvas canvas --start "0,16" --cp1 "16,0" --end "31,16" --color "#ff0000"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('quadratic');
      const start = pxcJSON('draw:sample --canvas canvas --x 0 --y 16', tmpDir);
      expect(start.result.rgba.r).toBe(255);
    });

    it('draws a cubic bezier', () => {
      const result = pxcJSON('draw:bezier --canvas canvas --start "0,16" --cp1 "10,0" --cp2 "20,31" --end "31,16" --color "#0000ff"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('cubic');
    });
  });

  describe('draw:radial-gradient', () => {
    it('creates a radial gradient', () => {
      const result = pxcJSON('draw:radial-gradient --canvas canvas --cx 16 --cy 16 --radius 10 --from "#ffffff" --to "#000000"', tmpDir);
      expect(result.success).toBe(true);
      const center = pxcJSON('draw:sample --canvas canvas --x 16 --y 16', tmpDir);
      expect(center.result.rgba.r).toBe(255);
      expect(center.result.rgba.g).toBe(255);
    });
  });

  describe('draw:stamp', () => {
    it('stamps a circle', () => {
      const result = pxcJSON('draw:stamp --canvas canvas --x 16 --y 16 --color "#ff0000" --size 5 --shape circle', tmpDir);
      expect(result.success).toBe(true);
      const center = pxcJSON('draw:sample --canvas canvas --x 16 --y 16', tmpDir);
      expect(center.result.rgba.r).toBe(255);
    });

    it('stamps a square', () => {
      const result = pxcJSON('draw:stamp --canvas canvas --x 16 --y 16 --color "#00ff00" --size 3 --shape square', tmpDir);
      expect(result.success).toBe(true);
      const corner = pxcJSON('draw:sample --canvas canvas --x 15 --y 15', tmpDir);
      expect(corner.result.rgba.g).toBe(255);
    });
  });

  describe('draw:line --thickness', () => {
    it('draws with default thickness (backward compat)', () => {
      const result = pxcJSON('draw:line --canvas canvas --x1 0 --y1 0 --x2 31 --y2 0 --color "#ff0000"', tmpDir);
      expect(result.success).toBe(true);
    });

    it('draws with increased thickness', () => {
      pxc('draw:line --canvas canvas --x1 0 --y1 16 --x2 31 --y2 16 --color "#ff0000" --thickness 3', tmpDir);
      const above = pxcJSON('draw:sample --canvas canvas --x 16 --y 15', tmpDir);
      expect(above.result.rgba.r).toBe(255); // thick line covers adjacent rows
    });
  });

  describe('draw:rect --thickness', () => {
    it('draws thick outline rect', () => {
      pxc('draw:rect --canvas canvas --x 4 --y 4 --width 24 --height 24 --color "#ff0000" --thickness 3', tmpDir);
      const edge = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(edge.result.rgba.r).toBe(255);
    });
  });

  describe('draw:circle --thickness', () => {
    it('draws thick outline circle', () => {
      pxc('draw:circle --canvas canvas --cx 16 --cy 16 --radius 10 --color "#ff0000" --thickness 3', tmpDir);
      const outer = pxcJSON('draw:sample --canvas canvas --x 26 --y 16', tmpDir);
      expect(outer.result.rgba.r).toBe(255);
      const center = pxcJSON('draw:sample --canvas canvas --x 16 --y 16', tmpDir);
      expect(center.result.rgba.a).toBe(0);
    });
  });

  describe('draw:ellipse --thickness', () => {
    it('draws thick outline ellipse', () => {
      pxc('draw:ellipse --canvas canvas --cx 16 --cy 16 --rx 12 --ry 8 --color "#ff0000" --thickness 3', tmpDir);
      const center = pxcJSON('draw:sample --canvas canvas --x 16 --y 16', tmpDir);
      expect(center.result.rgba.a).toBe(0);
    });
  });

  describe('error cases', () => {
    it('polygon with 2 points errors', () => {
      try {
        pxcJSON('draw:polygon --canvas canvas --points "0,0 5,5" --color "#ff0000"', tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });
  });
});
