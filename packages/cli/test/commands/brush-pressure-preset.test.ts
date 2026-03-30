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

describe('M5c: Brush Pressure Preset Contract', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-m5c-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('brush:create with pressure', () => {
    it('creates preset with pressure sensitivity', () => {
      const result = pxcJSON(
        'brush:create --name "Ink Pressure" --size 5 --shape circle --pressure-enabled --pressure-curve soft --pressure-min-size 0.3 --pressure-min-opacity 0.1',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
    });

    it('creates preset without pressure (backward compat)', () => {
      const result = pxcJSON(
        'brush:create --name "Plain" --size 3 --shape square',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(false);
    });

    it('persists pressure config in project.json', () => {
      pxc(
        'brush:create --name "Pressure Test" --size 4 --shape circle --pressure-enabled --pressure-curve hard --pressure-min-size 0.5 --pressure-min-opacity 0.4',
        tmpDir,
      );
      const projectJSON = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8'));
      const preset = projectJSON.settings.brushPresets.find((p: any) => p.name === 'Pressure Test');
      expect(preset).toBeDefined();
      expect(preset.pressureSensitivity).toEqual({
        enabled: true,
        curve: 'hard',
        minSize: 0.5,
        minOpacity: 0.4,
      });
    });

    it('rejects pressure-min-size out of range', () => {
      const output = pxcFail(
        'brush:create --name "Bad" --size 3 --shape circle --pressure-enabled --pressure-min-size 1.5',
        tmpDir,
      );
      expect(output).toContain('pressure-min-size');
    });

    it('rejects pressure-min-opacity out of range', () => {
      const output = pxcFail(
        'brush:create --name "Bad" --size 3 --shape circle --pressure-enabled --pressure-min-opacity -0.1',
        tmpDir,
      );
      expect(output).toContain('pressure-min-opacity');
    });
  });

  describe('brush:show with pressure', () => {
    it('shows pressure config when present', () => {
      pxc(
        'brush:create --name "ShowMe" --size 5 --shape circle --pressure-enabled --pressure-curve soft --pressure-min-size 0.3 --pressure-min-opacity 0.2',
        tmpDir,
      );
      // Find the preset ID
      const project = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8'));
      const preset = project.settings.brushPresets.find((p: any) => p.name === 'ShowMe');

      const output = pxc(`brush:show --id ${preset.id}`, tmpDir);
      expect(output).toContain('Pressure');
      expect(output).toContain('soft');
      expect(output).toContain('0.3');
    });

    it('shows preset without pressure line when not configured', () => {
      const output = pxc('brush:show --id brush-001', tmpDir);
      expect(output).not.toContain('Pressure');
    });

    it('shows pressure config in JSON output', () => {
      pxc(
        'brush:create --name "JSONShow" --size 4 --shape diamond --pressure-enabled --pressure-curve hard --pressure-min-size 0.1 --pressure-min-opacity 0.5',
        tmpDir,
      );
      const project = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8'));
      const preset = project.settings.brushPresets.find((p: any) => p.name === 'JSONShow');

      const result = pxcJSON(`brush:show --id ${preset.id}`, tmpDir);
      expect(result.result.pressureSensitivity).toEqual({
        enabled: true,
        curve: 'hard',
        minSize: 0.1,
        minOpacity: 0.5,
      });
    });
  });

  describe('draw:stroke preset pressure resolution', () => {
    it('uses preset pressure config when --pressure given but no inline config', () => {
      // Create a pressure-enabled preset
      pxc(
        'brush:create --name "PresetPressure" --size 3 --shape circle --pressure-enabled --pressure-curve soft --pressure-min-size 0.4 --pressure-min-opacity 0.3',
        tmpDir,
      );
      const project = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8'));
      const preset = project.settings.brushPresets.find((p: any) => p.name === 'PresetPressure');

      const result = pxcJSON(
        `draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#ff0000" --brush ${preset.id} --pressure "0.3 0.7 1.0"`,
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
    });

    it('inline flags override preset config', () => {
      // Create preset with soft curve
      pxc(
        'brush:create --name "Override" --size 3 --shape circle --pressure-enabled --pressure-curve soft --pressure-min-size 0.4 --pressure-min-opacity 0.3',
        tmpDir,
      );
      const project = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8'));
      const preset = project.settings.brushPresets.find((p: any) => p.name === 'Override');

      // Use --pressure-curve hard to override preset's soft
      const result = pxcJSON(
        `draw:stroke -c canvas --points "2,2 4,4" --color "#00ff00" --brush ${preset.id} --pressure "0.5 1.0" --pressure-curve hard`,
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
    });

    it('uses fallback defaults when neither inline nor preset provides config', () => {
      // Use default brush (no pressure config) with --pressure flag
      const result = pxcJSON(
        'draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#ff0000" --brush brush-001 --pressure "0.3 0.7 1.0"',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(true);
    });

    it('backward compat: stroke without --pressure still works', () => {
      const result = pxcJSON(
        'draw:stroke -c canvas --points "2,2 4,4 6,6" --color "#ff0000" --brush brush-001',
        tmpDir,
      );
      expect(result.success).toBe(true);
      expect(result.result.pressure).toBe(false);
    });
  });
});
