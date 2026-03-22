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

describe('Advanced Palette Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-palette-adv-'));
    pxc('project:init --name test', tmpDir);
    pxc('palette:create --name main --colors "#ff0000,#00ff00,#0000ff"', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('palette:sort', () => {
    it('sorts by luminance', () => {
      const result = pxcJSON('palette:sort --name main --by luminance', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.sortedBy).toBe('luminance');
      expect(result.result.colorCount).toBe(3);
      // Blue lowest, Red mid, Green highest
      expect(result.result.colors[0]).toBe('#0000ff');
      expect(result.result.colors[1]).toBe('#ff0000');
      expect(result.result.colors[2]).toBe('#00ff00');
    });

    it('sorts by name', () => {
      pxc('palette:edit --name main --rename-color "0:red"', tmpDir);
      pxc('palette:edit --name main --rename-color "1:green"', tmpDir);
      pxc('palette:edit --name main --rename-color "2:blue"', tmpDir);
      const result = pxcJSON('palette:sort --name main --by name', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colors[0]).toBe('#0000ff'); // blue
    });

    it('supports reverse flag', () => {
      const result = pxcJSON('palette:sort --name main --by luminance --reverse', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.reversed).toBe(true);
      expect(result.result.colors[0]).toBe('#00ff00'); // highest luminance first
    });
  });

  describe('palette:ramp', () => {
    it('creates ramp with generated colors', () => {
      const result = pxcJSON('palette:ramp --palette main --create gradient --generate "#000000:#ffffff:3"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.action).toBe('created');
      expect(result.result.rampName).toBe('gradient');
      expect(result.result.colors).toHaveLength(3);
    });

    it('creates ramp with existing indices', () => {
      const result = pxcJSON('palette:ramp --palette main --create primary --indices "0,1,2"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.indices).toEqual([0, 1, 2]);
    });

    it('deletes a ramp', () => {
      pxc('palette:ramp --palette main --create toDelete --indices "0,1"', tmpDir);
      const result = pxcJSON('palette:ramp --palette main --delete toDelete', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.action).toBe('deleted');
    });

    it('errors on duplicate ramp name', () => {
      pxc('palette:ramp --palette main --create dup --indices "0,1"', tmpDir);
      expect(() => {
        pxc('palette:ramp --palette main --create dup --indices "0,2"', tmpDir);
      }).toThrow();
    });
  });

  describe('palette:extract', () => {
    it('extracts colors from canvas into new palette', () => {
      pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
      pxc('draw:pixel --canvas sprite --x 0 --y 0 --color "#ff0000"', tmpDir);
      pxc('draw:pixel --canvas sprite --x 1 --y 0 --color "#00ff00"', tmpDir);
      const result = pxcJSON('palette:extract --canvas sprite --palette extracted', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.created).toBe(true);
      expect(result.result.colorsExtracted).toBe(2);
      expect(result.result.colors).toContain('#ff0000');
      expect(result.result.colors).toContain('#00ff00');
    });

    it('merges into existing palette', () => {
      pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
      pxc('draw:pixel --canvas sprite --x 0 --y 0 --color "#ffff00"', tmpDir);
      const result = pxcJSON('palette:extract --canvas sprite --palette main --merge', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.merged).toBe(true);
      expect(result.result.totalColors).toBe(4); // 3 original + 1 new
    });

    it('errors when merging without --merge flag', () => {
      pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
      pxc('draw:pixel --canvas sprite --x 0 --y 0 --color "#ff0000"', tmpDir);
      expect(() => {
        pxc('palette:extract --canvas sprite --palette main', tmpDir);
      }).toThrow();
    });
  });
});
