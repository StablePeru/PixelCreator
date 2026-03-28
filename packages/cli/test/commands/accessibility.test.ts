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

describe('Accessibility Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-a11y-'));
    pxc('project:init --name test', tmpDir);
    pxc('palette:create --name testpal --colors "#ff0000,#00ff00,#0000ff,#ffffff,#000000"', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('draw:contrast-check', () => {
    it('reports correct ratio for black/white', () => {
      const result = pxcJSON('draw:contrast-check --fg "#000000" --bg "#ffffff"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.ratio).toBeGreaterThan(20);
      expect(result.result.passAA).toBe(true);
      expect(result.result.passAAA).toBe(true);
    });

    it('reports low contrast for similar colors', () => {
      const result = pxcJSON('draw:contrast-check --fg "#cccccc" --bg "#ffffff"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.ratio).toBeLessThan(4.5);
      expect(result.result.passAA).toBe(false);
    });

    it('JSON output includes all WCAG levels', () => {
      const result = pxcJSON('draw:contrast-check --fg "#000000" --bg "#ffffff"', tmpDir);
      expect(result.result.passAA).toBeDefined();
      expect(result.result.passAAA).toBeDefined();
      expect(result.result.passAALarge).toBeDefined();
      expect(result.result.passAAALarge).toBeDefined();
    });
  });

  describe('palette:accessibility', () => {
    it('generates report for palette', () => {
      const result = pxcJSON('palette:accessibility --name testpal', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.totalColors).toBe(5);
      expect(result.result.score).toBeDefined();
    });

    it('filters by deficiency', () => {
      const result = pxcJSON('palette:accessibility --name testpal --deficiency tritanopia', tmpDir);
      expect(result.success).toBe(true);
      for (const issue of result.result.issues) {
        expect(issue.deficiency).toBe('tritanopia');
      }
    });

    it('reports score between 0-100', () => {
      const result = pxcJSON('palette:accessibility --name testpal', tmpDir);
      expect(result.result.score).toBeGreaterThanOrEqual(0);
      expect(result.result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('canvas:simulate-cvd', () => {
    it('simulates deuteranopia', () => {
      const result = pxcJSON('canvas:simulate-cvd --canvas canvas --deficiency deuteranopia', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.deficiency).toBe('deuteranopia');
    });

    it('exports simulated PNG', () => {
      const dest = path.join(tmpDir, 'sim.png');
      const result = pxcJSON(`canvas:simulate-cvd --canvas canvas --deficiency protanopia --export "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
    });
  });

  describe('validate:accessibility', () => {
    it('validates palette accessibility', () => {
      const result = pxcJSON('validate:accessibility --palette testpal', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.score).toBeDefined();
    });
  });

  describe('export:accessibility-report', () => {
    it('exports JSON report', () => {
      const dest = path.join(tmpDir, 'report.json');
      const result = pxcJSON(`export:accessibility-report --name testpal --file "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
      const report = JSON.parse(fs.readFileSync(dest, 'utf-8'));
      expect(report.palette).toBe('testpal');
    });
  });

  describe('palette:contrast', () => {
    it('checks contrast between palette colors', () => {
      const result = pxcJSON('palette:contrast --name testpal --all', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.pairs.length).toBeGreaterThan(0);
    });
  });
});
