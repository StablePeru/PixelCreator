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

describe('Color Adjustment Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-color-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('draw:rect --canvas sprite --x 0 --y 0 --width 4 --height 4 --color "#808080" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:brightness', () => {
    it('increases brightness', () => {
      const result = pxcJSON('layer:brightness --canvas sprite --layer layer-001 --amount 50', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.amount).toBe(50);
      expect(result.result.framesProcessed).toBe(1);
      // 0x80 (128) + 50 = 178 = 0xb2
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      expect(sample.result.rgba.r).toBe(178);
    });

    it('decreases brightness', () => {
      pxcJSON('layer:brightness --canvas sprite --layer layer-001 --amount -50', tmpDir);
      const sample = pxcJSON('draw:sample --canvas sprite --x 0 --y 0', tmpDir);
      expect(sample.result.rgba.r).toBe(78);
    });

    it('errors on locked layer', () => {
      pxc('layer:edit --canvas sprite --layer layer-001 --locked true', tmpDir);
      expect(() => {
        pxc('layer:brightness --canvas sprite --layer layer-001 --amount 50', tmpDir);
      }).toThrow();
    });

    it('errors on out-of-range amount', () => {
      expect(() => {
        pxc('layer:brightness --canvas sprite --layer layer-001 --amount 300', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:contrast', () => {
    it('adjusts contrast', () => {
      const result = pxcJSON('layer:contrast --canvas sprite --layer layer-001 --amount 50', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.amount).toBe(50);
      expect(result.result.framesProcessed).toBe(1);
    });

    it('errors on out-of-range amount', () => {
      expect(() => {
        pxc('layer:contrast --canvas sprite --layer layer-001 --amount 150', tmpDir);
      }).toThrow();
    });
  });
});
