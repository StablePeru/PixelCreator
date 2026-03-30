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

function pxcFail(args: string, cwd: string): string {
  try {
    execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000, stdio: 'pipe' });
    return '';
  } catch (error: any) {
    return error.stderr || error.stdout || error.message;
  }
}

describe('draw:stroke pressure (M5b)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-stroke-pressure-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('backward compatibility (no pressure)', () => {
    it('draws stroke without pressure flags — same as before', () => {
      const result = pxcJSON(
        'draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#ff0000" --brush brush-001',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(false);
      expect(result.result.pointCount).toBe(3);
    });
  });

  describe('valid pressure stroke', () => {
    it('draws stroke with pressure values', () => {
      const result = pxcJSON(
        'draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#ff0000" --brush brush-002 --pressure "0.3 0.7 1.0"',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
      expect(result.result.pointCount).toBe(3);
    });

    it('draws stroke with explicit pressure curve and min values', () => {
      const result = pxcJSON(
        'draw:stroke -c canvas --points "1,1 3,3" --color "#00ff00" --pressure "0.5 1.0" --pressure-curve soft --pressure-min-size 0.1 --pressure-min-opacity 0.3',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
    });

    it('draws pressure stroke with symmetry', () => {
      const result = pxcJSON(
        'draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#0000ff" --pressure "0.2 0.6 1.0" --symmetry horizontal',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
      expect(result.result.symmetry).toBe('horizontal');
    });
  });

  describe('validation errors', () => {
    it('rejects pressure array with wrong length (too few)', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#ff0000" --pressure "0.3 0.7"',
        tmpDir,
      );
      expect(output).toContain('Pressure array length (2) must match points length (3)');
    });

    it('rejects pressure array with wrong length (too many)', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4" --color "#ff0000" --pressure "0.3 0.7 1.0"',
        tmpDir,
      );
      expect(output).toContain('Pressure array length (3) must match points length (2)');
    });

    it('rejects pressure value above 1', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4" --color "#ff0000" --pressure "0.5 1.5"',
        tmpDir,
      );
      expect(output).toContain('out of range');
    });

    it('rejects pressure value below 0', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4" --color "#ff0000" --pressure "0.5 -0.1"',
        tmpDir,
      );
      expect(output).toContain('out of range');
    });

    it('rejects non-numeric pressure values', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4" --color "#ff0000" --pressure "0.5 abc"',
        tmpDir,
      );
      expect(output).toContain('must be numbers');
    });

    it('rejects pressure-min-size out of range', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4" --color "#ff0000" --pressure "0.5 1.0" --pressure-min-size 1.5',
        tmpDir,
      );
      expect(output).toContain('pressure-min-size');
    });

    it('rejects pressure-min-opacity out of range', () => {
      const output = pxcFail(
        'draw:stroke -c canvas --points "2,2 4,4" --color "#ff0000" --pressure "0.5 1.0" --pressure-min-opacity -0.1',
        tmpDir,
      );
      expect(output).toContain('pressure-min-opacity');
    });
  });
});
