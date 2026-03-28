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

describe('Symmetric Draw Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-sym-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('draw:stroke', () => {
    it('draws a basic stroke', () => {
      const result = pxcJSON('draw:stroke --canvas canvas --points "4,4 8,4" --color "#ff0000" --brush brush-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.pointCount).toBe(2);

      const sample = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(sample.result.rgba.r).toBe(255);
    });

    it('draws a stroke with a larger brush', () => {
      const result = pxcJSON('draw:stroke --canvas canvas --points "8,8" --color "#00ff00" --brush brush-002', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.brush).toBe('Round 3');
    });
  });

  describe('draw:symmetric-pixel', () => {
    it('draws pixel with horizontal symmetry', () => {
      pxc('draw:symmetric-pixel --canvas canvas --x 2 --y 8 --color "#ff0000" --symmetry horizontal --axis-x 8', tmpDir);
      const left = pxcJSON('draw:sample --canvas canvas --x 2 --y 8', tmpDir);
      expect(left.result.rgba.r).toBe(255);
      const right = pxcJSON('draw:sample --canvas canvas --x 13 --y 8', tmpDir);
      expect(right.result.rgba.r).toBe(255);
    });
  });

  describe('draw:symmetric-line', () => {
    it('draws line with both axes symmetry', () => {
      const result = pxcJSON('draw:symmetric-line --canvas canvas --x1 1 --y1 1 --x2 3 --y2 1 --color "#0000ff" --symmetry both --axis-x 8 --axis-y 8', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.symmetry).toBe('both');

      const original = pxcJSON('draw:sample --canvas canvas --x 1 --y 1', tmpDir);
      expect(original.result.rgba.b).toBe(255);
      const mirrored = pxcJSON('draw:sample --canvas canvas --x 14 --y 1', tmpDir);
      expect(mirrored.result.rgba.b).toBe(255);
    });
  });

  describe('draw:symmetric-fill', () => {
    it('fills with symmetry', () => {
      const result = pxcJSON('draw:symmetric-fill --canvas canvas --x 4 --y 4 --color "#ff0000" --symmetry horizontal --axis-x 8', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.fillPoints).toBe(2);
    });
  });

  describe('canvas:symmetry', () => {
    it('sets symmetry config', () => {
      const result = pxcJSON('canvas:symmetry --canvas canvas --mode horizontal --axis-x 8', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.symmetry.mode).toBe('horizontal');
      expect(result.result.symmetry.axisX).toBe(8);
    });

    it('gets current symmetry config', () => {
      pxc('canvas:symmetry --canvas canvas --mode vertical --axis-y 4', tmpDir);
      const result = pxcJSON('canvas:symmetry --canvas canvas', tmpDir);
      expect(result.result.symmetry.mode).toBe('vertical');
      expect(result.result.symmetry.axisY).toBe(4);
    });
  });

  describe('canvas:symmetry-guide', () => {
    it('generates symmetry guide PNG', () => {
      pxc('canvas:symmetry --canvas canvas --mode horizontal --axis-x 8', tmpDir);
      const dest = path.join(tmpDir, 'guide.png');
      const result = pxcJSON(`canvas:symmetry-guide --canvas canvas --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
    });

    it('rejects when no symmetry configured', () => {
      expect(() => {
        pxc(`canvas:symmetry-guide --canvas canvas --dest "${path.join(tmpDir, 'fail.png')}"`, tmpDir);
      }).toThrow();
    });
  });
});
