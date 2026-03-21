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

describe('Palette Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-palette-mgmt-'));
    pxc('project:init --name test', tmpDir);
    pxc('palette:create --name main --colors "#ff0000,#00ff00,#0000ff"', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('palette:info', () => {
    it('shows palette information', () => {
      const result = pxcJSON('palette:info --name main', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('main');
      expect(result.result.colorCount).toBe(3);
      expect(result.result.colors).toHaveLength(3);
      expect(result.result.colors[0].hex).toBe('#ff0000');
    });

    it('errors for non-existent palette', () => {
      expect(() => {
        pxc('palette:info --name nope', tmpDir);
      }).toThrow();
    });
  });

  describe('palette:edit', () => {
    it('adds colors', () => {
      const result = pxcJSON('palette:edit --name main --add "#ffff00,#ff00ff"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colorCount).toBe(5);
      expect(result.result.changes).toContain('Added 2 color(s)');
    });

    it('removes colors', () => {
      const result = pxcJSON('palette:edit --name main --remove 1', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colorCount).toBe(2);
    });

    it('renames a color', () => {
      const result = pxcJSON('palette:edit --name main --rename-color "0:Red"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.changes).toContain('Renamed color 0 to "Red"');

      // Verify via palette:info
      const info = pxcJSON('palette:info --name main', tmpDir);
      expect(info.result.colors[0].name).toBe('Red');
    });

    it('sets color group', () => {
      const result = pxcJSON('palette:edit --name main --set-group "0:primary"', tmpDir);
      expect(result.success).toBe(true);

      const info = pxcJSON('palette:info --name main', tmpDir);
      expect(info.result.colors[0].group).toBe('primary');
    });

    it('sets description', () => {
      const result = pxcJSON('palette:edit --name main --description "Main game palette"', tmpDir);
      expect(result.success).toBe(true);

      const info = pxcJSON('palette:info --name main', tmpDir);
      expect(info.result.description).toBe('Main game palette');
    });

    it('errors with no action flags', () => {
      expect(() => {
        pxc('palette:edit --name main', tmpDir);
      }).toThrow();
    });
  });
});
