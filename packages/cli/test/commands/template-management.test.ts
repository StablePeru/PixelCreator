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

describe('Template Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-template-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 32 --height 32 --name hero', tmpDir);
    pxc('layer:add --canvas hero --name outline', tmpDir);
    pxc('layer:add --canvas hero --name color', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('template:create', () => {
    it('creates template from canvas', () => {
      const result = pxcJSON('template:create --name character --from-canvas hero', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('character');
      expect(result.result.width).toBe(32);
      expect(result.result.height).toBe(32);
      expect(result.result.layers).toBe(3);
    });

    it('creates template from scratch', () => {
      const result = pxcJSON('template:create --name basic --width 16 --height 16', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('basic');
      expect(result.result.width).toBe(16);
      expect(result.result.layers).toBe(1);
    });

    it('errors without width/height when no canvas', () => {
      expect(() => {
        pxc('template:create --name bad', tmpDir);
      }).toThrow();
    });

    it('errors on duplicate name', () => {
      pxc('template:create --name dup --width 8 --height 8', tmpDir);
      expect(() => {
        pxc('template:create --name dup --width 8 --height 8', tmpDir);
      }).toThrow();
    });
  });

  describe('template:list', () => {
    it('lists templates', () => {
      pxc('template:create --name char --from-canvas hero', tmpDir);
      pxc('template:create --name basic --width 16 --height 16', tmpDir);
      const result = pxcJSON('template:list', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.templates).toHaveLength(2);
    });

    it('returns empty list', () => {
      const result = pxcJSON('template:list', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.templates).toHaveLength(0);
    });
  });

  describe('template:info', () => {
    it('shows template details', () => {
      pxc('template:create --name character --from-canvas hero --description "Character template"', tmpDir);
      const result = pxcJSON('template:info --name character', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('character');
      expect(result.result.description).toBe('Character template');
      expect(result.result.layers).toHaveLength(3);
    });
  });

  describe('template:apply', () => {
    it('creates canvas from template', () => {
      pxc('template:create --name character --from-canvas hero', tmpDir);
      const result = pxcJSON('template:apply --template character --canvas villain', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.canvas).toBe('villain');
      expect(result.result.width).toBe(32);
      expect(result.result.layers).toBe(3);
    });

    it('applies template with size override', () => {
      pxc('template:create --name character --from-canvas hero', tmpDir);
      const result = pxcJSON('template:apply --template character --canvas small --width 16 --height 16', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.width).toBe(16);
      expect(result.result.height).toBe(16);
    });

    it('errors on duplicate canvas name', () => {
      pxc('template:create --name character --from-canvas hero', tmpDir);
      expect(() => {
        pxc('template:apply --template character --canvas hero', tmpDir);
      }).toThrow();
    });
  });

  describe('template:delete', () => {
    it('deletes a template', () => {
      pxc('template:create --name disposable --width 8 --height 8', tmpDir);
      const result = pxcJSON('template:delete --name disposable --force', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.deleted).toBe(true);

      // Verify it's gone
      const list = pxcJSON('template:list', tmpDir);
      expect(list.result.templates).toHaveLength(0);
    });

    it('errors on nonexistent template', () => {
      expect(() => {
        pxc('template:delete --name nope --force', tmpDir);
      }).toThrow();
    });
  });
});
