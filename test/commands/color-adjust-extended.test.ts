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

describe('Extended Color Adjustment Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-color-ext-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('draw:rect --canvas sprite --x 0 --y 0 --width 4 --height 4 --color "#ff6600" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:invert', () => {
    it('inverts colors', () => {
      const result = pxcJSON('layer:invert --canvas sprite --layer layer-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.framesProcessed).toBe(1);
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      // #ff6600 inverted = #0099ff
      expect(sample.result.rgba.r).toBe(0);
      expect(sample.result.rgba.g).toBe(153);
      expect(sample.result.rgba.b).toBe(255);
    });

    it('double invert returns to original', () => {
      pxc('layer:invert --canvas sprite --layer layer-001', tmpDir);
      pxc('layer:invert --canvas sprite --layer layer-001', tmpDir);
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      expect(sample.result.rgba.r).toBe(255);
      expect(sample.result.rgba.g).toBe(102);
      expect(sample.result.rgba.b).toBe(0);
    });
  });

  describe('layer:desaturate', () => {
    it('full desaturation produces grayscale', () => {
      const result = pxcJSON('layer:desaturate --canvas sprite --layer layer-001 --amount 100', tmpDir);
      expect(result.success).toBe(true);
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      expect(sample.result.rgba.r).toBe(sample.result.rgba.g);
      expect(sample.result.rgba.g).toBe(sample.result.rgba.b);
    });

    it('errors on invalid amount', () => {
      expect(() => {
        pxc('layer:desaturate --canvas sprite --layer layer-001 --amount 150', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:hue-shift', () => {
    it('shifts hue', () => {
      const result = pxcJSON('layer:hue-shift --canvas sprite --layer layer-001 --degrees 120', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.degrees).toBe(120);
      expect(result.result.framesProcessed).toBe(1);
    });

    it('errors on out-of-range degrees', () => {
      expect(() => {
        pxc('layer:hue-shift --canvas sprite --layer layer-001 --degrees 500', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:posterize', () => {
    it('posterizes to specified levels', () => {
      const result = pxcJSON('layer:posterize --canvas sprite --layer layer-001 --levels 2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.levels).toBe(2);
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      // Each channel should be 0 or 255
      expect([0, 255]).toContain(sample.result.rgba.r);
      expect([0, 255]).toContain(sample.result.rgba.g);
      expect([0, 255]).toContain(sample.result.rgba.b);
    });

    it('errors on invalid levels', () => {
      expect(() => {
        pxc('layer:posterize --canvas sprite --layer layer-001 --levels 1', tmpDir);
      }).toThrow();
    });
  });
});
