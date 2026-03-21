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

describe('Project Configuration Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-project-config-'));
    pxc('project:init --name test', tmpDir);
    pxc('palette:create --name main --colors "#ff0000,#00ff00,#0000ff"', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('project:settings', () => {
    it('shows current settings without flags', () => {
      const result = pxcJSON('project:settings', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.settings.defaultTileSize).toEqual({ width: 16, height: 16 });
      expect(result.result.settings.pixelPerfect).toBe(true);
      expect(result.result.settings.defaultPalette).toBeNull();
    });

    it('updates pixel-perfect setting', () => {
      const result = pxcJSON('project:settings --no-pixel-perfect', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.settings.pixelPerfect).toBe(false);
      expect(result.result.changes).toContain('Pixel perfect set to false');
    });

    it('updates default tile size', () => {
      const result = pxcJSON('project:settings --default-tile-width 32 --default-tile-height 32', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.settings.defaultTileSize).toEqual({ width: 32, height: 32 });
    });

    it('sets default palette', () => {
      const result = pxcJSON('project:settings --default-palette main', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.settings.defaultPalette).toBe('main');
    });

    it('clears default palette with "none"', () => {
      pxc('project:settings --default-palette main', tmpDir);
      const result = pxcJSON('project:settings --default-palette none', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.settings.defaultPalette).toBeNull();
    });

    it('errors for non-existent palette', () => {
      expect(() => {
        pxc('project:settings --default-palette nonexistent', tmpDir);
      }).toThrow();
    });
  });

  describe('project:validation', () => {
    it('shows current validation settings', () => {
      const result = pxcJSON('project:validation', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.validation.paletteEnforcement).toBe('warn');
      expect(result.result.validation.sizeRules).toHaveLength(0);
    });

    it('updates palette enforcement', () => {
      const result = pxcJSON('project:validation --palette-enforcement error', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.validation.paletteEnforcement).toBe('error');
    });

    it('adds a size rule', () => {
      const result = pxcJSON('project:validation --add-rule "canvas:exact:16x16"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.validation.sizeRules).toHaveLength(1);
      expect(result.result.validation.sizeRules[0]).toMatchObject({
        pattern: 'canvas',
        type: 'exact',
        width: 16,
        height: 16,
      });
    });

    it('removes a size rule by index', () => {
      pxc('project:validation --add-rule "canvas:exact:16x16"', tmpDir);
      pxc('project:validation --add-rule "sprite:max:32x32"', tmpDir);
      const result = pxcJSON('project:validation --remove-rule 0', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.validation.sizeRules).toHaveLength(1);
      expect(result.result.validation.sizeRules[0].pattern).toBe('sprite');
    });
  });
});
