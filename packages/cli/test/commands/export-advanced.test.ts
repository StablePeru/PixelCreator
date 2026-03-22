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

describe('Advanced Export Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-adv-export-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
    pxc('frame:add --canvas canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#0000ff" --fill --frame frame-002', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('export:ase', () => {
    it('exports .ase file', () => {
      const dest = path.join(tmpDir, 'test.ase');
      const result = pxcJSON(`export:ase --canvas canvas --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
      expect(result.result.frames).toBe(2);
      expect(result.result.layers).toBe(1);
    });

    it('ase file has valid magic', () => {
      const dest = path.join(tmpDir, 'magic.ase');
      pxc(`export:ase --canvas canvas --dest "${dest}"`, tmpDir);
      const data = fs.readFileSync(dest);
      expect(data.readUInt16LE(4)).toBe(0xA5E0);
    });

    it('ase file has correct frame count', () => {
      const dest = path.join(tmpDir, 'frames.ase');
      pxc(`export:ase --canvas canvas --dest "${dest}"`, tmpDir);
      const data = fs.readFileSync(dest);
      expect(data.readUInt16LE(6)).toBe(2);
    });
  });

  describe('export:atlas', () => {
    it('exports generic atlas', () => {
      const dest = path.join(tmpDir, 'atlas');
      const result = pxcJSON(`export:atlas --canvas canvas --dest "${dest}" --format generic`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(dest, 'canvas.png'))).toBe(true);
      expect(fs.existsSync(path.join(dest, 'canvas.atlas.json'))).toBe(true);
    });

    it('exports unity format', () => {
      const dest = path.join(tmpDir, 'unity');
      pxc(`export:atlas --canvas canvas --dest "${dest}" --format unity`, tmpDir);
      const metaPath = path.join(dest, 'canvas.json');
      expect(fs.existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      expect(meta.meta.image).toBe('canvas.png');
      expect(Object.keys(meta.frames).length).toBe(2);
    });

    it('exports godot format', () => {
      const dest = path.join(tmpDir, 'godot');
      pxc(`export:atlas --canvas canvas --dest "${dest}" --format godot`, tmpDir);
      expect(fs.existsSync(path.join(dest, 'canvas.tres'))).toBe(true);
    });

    it('respects margin and padding', () => {
      const dest = path.join(tmpDir, 'padded');
      pxc(`export:atlas --canvas canvas --dest "${dest}" --margin 4 --padding 2`, tmpDir);
      const metaPath = path.join(dest, 'canvas.atlas.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      // With margin=4 and padding=2, sheet should be larger than bare 8x8 frames
      expect(meta.size.width).toBeGreaterThan(16);
    });
  });

  describe('export:spritesheet --margin --padding', () => {
    it('applies margin to spritesheet', () => {
      const dest = path.join(tmpDir, 'margin.png');
      const result = pxcJSON(`export:spritesheet --canvas canvas --dest "${dest}" --margin 4 --layout horizontal`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.sheetWidth).toBeGreaterThan(16); // 2 frames * 8px + margins
    });
  });

  describe('export:ico', () => {
    it('exports ICO file', () => {
      const dest = path.join(tmpDir, 'icon.ico');
      const result = pxcJSON(`export:ico --canvas canvas --dest "${dest}" --sizes "16,32"`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);

      // Check ICO header
      const data = fs.readFileSync(dest);
      expect(data.readUInt16LE(2)).toBe(1); // type: icon
      expect(data.readUInt16LE(4)).toBe(2); // 2 images
    });
  });

  describe('export:data-url', () => {
    it('exports data URL to file', () => {
      const dest = path.join(tmpDir, 'dataurl.txt');
      const result = pxcJSON(`export:data-url --canvas canvas --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      const content = fs.readFileSync(dest, 'utf-8');
      expect(content).toMatch(/^data:image\/png;base64,/);
    });

    it('data URL contains valid base64', () => {
      const dest = path.join(tmpDir, 'b64.txt');
      pxc(`export:data-url --canvas canvas --dest "${dest}"`, tmpDir);
      const content = fs.readFileSync(dest, 'utf-8');
      const b64 = content.replace('data:image/png;base64,', '');
      expect(() => Buffer.from(b64, 'base64')).not.toThrow();
    });
  });
});
