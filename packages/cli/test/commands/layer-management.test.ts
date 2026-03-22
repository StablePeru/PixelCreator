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

describe('Layer Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-layer-mgmt-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite', tmpDir);
    pxc('layer:add --canvas sprite --name overlay', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:edit', () => {
    it('edits layer name', () => {
      const result = pxcJSON('layer:edit --canvas sprite --layer layer-001 --name background2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.changes).toContainEqual(
        expect.objectContaining({ field: 'name', to: 'background2' }),
      );
    });

    it('edits layer opacity', () => {
      const result = pxcJSON('layer:edit --canvas sprite --layer layer-002 --opacity 128', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.changes).toContainEqual(
        expect.objectContaining({ field: 'opacity', from: 255, to: 128 }),
      );
    });

    it('edits multiple properties', () => {
      const result = pxcJSON('layer:edit --canvas sprite --layer layer-002 --opacity 100 --visible false --locked true', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.changes).toHaveLength(3);
    });

    it('errors with no property flags', () => {
      expect(() => {
        pxc('layer:edit --canvas sprite --layer layer-001', tmpDir);
      }).toThrow();
    });

    it('errors with invalid opacity', () => {
      expect(() => {
        pxc('layer:edit --canvas sprite --layer layer-001 --opacity 300', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:reorder', () => {
    it('reorders a layer to a new position', () => {
      const result = pxcJSON('layer:reorder --canvas sprite --layer layer-002 --position 0', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newOrder).toBe(0);
      expect(result.result.layerOrder[0].id).toBe('layer-002');
    });

    it('errors with out-of-bounds position', () => {
      expect(() => {
        pxc('layer:reorder --canvas sprite --layer layer-001 --position 5', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:remove', () => {
    it('removes a layer', () => {
      const result = pxcJSON('layer:remove --canvas sprite --layer layer-002', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.id).toBe('layer-002');
      expect(result.result.remainingLayers).toBe(1);
    });

    it('refuses to remove last layer without --force', () => {
      pxc('layer:remove --canvas sprite --layer layer-002', tmpDir);
      expect(() => {
        pxc('layer:remove --canvas sprite --layer layer-001', tmpDir);
      }).toThrow();
    });

    it('removes last layer with --force', () => {
      pxc('layer:remove --canvas sprite --layer layer-002', tmpDir);
      const result = pxcJSON('layer:remove --canvas sprite --layer layer-001 --force', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.remainingLayers).toBe(0);
    });

    it('deletes layer directory from disk', () => {
      const projectPath = path.join(tmpDir, 'test.pxc');
      const layerDir = path.join(projectPath, 'canvases', 'sprite', 'layers', 'layer-002');
      expect(fs.existsSync(layerDir)).toBe(true);
      pxc('layer:remove --canvas sprite --layer layer-002', tmpDir);
      expect(fs.existsSync(layerDir)).toBe(false);
    });
  });

  describe('layer:duplicate', () => {
    it('duplicates a layer', () => {
      const result = pxcJSON('layer:duplicate --canvas sprite --layer layer-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.sourceId).toBe('layer-001');
      expect(result.result.newName).toBe('background copy');
      expect(result.result.framesCopied).toBe(1);
    });

    it('duplicates with custom name', () => {
      const result = pxcJSON('layer:duplicate --canvas sprite --layer layer-001 --name "my layer"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newName).toBe('my layer');
    });

    it('creates PNG files for duplicated layer', () => {
      pxc('layer:duplicate --canvas sprite --layer layer-001', tmpDir);
      const projectPath = path.join(tmpDir, 'test.pxc');
      const newLayerDir = path.join(projectPath, 'canvases', 'sprite', 'layers', 'layer-003');
      expect(fs.existsSync(newLayerDir)).toBe(true);
      const files = fs.readdirSync(newLayerDir).filter((f) => f.endsWith('.png'));
      expect(files).toHaveLength(1);
    });
  });

  describe('layer:merge', () => {
    it('merges top layer into bottom', () => {
      // Draw on both layers so merge has something to do
      pxc('draw:pixel --x 0 --y 0 --color "#ff0000" --canvas sprite --layer layer-001', tmpDir);
      pxc('draw:pixel --x 1 --y 1 --color "#00ff00" --canvas sprite --layer layer-002', tmpDir);

      const result = pxcJSON('layer:merge --canvas sprite --top layer-002 --bottom layer-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.topId).toBe('layer-002');
      expect(result.result.bottomId).toBe('layer-001');
      expect(result.result.framesMerged).toBe(1);
      expect(result.result.remainingLayers).toBe(1);
    });

    it('errors when merging same layer', () => {
      expect(() => {
        pxc('layer:merge --canvas sprite --top layer-001 --bottom layer-001', tmpDir);
      }).toThrow();
    });

    it('errors when merging locked layer', () => {
      pxc('layer:edit --canvas sprite --layer layer-001 --locked true', tmpDir);
      expect(() => {
        pxc('layer:merge --canvas sprite --top layer-002 --bottom layer-001', tmpDir);
      }).toThrow();
    });
  });
});
