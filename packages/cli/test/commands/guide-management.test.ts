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

describe('Guide Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-guide-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('guide:add', () => {
    it('adds a horizontal guide', () => {
      const result = pxcJSON('guide:add --canvas canvas --orientation horizontal --position 8', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.orientation).toBe('horizontal');
      expect(result.result.position).toBe(8);
    });

    it('adds a vertical guide with custom color', () => {
      const result = pxcJSON('guide:add --canvas canvas --orientation vertical --position 4 --color "#ff0000"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.color).toBe('#ff0000');
    });
  });

  describe('guide:list', () => {
    it('lists all guides', () => {
      pxc('guide:add --canvas canvas --orientation horizontal --position 8', tmpDir);
      pxc('guide:add --canvas canvas --orientation vertical --position 4', tmpDir);
      const result = pxcJSON('guide:list --canvas canvas', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.total).toBe(2);
    });
  });

  describe('guide:remove', () => {
    it('removes a guide by ID', () => {
      const added = pxcJSON('guide:add --canvas canvas --orientation horizontal --position 8', tmpDir);
      const id = added.result.id;
      const result = pxcJSON(`guide:remove --canvas canvas --id ${id}`, tmpDir);
      expect(result.success).toBe(true);

      const list = pxcJSON('guide:list --canvas canvas', tmpDir);
      expect(list.result.total).toBe(0);
    });

    it('errors on missing ID', () => {
      expect(() => {
        pxc('guide:remove --canvas canvas --id nonexistent', tmpDir);
      }).toThrow();
    });
  });

  describe('guide:clear', () => {
    it('clears all guides', () => {
      pxc('guide:add --canvas canvas --orientation horizontal --position 4', tmpDir);
      pxc('guide:add --canvas canvas --orientation vertical --position 8', tmpDir);
      const result = pxcJSON('guide:clear --canvas canvas', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.cleared).toBe(2);

      const list = pxcJSON('guide:list --canvas canvas', tmpDir);
      expect(list.result.total).toBe(0);
    });
  });

  describe('guide:move', () => {
    it('moves a guide to a new position', () => {
      const added = pxcJSON('guide:add --canvas canvas --orientation horizontal --position 4', tmpDir);
      const result = pxcJSON(`guide:move --canvas canvas --id ${added.result.id} --position 12`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.position).toBe(12);
    });
  });

  describe('guide:snap', () => {
    it('enables/disables snapping', () => {
      const result = pxcJSON('guide:snap --canvas canvas --no-enabled', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.snapEnabled).toBe(false);

      const result2 = pxcJSON('guide:snap --canvas canvas --enabled', tmpDir);
      expect(result2.result.snapEnabled).toBe(true);
    });

    it('sets snap threshold', () => {
      const result = pxcJSON('guide:snap --canvas canvas --threshold 8', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.snapThreshold).toBe(8);
    });
  });
});
