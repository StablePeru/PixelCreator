import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { loadPNG } from '@pixelcreator/core';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): Record<string, unknown> {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('Tileset Tilemap Operations', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tilemap-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 32 --height 16 --name tiles', tmpDir);
    // Two distinct 16x16 tiles
    pxc('draw:rect --x 0 --y 0 --width 16 --height 16 --color "#ff0000" --fill --canvas tiles', tmpDir);
    pxc('draw:rect --x 16 --y 0 --width 16 --height 16 --color "#00ff00" --fill --canvas tiles', tmpDir);
    pxc('tileset:create --name sprites --canvas tiles --tile-width 16 --tile-height 16', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('create-tilemap creates an empty tilemap', () => {
    const result = pxcJSON('tileset:create-tilemap --name sprites --tilemap level1 --width 4 --height 3', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.width).toBe(4);
    expect(result.result.height).toBe(3);
    expect(result.result.cellCount).toBe(12);
  });

  it('set-cell sets a cell in a tilemap', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap level1 --width 4 --height 3', tmpDir);
    const result = pxcJSON('tileset:set-cell --name sprites --tilemap level1 --x 0 --y 0 --tile 0', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.tile).toBe(0);
  });

  it('render-tilemap produces a PNG', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap level1 --width 2 --height 1', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level1 --x 0 --y 0 --tile 0', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level1 --x 1 --y 0 --tile 1', tmpDir);

    const destPath = path.join(tmpDir, 'level1.png');
    const result = pxcJSON(`tileset:render-tilemap --name sprites --tilemap level1 --dest "${destPath}"`, tmpDir) as any;
    expect(result.success).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(result.result.width).toBe(32);
    expect(result.result.height).toBe(16);
  });

  it('render-tilemap pixel content matches tiles', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap check --width 2 --height 1', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap check --x 0 --y 0 --tile 1', tmpDir); // green
    pxc('tileset:set-cell --name sprites --tilemap check --x 1 --y 0 --tile 0', tmpDir); // red

    const destPath = path.join(tmpDir, 'check.png');
    pxc(`tileset:render-tilemap --name sprites --tilemap check --dest "${destPath}"`, tmpDir);

    const rendered = loadPNG(destPath);
    const topLeft = rendered.getPixel(0, 0); // Should be green (tile 1)
    expect(topLeft.g).toBe(255);
    expect(topLeft.r).toBe(0);

    const topRight = rendered.getPixel(16, 0); // Should be red (tile 0)
    expect(topRight.r).toBe(255);
    expect(topRight.g).toBe(0);
  });

  it('render-tilemap with scale', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap scaled --width 1 --height 1', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap scaled --x 0 --y 0 --tile 0', tmpDir);

    const destPath = path.join(tmpDir, 'scaled.png');
    const result = pxcJSON(`tileset:render-tilemap --name sprites --tilemap scaled --dest "${destPath}" --scale 2`, tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.width).toBe(32);
    expect(result.result.height).toBe(32);
  });

  it('full pipeline: create → tilemap → set cells → render', { timeout: 30000 }, () => {
    pxc('tileset:create-tilemap --name sprites --tilemap game --width 3 --height 2', tmpDir);

    // Fill all cells with alternating tiles
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        const tile = (x + y) % 2;
        pxc(`tileset:set-cell --name sprites --tilemap game --x ${x} --y ${y} --tile ${tile}`, tmpDir);
      }
    }

    const destPath = path.join(tmpDir, 'game.png');
    pxc(`tileset:render-tilemap --name sprites --tilemap game --dest "${destPath}"`, tmpDir);

    expect(fs.existsSync(destPath)).toBe(true);
    const rendered = loadPNG(destPath);
    expect(rendered.width).toBe(48); // 3 * 16
    expect(rendered.height).toBe(32); // 2 * 16
  });

  it('create-tilemap with fill sets default tile', () => {
    const result = pxcJSON('tileset:create-tilemap --name sprites --tilemap filled --width 2 --height 2 --fill 0', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.fill).toBe(0);

    // Render to verify all cells have tile 0
    const destPath = path.join(tmpDir, 'filled.png');
    pxc(`tileset:render-tilemap --name sprites --tilemap filled --dest "${destPath}"`, tmpDir);
    const rendered = loadPNG(destPath);
    // All pixels should be red (tile 0)
    expect(rendered.getPixel(0, 0).r).toBe(255);
    expect(rendered.getPixel(16, 0).r).toBe(255);
  });

  it('delete-tilemap removes a tilemap', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap toremove --width 2 --height 2', tmpDir);
    const result = pxcJSON('tileset:delete-tilemap --name sprites --tilemap toremove --force', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.deleted).toBe(true);
    // Verify it's gone by trying to create it again (should succeed)
    const recreate = pxcJSON('tileset:create-tilemap --name sprites --tilemap toremove --width 1 --height 1', tmpDir) as any;
    expect(recreate.success).toBe(true);
  });

  it('delete-tilemap errors for non-existent tilemap', () => {
    expect(() => {
      pxc('tileset:delete-tilemap --name sprites --tilemap nonexistent --force', tmpDir);
    }).toThrow();
  });

  it('tilemap commands return valid JSON', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap jsontest --width 2 --height 2', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap jsontest --x 0 --y 0 --tile 0', tmpDir);

    const destPath = path.join(tmpDir, 'jsontest.png');

    const commands = [
      'tileset:create-tilemap --name sprites --tilemap jsontest2 --width 1 --height 1',
      'tileset:set-cell --name sprites --tilemap jsontest --x 1 --y 0 --tile 1',
      `tileset:render-tilemap --name sprites --tilemap jsontest --dest "${destPath}"`,
    ];

    for (const cmd of commands) {
      const result = pxcJSON(cmd, tmpDir);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('result');
    }
  });
});
