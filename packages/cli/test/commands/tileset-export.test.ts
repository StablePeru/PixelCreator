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

describe('Tileset Export', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tsexport-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 32 --height 16 --name tiles', tmpDir);
    pxc('draw:rect --x 0 --y 0 --width 16 --height 16 --color "#ff0000" --fill --canvas tiles', tmpDir);
    pxc('draw:rect --x 16 --y 0 --width 16 --height 16 --color "#00ff00" --fill --canvas tiles', tmpDir);
    pxc('tileset:create --name sprites --canvas tiles --tile-width 16 --tile-height 16', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('export generic: PNG + JSON created', () => {
    const destDir = path.join(tmpDir, 'export');
    const result = pxcJSON(`tileset:export --name sprites --dest "${destDir}"`, tmpDir) as any;
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'sprites.png'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'sprites.json'))).toBe(true);

    const meta = JSON.parse(fs.readFileSync(path.join(destDir, 'sprites.json'), 'utf-8'));
    expect(meta.tileWidth).toBe(16);
    expect(meta.tileHeight).toBe(16);
    expect(meta.tileCount).toBe(2);
  });

  it('export tiled: TSJ structure correct', () => {
    const destDir = path.join(tmpDir, 'tiled-export');
    const result = pxcJSON(`tileset:export --name sprites --dest "${destDir}" --format tiled`, tmpDir) as any;
    expect(result.success).toBe(true);

    const tsj = JSON.parse(fs.readFileSync(path.join(destDir, 'sprites.json'), 'utf-8'));
    expect(tsj.type).toBe('tileset');
    expect(tsj.tilewidth).toBe(16);
    expect(tsj.tileheight).toBe(16);
    expect(tsj.tilecount).toBe(2);
    expect(tsj.image).toBe('sprites.png');
    expect(tsj.columns).toBeGreaterThan(0);
  });

  it('export with spacing', () => {
    const destDir = path.join(tmpDir, 'spaced');
    const result = pxcJSON(`tileset:export --name sprites --dest "${destDir}" --spacing 2 --columns 2`, tmpDir) as any;
    expect(result.success).toBe(true);
    expect(result.result.sheetWidth).toBe(34); // 16 + 2 + 16
  });

  it('export with scale', () => {
    const destDir = path.join(tmpDir, 'scaled');
    const result = pxcJSON(`tileset:export --name sprites --dest "${destDir}" --scale 2`, tmpDir) as any;
    expect(result.success).toBe(true);
    // 2 tiles in auto columns layout, scaled 2x
    expect(result.result.sheetWidth).toBeGreaterThanOrEqual(32);
  });

  it('export-tilemap as CSV', () => {
    // Create a tilemap first
    pxc('tileset:create-tilemap --name sprites --tilemap level --width 3 --height 2', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level --x 0 --y 0 --tile 0', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level --x 1 --y 0 --tile 1', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level --x 2 --y 0 --tile 0', tmpDir);

    const destPath = path.join(tmpDir, 'level.csv');
    const result = pxcJSON(`tileset:export-tilemap --name sprites --tilemap level --dest "${destPath}" --format csv`, tmpDir) as any;
    expect(result.success).toBe(true);

    const csv = fs.readFileSync(destPath, 'utf-8');
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('0,1,0');
    expect(lines[1]).toBe('-1,-1,-1');
  });

  it('export-tilemap as tiled TMJ', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap level --width 2 --height 1', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level --x 0 --y 0 --tile 0', tmpDir);
    pxc('tileset:set-cell --name sprites --tilemap level --x 1 --y 0 --tile 1', tmpDir);

    const destPath = path.join(tmpDir, 'level.tmj');
    const result = pxcJSON(`tileset:export-tilemap --name sprites --tilemap level --dest "${destPath}" --format tiled`, tmpDir) as any;
    expect(result.success).toBe(true);

    const tmj = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
    expect(tmj.type).toBe('map');
    expect(tmj.width).toBe(2);
    expect(tmj.height).toBe(1);
    expect(tmj.layers).toHaveLength(1);
    // Tiled uses 1-based indices (0 = empty)
    expect(tmj.layers[0].data).toEqual([1, 2]);
  });

  it('export-tilemap as generic JSON', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap level --width 2 --height 2', tmpDir);

    const destPath = path.join(tmpDir, 'level.json');
    const result = pxcJSON(`tileset:export-tilemap --name sprites --tilemap level --dest "${destPath}" --format generic`, tmpDir) as any;
    expect(result.success).toBe(true);

    const data = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
    expect(data.name).toBe('level');
    expect(data.width).toBe(2);
    expect(data.height).toBe(2);
    expect(data.cells).toHaveLength(4);
  });

  it('export commands return valid JSON', () => {
    pxc('tileset:create-tilemap --name sprites --tilemap test --width 1 --height 1', tmpDir);

    const destDir = path.join(tmpDir, 'exp');
    const destFile = path.join(tmpDir, 'test.json');

    const r1 = pxcJSON(`tileset:export --name sprites --dest "${destDir}"`, tmpDir);
    expect(r1).toHaveProperty('success');
    expect(r1).toHaveProperty('command');

    const r2 = pxcJSON(`tileset:export-tilemap --name sprites --tilemap test --dest "${destFile}"`, tmpDir);
    expect(r2).toHaveProperty('success');
    expect(r2).toHaveProperty('command');
  });
});
