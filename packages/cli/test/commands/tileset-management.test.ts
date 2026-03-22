import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): Record<string, unknown> {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('Tileset Management', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tileset-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 32 --height 32 --name terrain', tmpDir);
    // Draw distinct 16x16 tiles in the 32x32 canvas
    pxc('draw:rect --x 0 --y 0 --width 16 --height 16 --color "#ff0000" --fill --canvas terrain', tmpDir);
    pxc('draw:rect --x 16 --y 0 --width 16 --height 16 --color "#00ff00" --fill --canvas terrain', tmpDir);
    pxc('draw:rect --x 0 --y 16 --width 16 --height 16 --color "#0000ff" --fill --canvas terrain', tmpDir);
    pxc('draw:rect --x 16 --y 16 --width 16 --height 16 --color "#ff0000" --fill --canvas terrain', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('create tileset from canvas with dedup', () => {
    const result = pxcJSON('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.uniqueTiles).toBe(3); // red appears twice
    expect(result.result.totalSliced).toBe(4);
    expect(result.result.deduplicated).toBe(1);

    // Verify JSON exists
    const tilesetJson = path.join(tmpDir, 'test.pxc', 'tilesets', 'terrain', 'tileset.json');
    expect(fs.existsSync(tilesetJson)).toBe(true);

    // Verify tile PNGs exist
    const tilesDir = path.join(tmpDir, 'test.pxc', 'tilesets', 'terrain', 'tiles');
    expect(fs.existsSync(path.join(tilesDir, 'tile-001.png'))).toBe(true);
    expect(fs.existsSync(path.join(tilesDir, 'tile-002.png'))).toBe(true);
    expect(fs.existsSync(path.join(tilesDir, 'tile-003.png'))).toBe(true);
  });

  it('create tileset from file', () => {
    // Export canvas first, then create tileset from file
    const exportPath = path.join(tmpDir, 'source.png');
    pxc(`export:png --canvas terrain --dest "${exportPath}"`, tmpDir);

    const result = pxcJSON(`tileset:create --name fromfile --file "${exportPath}" --tile-width 16 --tile-height 16`, tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.uniqueTiles).toBe(3);
  });

  it('create tileset without dedup', () => {
    const result = pxcJSON('tileset:create --name nodup --canvas terrain --tile-width 16 --tile-height 16 --no-deduplicate', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.uniqueTiles).toBe(4); // all kept
    expect(result.result.deduplicated).toBe(0);
  });

  it('tileset:info shows correct data', () => {
    pxc('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir);
    const info = pxcJSON('tileset:info --name terrain', tmpDir) as any;
    expect(info.success).toBe(true);
    expect(info.result.tileCount).toBe(3);
    expect(info.result.tileWidth).toBe(16);
    expect(info.result.tileHeight).toBe(16);
    expect(info.result.tilemapCount).toBe(1); // source tilemap
  });

  it('tileset:list shows all tilesets', () => {
    pxc('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir);
    const list = pxcJSON('tileset:list', tmpDir) as any;
    expect(list.success).toBe(true);
    expect(list.result.count).toBe(1);
    expect(list.result.tilesets[0].name).toBe('terrain');
  });

  it('tileset:add-tile adds a new tile', () => {
    pxc('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir);

    // Create a 16x16 PNG to add
    pxc('canvas:create --width 16 --height 16 --name newtile', tmpDir);
    pxc('draw:rect --x 0 --y 0 --width 16 --height 16 --color "#ffff00" --fill --canvas newtile', tmpDir);
    const tilePath = path.join(tmpDir, 'newtile.png');
    pxc(`export:png --canvas newtile --dest "${tilePath}"`, tmpDir);

    const result = pxcJSON(`tileset:add-tile --name terrain --file "${tilePath}" --label yellow`, tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.index).toBe(3);

    const info = pxcJSON('tileset:info --name terrain', tmpDir) as any;
    expect(info.result.tileCount).toBe(4);
  });

  it('tileset:remove-tile removes a tile and updates tilemaps', () => {
    pxc('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir);

    const result = pxcJSON('tileset:remove-tile --name terrain --tile 0', tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.remainingTiles).toBe(2);
  });

  it('all tileset commands return valid JSON', () => {
    pxc('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir);

    const commands = [
      'tileset:info --name terrain',
      'tileset:list',
    ];

    for (const cmd of commands) {
      const result = pxcJSON(cmd, tmpDir);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('duration');
    }
  });

  it('tileset is registered in project.json', () => {
    pxc('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir);
    const project = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8'));
    expect(project.tilesets).toContain('terrain');
  });
});
