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

describe('Layer Operations', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-layerops-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:merge-visible', () => {
    it('merges visible layers into one', () => {
      pxc('canvas:create --width 8 --height 8 --name multi', tmpDir);
      pxc('layer:add --canvas multi --name top', tmpDir);
      pxc('draw:rect --canvas multi --layer layer-001 --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
      pxc('draw:rect --canvas multi --layer layer-002 --x 2 --y 2 --width 4 --height 4 --color "#0000ff" --fill', tmpDir);

      const result = pxcJSON('layer:merge-visible --canvas multi --name flat', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.mergedLayerCount).toBe(2);
      expect(result.result.newLayerName).toBe('flat');

      const layers = pxcJSON('layer:list --canvas multi', tmpDir);
      expect(layers.result.layers.length).toBe(1);
    });

    it('keeps originals with --keep flag', () => {
      pxc('canvas:create --width 4 --height 4 --name keeptest', tmpDir);
      pxc('layer:add --canvas keeptest --name second', tmpDir);

      const result = pxcJSON('layer:merge-visible --canvas keeptest --name merged --keep', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.kept).toBe(true);

      const layers = pxcJSON('layer:list --canvas keeptest', tmpDir);
      // Original 2 + 1 merged = 3
      expect(layers.result.layers.length).toBe(3);
    });

    it('errors when no visible layers', () => {
      pxc('canvas:create --width 4 --height 4 --name hidden', tmpDir);
      pxc('layer:edit --canvas hidden --layer layer-001 --visible false', tmpDir);
      expect(() => {
        pxc('layer:merge-visible --canvas hidden', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:dither', () => {
    it('dithers layer with palette', () => {
      pxc('canvas:create --width 4 --height 4 --name dtest', tmpDir);
      pxc('draw:rect --canvas dtest --x 0 --y 0 --width 4 --height 4 --color "#808080" --fill', tmpDir);
      pxc('palette:create --name bw --colors "#000000,#ffffff"', tmpDir);

      const result = pxcJSON('layer:dither --canvas dtest --layer layer-001 --palette bw --method ordered', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.method).toBe('ordered');
      expect(result.result.framesProcessed).toBe(1);
    });

    it('supports floyd-steinberg method', () => {
      pxc('canvas:create --width 4 --height 4 --name fstest', tmpDir);
      pxc('draw:rect --canvas fstest --x 0 --y 0 --width 4 --height 4 --color "#808080" --fill', tmpDir);
      pxc('palette:create --name bw2 --colors "#000000,#ffffff"', tmpDir);

      const result = pxcJSON('layer:dither --canvas fstest --layer layer-001 --palette bw2 --method floyd-steinberg', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.method).toBe('floyd-steinberg');
    });
  });

  describe('export:layers', () => {
    it('exports each layer as separate PNG', () => {
      pxc('canvas:create --width 4 --height 4 --name hero', tmpDir);
      pxc('layer:add --canvas hero --name outline', tmpDir);
      pxc('draw:rect --canvas hero --layer layer-001 --x 0 --y 0 --width 4 --height 4 --color "#ff0000" --fill', tmpDir);

      const destDir = path.join(tmpDir, 'layer-export');
      const result = pxcJSON(`export:layers --canvas hero --dest "${destDir}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.layersExported).toBe(2);
      expect(result.result.files.length).toBe(2);

      // Check files exist
      for (const f of result.result.files) {
        expect(fs.existsSync(f)).toBe(true);
      }
    });

    it('exports with flatten option', () => {
      pxc('canvas:create --width 4 --height 4 --name flattest', tmpDir);

      const destDir = path.join(tmpDir, 'flat-export');
      const result = pxcJSON(`export:layers --canvas flattest --dest "${destDir}" --flatten`, tmpDir);
      expect(result.success).toBe(true);
      // 1 layer + 1 flattened
      expect(result.result.files.length).toBe(2);

      const flatFile = result.result.files.find((f: string) => f.includes('flattened'));
      expect(flatFile).toBeDefined();
      expect(fs.existsSync(flatFile)).toBe(true);
    });

    it('exports with scale factor', () => {
      pxc('canvas:create --width 4 --height 4 --name scaled', tmpDir);

      const destDir = path.join(tmpDir, 'scaled-export');
      const result = pxcJSON(`export:layers --canvas scaled --dest "${destDir}" --scale 2`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.scale).toBe(2);
    });
  });
});
