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

describe('animation tag management', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tags-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 5', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('animation:create-tag', () => {
    it('creates a tag and adds it to canvas.json', () => {
      const result = pxcJSON('animation:create-tag --canvas sprite --name idle --from 0 --to 2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.tag.name).toBe('idle');
      expect(result.result.tag.from).toBe(0);
      expect(result.result.tag.to).toBe(2);
      expect(result.result.tag.direction).toBe('forward');
      expect(result.result.tag.repeat).toBe(1);

      // Verify in canvas.json
      const canvasPath = path.join(tmpDir, 'test.pxc', 'canvases', 'sprite', 'canvas.json');
      const canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf-8'));
      expect(canvas.animationTags).toHaveLength(1);
      expect(canvas.animationTags[0].name).toBe('idle');
    });

    it('creates a tag with custom direction and repeat', () => {
      const result = pxcJSON('animation:create-tag --canvas sprite --name run --from 2 --to 5 --direction pingpong --repeat 3', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.tag.direction).toBe('pingpong');
      expect(result.result.tag.repeat).toBe(3);
    });

    it('errors on invalid range', () => {
      expect(() => {
        pxc('animation:create-tag --canvas sprite --name bad --from 3 --to 1', tmpDir);
      }).toThrow();
    });

    it('errors on out-of-bounds range', () => {
      expect(() => {
        pxc('animation:create-tag --canvas sprite --name bad --from 0 --to 10', tmpDir);
      }).toThrow();
    });

    it('errors on duplicate name', () => {
      pxc('animation:create-tag --canvas sprite --name idle --from 0 --to 1', tmpDir);
      expect(() => {
        pxc('animation:create-tag --canvas sprite --name idle --from 2 --to 3', tmpDir);
      }).toThrow();
    });
  });

  describe('animation:list-tags', () => {
    it('lists all tags', () => {
      pxc('animation:create-tag --canvas sprite --name idle --from 0 --to 1', tmpDir);
      pxc('animation:create-tag --canvas sprite --name run --from 2 --to 5 --direction pingpong', tmpDir);

      const result = pxcJSON('animation:list-tags --canvas sprite', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.count).toBe(2);
      expect(result.result.tags).toHaveLength(2);
      expect(result.result.tags[0].name).toBe('idle');
      expect(result.result.tags[0].frameCount).toBe(2);
      expect(result.result.tags[1].name).toBe('run');
      expect(result.result.tags[1].frameCount).toBe(4);
    });

    it('returns empty list when no tags', () => {
      const result = pxcJSON('animation:list-tags --canvas sprite', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.count).toBe(0);
      expect(result.result.tags).toHaveLength(0);
    });
  });

  describe('animation:edit-tag', () => {
    beforeEach(() => {
      pxc('animation:create-tag --canvas sprite --name idle --from 0 --to 2', tmpDir);
    });

    it('updates direction only', () => {
      const result = pxcJSON('animation:edit-tag --canvas sprite --tag idle --direction pingpong', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.tag.direction).toBe('pingpong');
      expect(result.result.tag.from).toBe(0);
      expect(result.result.tag.to).toBe(2);
    });

    it('renames a tag', () => {
      const result = pxcJSON('animation:edit-tag --canvas sprite --tag idle --name standing', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.tag.name).toBe('standing');

      // Old name no longer exists
      expect(() => {
        pxc('animation:edit-tag --canvas sprite --tag idle --direction reverse', tmpDir);
      }).toThrow();
    });

    it('updates range', () => {
      const result = pxcJSON('animation:edit-tag --canvas sprite --tag idle --from 1 --to 4', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.tag.from).toBe(1);
      expect(result.result.tag.to).toBe(4);
    });

    it('errors on rename conflict', () => {
      pxc('animation:create-tag --canvas sprite --name run --from 3 --to 5', tmpDir);
      expect(() => {
        pxc('animation:edit-tag --canvas sprite --tag idle --name run', tmpDir);
      }).toThrow();
    });

    it('errors on invalid range after edit', () => {
      expect(() => {
        pxc('animation:edit-tag --canvas sprite --tag idle --to 99', tmpDir);
      }).toThrow();
    });
  });

  describe('animation:remove-tag', () => {
    it('removes a tag without affecting frames', () => {
      pxc('animation:create-tag --canvas sprite --name idle --from 0 --to 2', tmpDir);

      const result = pxcJSON('animation:remove-tag --canvas sprite --tag idle', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.removed.name).toBe('idle');
      expect(result.result.remainingTags).toBe(0);

      // Frames still exist
      const frameList = pxcJSON('frame:list --canvas sprite', tmpDir);
      expect(frameList.result.frames).toHaveLength(6);
    });

    it('errors when tag not found', () => {
      expect(() => {
        pxc('animation:remove-tag --canvas sprite --tag nonexistent', tmpDir);
      }).toThrow();
    });
  });

  describe('JSON output', () => {
    it('all tag commands return valid JSON', () => {
      const create = pxcJSON('animation:create-tag --canvas sprite --name idle --from 0 --to 2', tmpDir);
      expect(create).toHaveProperty('success');
      expect(create).toHaveProperty('command');
      expect(create).toHaveProperty('result');
      expect(create).toHaveProperty('duration');

      const list = pxcJSON('animation:list-tags --canvas sprite', tmpDir);
      expect(list).toHaveProperty('success');
      expect(list).toHaveProperty('command');

      const edit = pxcJSON('animation:edit-tag --canvas sprite --tag idle --direction reverse', tmpDir);
      expect(edit).toHaveProperty('success');
      expect(edit).toHaveProperty('command');

      const remove = pxcJSON('animation:remove-tag --canvas sprite --tag idle', tmpDir);
      expect(remove).toHaveProperty('success');
      expect(remove).toHaveProperty('command');
    });
  });
});
