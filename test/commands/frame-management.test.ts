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

describe('Frame Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-frame-mgmt-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    // Add extra frames (total: 4 frames including the initial one)
    pxc('frame:add --canvas sprite --count 3', tmpDir);
    // Draw on frame-002 so we can verify it exists
    pxc('draw:pixel --x 0 --y 0 --color "#ff0000" --canvas sprite --frame frame-002', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('frame:remove', () => {
    it('removes a single frame', () => {
      const result = pxcJSON('frame:remove --canvas sprite --frame 1', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.removed).toHaveLength(1);
      expect(result.result.remainingFrames).toBe(3);

      // Verify frames are reindexed
      const list = pxcJSON('frame:list --canvas sprite', tmpDir);
      expect(list.result.frames).toHaveLength(3);
      expect(list.result.frames[0].id).toBe('frame-001');
      expect(list.result.frames[1].id).toBe('frame-002');
      expect(list.result.frames[2].id).toBe('frame-003');
    });

    it('removes a range of frames', () => {
      const result = pxcJSON('frame:remove --canvas sprite --range 1-2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.removed).toHaveLength(2);
      expect(result.result.remainingFrames).toBe(2);
    });

    it('refuses to remove all frames without --force', () => {
      expect(() => {
        pxc('frame:remove --canvas sprite --range 0-3', tmpDir);
      }).toThrow();
    });

    it('removes all frames with --force', () => {
      const result = pxcJSON('frame:remove --canvas sprite --range 0-3 --force', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.remainingFrames).toBe(0);
    });

    it('deletes PNG files on disk', () => {
      const projectPath = path.join(tmpDir, 'test.pxc');
      const layerDir = path.join(projectPath, 'canvases', 'sprite', 'layers', 'layer-001');

      // Before removal: 4 PNGs
      const beforeFiles = fs.readdirSync(layerDir).filter((f) => f.endsWith('.png'));
      expect(beforeFiles).toHaveLength(4);

      pxc('frame:remove --canvas sprite --frame 1', tmpDir);

      // After removal: 3 PNGs, reindexed
      const afterFiles = fs.readdirSync(layerDir).filter((f) => f.endsWith('.png'));
      expect(afterFiles).toHaveLength(3);
      expect(afterFiles.sort()).toEqual(['frame-001.png', 'frame-002.png', 'frame-003.png']);
    });
  });

  describe('frame:duplicate', () => {
    it('duplicates a frame', () => {
      const result = pxcJSON('frame:duplicate --canvas sprite --frame 0', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.totalFrames).toBe(5);

      const list = pxcJSON('frame:list --canvas sprite', tmpDir);
      expect(list.result.frames).toHaveLength(5);
    });

    it('duplicates with count', () => {
      const result = pxcJSON('frame:duplicate --canvas sprite --frame 0 --count 3', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.totalFrames).toBe(7);
      expect(result.result.duplicated).toHaveLength(3);
    });

    it('creates PNG files for duplicated frames', () => {
      pxc('frame:duplicate --canvas sprite --frame 0', tmpDir);
      const projectPath = path.join(tmpDir, 'test.pxc');
      const layerDir = path.join(projectPath, 'canvases', 'sprite', 'layers', 'layer-001');
      const files = fs.readdirSync(layerDir).filter((f) => f.endsWith('.png'));
      expect(files).toHaveLength(5);
    });
  });

  describe('frame:reorder', () => {
    it('moves a frame from one position to another', () => {
      const result = pxcJSON('frame:reorder --canvas sprite --from 0 --to 3', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.totalFrames).toBe(4);
    });

    it('reindexes PNGs after reorder', () => {
      pxc('frame:reorder --canvas sprite --from 0 --to 2', tmpDir);
      const projectPath = path.join(tmpDir, 'test.pxc');
      const layerDir = path.join(projectPath, 'canvases', 'sprite', 'layers', 'layer-001');
      const files = fs.readdirSync(layerDir).filter((f) => f.endsWith('.png')).sort();
      expect(files).toEqual(['frame-001.png', 'frame-002.png', 'frame-003.png', 'frame-004.png']);
    });

    it('errors on same from and to', () => {
      expect(() => {
        pxc('frame:reorder --canvas sprite --from 1 --to 1', tmpDir);
      }).toThrow();
    });
  });
});
