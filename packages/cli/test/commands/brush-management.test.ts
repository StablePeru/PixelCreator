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

describe('Brush Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-brush-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('brush:list', () => {
    it('lists default brush presets', () => {
      const result = pxcJSON('brush:list', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.defaultCount).toBe(8);
      expect(result.result.total).toBeGreaterThanOrEqual(8);
      expect(result.result.presets[0].id).toBe('brush-001');
    });
  });

  describe('brush:create', () => {
    it('creates a custom brush preset', () => {
      const result = pxcJSON('brush:create --name "My Brush" --size 4 --shape square', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('My Brush');
      expect(result.result.size).toBe(4);

      // Verify it appears in list
      const list = pxcJSON('brush:list', tmpDir);
      expect(list.result.customCount).toBe(1);
      expect(list.result.total).toBe(9);
    });

    it('rejects invalid size', () => {
      expect(() => {
        pxc('brush:create --name "Bad" --size 0 --shape circle', tmpDir);
      }).toThrow();
    });
  });

  describe('brush:delete', () => {
    it('deletes a custom preset', () => {
      const created = pxcJSON('brush:create --name "Temp" --size 3 --shape circle', tmpDir);
      const id = created.result.id;

      const result = pxcJSON(`brush:delete --id ${id}`, tmpDir);
      expect(result.success).toBe(true);

      const list = pxcJSON('brush:list', tmpDir);
      expect(list.result.customCount).toBe(0);
    });

    it('rejects deleting built-in preset', () => {
      expect(() => {
        pxc('brush:delete --id brush-001', tmpDir);
      }).toThrow();
    });
  });

  describe('brush:show', () => {
    it('shows preset details with mask', () => {
      const result = pxcJSON('brush:show --id brush-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('Pixel');
      expect(result.result.mask).toBe('#');
    });
  });

  describe('brush:export', () => {
    it('exports brush mask as PNG', () => {
      const dest = path.join(tmpDir, 'brush.png');
      const result = pxcJSON(`brush:export --id brush-002 --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
    });
  });

  describe('brush:import', () => {
    it('imports brush from PNG', () => {
      // First export a brush to get a PNG
      const pngPath = path.join(tmpDir, 'source.png');
      pxc(`brush:export --id brush-002 --dest "${pngPath}"`, tmpDir);

      const result = pxcJSON(`brush:import --file "${pngPath}" --name "Imported"`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('Imported');

      const list = pxcJSON('brush:list', tmpDir);
      expect(list.result.customCount).toBe(1);
    });
  });
});
