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

describe('Canvas Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-canvas-mgmt-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('canvas:list', () => {
    it('lists all canvases', () => {
      const result = pxcJSON('canvas:list', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.canvases).toHaveLength(1);
      expect(result.result.canvases[0]).toMatchObject({
        name: 'sprite',
        width: 8,
        height: 8,
        layers: 1,
        frames: 1,
      });
    });

    it('lists multiple canvases', () => {
      pxc('canvas:create --width 16 --height 16 --name tileset', tmpDir);
      const result = pxcJSON('canvas:list', tmpDir);
      expect(result.result.canvases).toHaveLength(2);
    });

    it('returns empty list when no canvases', () => {
      pxc('canvas:delete --canvas sprite --force', tmpDir);
      const result = pxcJSON('canvas:list', tmpDir);
      expect(result.result.canvases).toHaveLength(0);
    });
  });

  describe('canvas:delete', () => {
    it('deletes a canvas', () => {
      const result = pxcJSON('canvas:delete --canvas sprite --force', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.deleted).toBe(true);
    });

    it('removes canvas directory from disk', () => {
      const projectPath = path.join(tmpDir, 'test.pxc');
      const canvasDir = path.join(projectPath, 'canvases', 'sprite');
      expect(fs.existsSync(canvasDir)).toBe(true);
      pxc('canvas:delete --canvas sprite --force', tmpDir);
      expect(fs.existsSync(canvasDir)).toBe(false);
    });

    it('errors for non-existent canvas', () => {
      expect(() => {
        pxc('canvas:delete --canvas nope --force', tmpDir);
      }).toThrow();
    });
  });

  describe('canvas:resize', () => {
    it('extends canvas size', () => {
      pxc('draw:pixel --x 0 --y 0 --color "#ff0000" --canvas sprite', tmpDir);
      const result = pxcJSON('canvas:resize --canvas sprite --width 16 --height 16 --anchor top-left', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.oldWidth).toBe(8);
      expect(result.result.newWidth).toBe(16);
      expect(result.result.framesProcessed).toBe(1);
    });

    it('resizes with center anchor', () => {
      const result = pxcJSON('canvas:resize --canvas sprite --width 16 --height 16 --anchor center', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.anchor).toBe('center');
    });

    it('errors with invalid dimensions', () => {
      expect(() => {
        pxc('canvas:resize --canvas sprite --width 0 --height 8', tmpDir);
      }).toThrow();
    });
  });
});
