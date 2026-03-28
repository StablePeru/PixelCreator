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

describe('Effect Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-effect-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('effect:drop-shadow', () => {
    it('adds drop shadow to layer', () => {
      const result = pxcJSON('effect:drop-shadow --canvas canvas --layer layer-001 --offset-x 2 --offset-y 2 --color "#000000"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.effectId).toBeDefined();
      expect(result.result.params.offsetX).toBe(2);
    });
  });

  describe('effect:outline', () => {
    it('adds outline with correct params', () => {
      const result = pxcJSON('effect:outline --canvas canvas --layer layer-001 --color "#ff0000" --thickness 2 --position outside', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.params.thickness).toBe(2);
      expect(result.result.params.position).toBe('outside');
    });
  });

  describe('effect:outer-glow', () => {
    it('adds outer glow with defaults', () => {
      const result = pxcJSON('effect:outer-glow --canvas canvas --layer layer-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.params.radius).toBe(2);
    });
  });

  describe('effect:color-overlay', () => {
    it('requires --color flag', () => {
      expect(() => {
        pxc('effect:color-overlay --canvas canvas --layer layer-001', tmpDir);
      }).toThrow();
    });

    it('adds overlay with color', () => {
      const result = pxcJSON('effect:color-overlay --canvas canvas --layer layer-001 --color "#00ff00"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.params.color).toBe('#00ff00');
    });
  });

  describe('effect:list', () => {
    it('lists all effects on a layer', () => {
      pxc('effect:drop-shadow --canvas canvas --layer layer-001', tmpDir);
      pxc('effect:outline --canvas canvas --layer layer-001 --color "#000000"', tmpDir);
      const result = pxcJSON('effect:list --canvas canvas --layer layer-001', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.total).toBe(2);
    });
  });

  describe('effect:toggle', () => {
    it('toggles effect enabled state', () => {
      pxc('effect:drop-shadow --canvas canvas --layer layer-001', tmpDir);
      const list = pxcJSON('effect:list --canvas canvas --layer layer-001', tmpDir);
      const effectId = list.result.effects[0].id;

      const toggled = pxcJSON(`effect:toggle --canvas canvas --layer layer-001 --effect ${effectId}`, tmpDir);
      expect(toggled.success).toBe(true);
      expect(toggled.result.enabled).toBe(false);

      const toggled2 = pxcJSON(`effect:toggle --canvas canvas --layer layer-001 --effect ${effectId}`, tmpDir);
      expect(toggled2.result.enabled).toBe(true);
    });
  });

  describe('effect:remove', () => {
    it('removes effect by ID', () => {
      pxc('effect:drop-shadow --canvas canvas --layer layer-001', tmpDir);
      const list = pxcJSON('effect:list --canvas canvas --layer layer-001', tmpDir);
      const effectId = list.result.effects[0].id;

      const result = pxcJSON(`effect:remove --canvas canvas --layer layer-001 --effect ${effectId}`, tmpDir);
      expect(result.success).toBe(true);

      const list2 = pxcJSON('effect:list --canvas canvas --layer layer-001', tmpDir);
      expect(list2.result.total).toBe(0);
    });
  });

  describe('effect:edit', () => {
    it('updates effect parameters', () => {
      pxc('effect:drop-shadow --canvas canvas --layer layer-001 --offset-x 2', tmpDir);
      const list = pxcJSON('effect:list --canvas canvas --layer layer-001', tmpDir);
      const effectId = list.result.effects[0].id;

      const result = pxcJSON(`effect:edit --canvas canvas --layer layer-001 --effect ${effectId} --params "{\\"offsetX\\":5}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.params.offsetX).toBe(5);
    });
  });

  describe('effect:reorder', () => {
    it('changes effect order', () => {
      pxc('effect:drop-shadow --canvas canvas --layer layer-001', tmpDir);
      pxc('effect:outline --canvas canvas --layer layer-001 --color "#000000"', tmpDir);

      const list = pxcJSON('effect:list --canvas canvas --layer layer-001', tmpDir);
      const ids = list.result.effects.map((e: any) => e.id);

      // Reverse order
      const reversed = [...ids].reverse().join(',');
      const result = pxcJSON(`effect:reorder --canvas canvas --layer layer-001 --order ${reversed}`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.order[0]).toBe(ids[1]);
    });
  });

  describe('effect:add', () => {
    it('adds effect generically with JSON params', () => {
      const result = pxcJSON('effect:add --canvas canvas --layer layer-001 --type drop-shadow --params "{\\"offsetX\\":3,\\"offsetY\\":3,\\"color\\":\\"#000000\\",\\"blur\\":0,\\"opacity\\":128}"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('drop-shadow');
    });
  });
});
