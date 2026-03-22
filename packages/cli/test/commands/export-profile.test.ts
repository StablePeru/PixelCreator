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

describe('Export Profile Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-export-prof-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite', tmpDir);
    pxc('draw:rect --canvas sprite --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('export:profile', () => {
    it('creates an export profile', () => {
      const result = pxcJSON('export:profile --create web-png --target png --dest ./exports/hero.png --scale 2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('web-png');
      expect(result.result.target).toBe('png');
      expect(result.result.scale).toBe(2);
    });

    it('lists profiles', () => {
      pxc('export:profile --create p1 --target png --dest ./out.png', tmpDir);
      const result = pxcJSON('export:profile --list', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.count).toBe(1);
      expect(result.result.profiles[0].name).toBe('p1');
    });

    it('shows profile details', () => {
      pxc('export:profile --create detail --target spritesheet --dest ./sheet.png --scale 3', tmpDir);
      const result = pxcJSON('export:profile --show detail', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.target).toBe('spritesheet');
      expect(result.result.scale).toBe(3);
    });

    it('deletes a profile', () => {
      pxc('export:profile --create todelete --target png --dest ./x.png', tmpDir);
      const result = pxcJSON('export:profile --delete todelete', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.deleted).toBe(true);
    });

    it('errors on duplicate create', () => {
      pxc('export:profile --create dup --target png --dest ./x.png', tmpDir);
      expect(() => {
        pxc('export:profile --create dup --target png --dest ./y.png', tmpDir);
      }).toThrow();
    });
  });

  describe('export:run', () => {
    it('runs a PNG export profile', () => {
      pxc('export:profile --create test-png --target png --dest ./exports/test.png --scale 2', tmpDir);
      const result = pxcJSON('export:run --profile test-png --canvas sprite', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.target).toBe('png');
      expect(result.result.width).toBe(16);
      expect(result.result.height).toBe(16);
    });

    it('creates the destination file', () => {
      pxc('export:profile --create file-test --target png --dest ./exports/out.png', tmpDir);
      pxc('export:run --profile file-test --canvas sprite', tmpDir);
      const projectPath = path.join(tmpDir, 'test.pxc');
      expect(fs.existsSync(path.join(projectPath, 'exports', 'out.png'))).toBe(true);
    });

    it('errors for non-existent profile', () => {
      expect(() => {
        pxc('export:run --profile nonexistent --canvas sprite', tmpDir);
      }).toThrow();
    });
  });
});
