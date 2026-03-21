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

describe('Layer System v2', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-layer-v2-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#0000ff" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:create-group', () => {
    it('creates a group layer', () => {
      const result = pxcJSON('layer:create-group --canvas canvas --name "Sprites"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('Sprites');
    });

    it('group appears in list-tree', () => {
      pxc('layer:create-group --canvas canvas --name "BG Group"', tmpDir);
      const tree = pxcJSON('layer:list-tree --canvas canvas', tmpDir);
      expect(tree.result.tree.some((n: any) => n.type === 'group')).toBe(true);
    });
  });

  describe('layer:move-to-group', () => {
    it('moves layer into group', () => {
      const group = pxcJSON('layer:create-group --canvas canvas --name "Group1"', tmpDir);
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const firstLayerId = layers.result.layers[0].id;

      const result = pxcJSON(`layer:move-to-group --canvas canvas --layer ${firstLayerId} --group ${group.result.id}`, tmpDir);
      expect(result.success).toBe(true);

      const tree = pxcJSON('layer:list-tree --canvas canvas', tmpDir);
      const groupNode = tree.result.tree.find((n: any) => n.type === 'group');
      expect(groupNode.children.length).toBeGreaterThan(0);
    });

    it('moves layer to root (no --group)', () => {
      const group = pxcJSON('layer:create-group --canvas canvas --name "Group1"', tmpDir);
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const firstLayerId = layers.result.layers[0].id;

      pxc(`layer:move-to-group --canvas canvas --layer ${firstLayerId} --group ${group.result.id}`, tmpDir);
      const result = pxcJSON(`layer:move-to-group --canvas canvas --layer ${firstLayerId}`, tmpDir);
      expect(result.success).toBe(true);
    });
  });

  describe('layer:ungroup', () => {
    it('dissolves group', () => {
      const group = pxcJSON('layer:create-group --canvas canvas --name "ToDissolve"', tmpDir);
      pxc(`layer:add --canvas canvas --name child1 --parent ${group.result.id}`, tmpDir);

      const result = pxcJSON(`layer:ungroup --canvas canvas --group ${group.result.id}`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.childrenMoved).toBe(1);

      // Group should be gone
      const tree = pxcJSON('layer:list-tree --canvas canvas', tmpDir);
      expect(tree.result.tree.every((n: any) => n.type !== 'group')).toBe(true);
    });
  });

  describe('layer:clip', () => {
    it('enables clipping', () => {
      pxc('layer:add --canvas canvas --name overlay', tmpDir);
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const overlayId = layers.result.layers.find((l: any) => l.name === 'overlay').id;

      const result = pxcJSON(`layer:clip --canvas canvas --layer ${overlayId}`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.clipping).toBe(true);
    });

    it('disables clipping with --no-clip', () => {
      pxc('layer:add --canvas canvas --name overlay', tmpDir);
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const overlayId = layers.result.layers.find((l: any) => l.name === 'overlay').id;

      pxc(`layer:clip --canvas canvas --layer ${overlayId}`, tmpDir);
      const result = pxcJSON(`layer:clip --canvas canvas --layer ${overlayId} --no-clip`, tmpDir);
      expect(result.result.clipping).toBe(false);
    });
  });

  describe('layer:blend — new modes', () => {
    it('sets color-dodge blend mode', () => {
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const layerId = layers.result.layers[0].id;
      const result = pxcJSON(`layer:blend --canvas canvas --layer ${layerId} --mode color-dodge`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newMode).toBe('color-dodge');
    });

    it('sets difference blend mode', () => {
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const layerId = layers.result.layers[0].id;
      const result = pxcJSON(`layer:blend --canvas canvas --layer ${layerId} --mode difference`, tmpDir);
      expect(result.result.newMode).toBe('difference');
    });

    it('sets addition blend mode', () => {
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const layerId = layers.result.layers[0].id;
      const result = pxcJSON(`layer:blend --canvas canvas --layer ${layerId} --mode addition`, tmpDir);
      expect(result.result.newMode).toBe('addition');
    });

    it('sets subtract blend mode', () => {
      const layers = pxcJSON('layer:list --canvas canvas', tmpDir);
      const layerId = layers.result.layers[0].id;
      const result = pxcJSON(`layer:blend --canvas canvas --layer ${layerId} --mode subtract`, tmpDir);
      expect(result.result.newMode).toBe('subtract');
    });
  });

  describe('layer:add with --parent', () => {
    it('adds layer inside group', () => {
      const group = pxcJSON('layer:create-group --canvas canvas --name "MyGroup"', tmpDir);
      const result = pxcJSON(`layer:add --canvas canvas --name child --parent ${group.result.id}`, tmpDir);
      expect(result.success).toBe(true);

      const tree = pxcJSON('layer:list-tree --canvas canvas', tmpDir);
      const groupNode = tree.result.tree.find((n: any) => n.type === 'group');
      expect(groupNode.children.some((c: any) => c.name === 'child')).toBe(true);
    });
  });

  describe('layer:list-tree', () => {
    it('shows hierarchy', () => {
      pxc('layer:create-group --canvas canvas --name "Group1"', tmpDir);
      const tree = pxcJSON('layer:list-tree --canvas canvas', tmpDir);
      expect(tree.success).toBe(true);
      expect(tree.result.layerCount).toBeGreaterThan(1);
    });
  });
});
