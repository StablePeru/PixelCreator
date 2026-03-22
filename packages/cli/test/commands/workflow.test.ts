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

describe('Workflow Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-workflow-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('project:snapshot / project:restore', () => {
    it('creates a snapshot', () => {
      const result = pxcJSON('project:snapshot --canvas canvas --description "before edit"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.id).toMatch(/^snap-/);
    });

    it('lists snapshots', () => {
      pxc('project:snapshot --canvas canvas --description "test"', tmpDir);
      const result = pxcJSON('project:snapshots', tmpDir);
      expect(result.result.count).toBe(1);
    });

    it('restores canvas from snapshot', () => {
      const snap = pxcJSON('project:snapshot --canvas canvas --description "red"', tmpDir);

      // Change canvas to blue
      pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#0000ff" --fill', tmpDir);
      const blue = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(blue.result.rgba.b).toBe(255);

      // Restore
      pxc(`project:restore --snapshot ${snap.result.id} --canvas canvas`, tmpDir);
      const restored = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(restored.result.rgba.r).toBe(255);
      expect(restored.result.rgba.b).toBe(0);
    });
  });

  describe('draw:batch-replace', () => {
    it('replaces color across all frames', () => {
      pxc('frame:add --canvas canvas', tmpDir);
      pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill --frame frame-002', tmpDir);

      const result = pxcJSON('draw:batch-replace --canvas canvas --from "#ff0000" --to "#00ff00"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.totalReplaced).toBeGreaterThan(0);

      // Both frames should now be green
      const sample1 = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(sample1.result.rgba.g).toBe(255);
    });

    it('handles tolerance', () => {
      pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#f00000"', tmpDir);
      const result = pxcJSON('draw:batch-replace --canvas canvas --from "#ff0000" --to "#0000ff" --tolerance 20', tmpDir);
      expect(result.result.totalReplaced).toBeGreaterThan(0);
    });
  });

  describe('canvas:batch-run', () => {
    it('runs command on all canvases', () => {
      pxc('canvas:create --width 8 --height 8 --name second', tmpDir);
      const result = pxcJSON('canvas:batch-run --command "canvas:info --canvas {{canvas}}" --all', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.total).toBe(2);
      expect(result.result.succeeded).toBe(2);
    });

    it('runs command on specific canvases', () => {
      pxc('canvas:create --width 8 --height 8 --name second', tmpDir);
      const result = pxcJSON('canvas:batch-run --command "canvas:info --canvas {{canvas}}" --canvases "canvas"', tmpDir);
      expect(result.result.total).toBe(1);
    });
  });

  describe('project:clean', () => {
    it('cleans snapshots', () => {
      pxc('project:snapshot --canvas canvas --description "test"', tmpDir);
      const result = pxcJSON('project:clean --snapshots', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.cleaned).toContain('snapshots');

      const list = pxcJSON('project:snapshots', tmpDir);
      expect(list.result.count).toBe(0);
    });

    it('cleans all', () => {
      pxc('project:snapshot --canvas canvas --description "test"', tmpDir);
      const result = pxcJSON('project:clean --all', tmpDir);
      expect(result.result.cleaned.length).toBeGreaterThan(0);
    });
  });
});
