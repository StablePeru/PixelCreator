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

describe('Pixel Art Utilities', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-utils-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 4 --height 8 --color "#ff0000" --fill', tmpDir);
    pxc('draw:rect --canvas canvas --x 4 --y 0 --width 4 --height 8 --color "#0000ff" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('canvas:histogram', () => {
    it('shows top colors', () => {
      const result = pxcJSON('canvas:histogram --canvas canvas --top 5', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colors.length).toBeGreaterThan(0);
      expect(result.result.uniqueColors).toBe(2);
    });
  });

  describe('canvas:compare', () => {
    it('identical canvases show 0 diff', () => {
      pxc('canvas:clone --canvas canvas --name canvas2', tmpDir);
      const result = pxcJSON('canvas:compare --canvas canvas --with canvas2', tmpDir);
      expect(result.result.identical).toBe(true);
      expect(result.result.diffCount).toBe(0);
    });

    it('different canvases show diff', () => {
      pxc('canvas:create --width 8 --height 8 --name other', tmpDir);
      pxc('draw:rect --canvas other --x 0 --y 0 --width 8 --height 8 --color "#00ff00" --fill', tmpDir);
      const result = pxcJSON('canvas:compare --canvas canvas --with other', tmpDir);
      expect(result.result.identical).toBe(false);
      expect(result.result.diffCount).toBeGreaterThan(0);
    });

    it('saves diff PNG', () => {
      pxc('canvas:create --width 8 --height 8 --name other', tmpDir);
      const dest = path.join(tmpDir, 'diff.png');
      pxc(`canvas:compare --canvas canvas --with other --dest "${dest}"`, tmpDir);
      expect(fs.existsSync(dest)).toBe(true);
    });
  });

  describe('canvas:color-count', () => {
    it('counts unique colors', () => {
      const result = pxcJSON('canvas:color-count --canvas canvas', tmpDir);
      expect(result.result.uniqueColors).toBe(2);
    });
  });

  describe('canvas:resize-bilinear', () => {
    it('resizes with factor', () => {
      const result = pxcJSON('canvas:resize-bilinear --canvas canvas --factor 2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newWidth).toBe(16);
      expect(result.result.newHeight).toBe(16);
    });

    it('resizes to specific dimensions', () => {
      const result = pxcJSON('canvas:resize-bilinear --canvas canvas --width 4 --height 4', tmpDir);
      expect(result.result.newWidth).toBe(4);
    });
  });

  describe('canvas:reduce-colors', () => {
    it('reduces to N colors', () => {
      const result = pxcJSON('canvas:reduce-colors --canvas canvas --max-colors 1', tmpDir);
      expect(result.success).toBe(true);
      // After reduction, should have only 1 color
      const count = pxcJSON('canvas:color-count --canvas canvas', tmpDir);
      expect(count.result.uniqueColors).toBe(1);
    });
  });

  describe('palette:generate', () => {
    it('generates palette from canvas', () => {
      const result = pxcJSON('palette:generate --canvas canvas --name autogen --max-colors 4', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colorCount).toBe(2); // only 2 unique colors
    });
  });

  describe('palette:harmony', () => {
    it('generates complementary harmony', () => {
      const result = pxcJSON('palette:harmony --color "#ff0000" --type complementary --name comp', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colorCount).toBe(2);
    });

    it('generates triadic harmony', () => {
      const result = pxcJSON('palette:harmony --color "#ff0000" --type triadic --name tri', tmpDir);
      expect(result.result.colorCount).toBe(3);
    });
  });

  describe('draw:color-info', () => {
    it('shows color info', () => {
      const result = pxcJSON('draw:color-info --color "#ff0000"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.r).toBe(255);
      expect(result.result.g).toBe(0);
      expect(result.result.h).toBe(0);
      expect(result.result.s).toBe(100);
      expect(result.result.l).toBe(50);
    });
  });
});
