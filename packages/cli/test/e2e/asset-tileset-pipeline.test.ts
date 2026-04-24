import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 30000 });
}

function pxcJSON(args: string, cwd: string): Record<string, unknown> {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('E2E asset pipeline — tileset slice', () => {
  let tmpDir: string;
  const CANVAS = 'terrain';
  const ASSET = 'terrain_tiles';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tileset-e2e-'));
    pxc('project:init --name test', tmpDir);
    // 32x32 canvas splits into a 2x2 grid of 16x16 tiles
    pxc(`canvas:create --width 32 --height 32 --name ${CANVAS}`, tmpDir);
    // Paint four distinct 16x16 quadrants so tiles dedupe cleanly
    const quadrants: Array<{ x: number; y: number; color: string }> = [
      { x: 0, y: 0, color: '#ff0000' },
      { x: 16, y: 0, color: '#00ff00' },
      { x: 0, y: 16, color: '#0000ff' },
      { x: 16, y: 16, color: '#ffff00' },
    ];
    for (const q of quadrants) {
      pxc(
        `draw:rect --x ${q.x} --y ${q.y} --width 16 --height 16 --color "${q.color}" --fill --canvas ${CANVAS}`,
        tmpDir,
      );
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('init + validate + build produce Godot TileSet artifacts', () => {
    // 1. Init tileset asset spec
    const init = pxcJSON(
      `asset:init --name ${ASSET} --canvas ${CANVAS} --type tileset --tile-size 16x16 --engine godot`,
      tmpDir,
    ) as {
      result: { type: string; engine: string; path: string };
    };
    expect(init.result.type).toBe('tileset');
    expect(init.result.engine).toBe('godot');

    const specPath = path.join(tmpDir, 'test.pxc', 'assets', `${ASSET}.asset.json`);
    expect(fs.existsSync(specPath)).toBe(true);
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    expect(spec.type).toBe('tileset');
    expect(spec.tileSize).toEqual({ width: 16, height: 16 });

    // 2. Validate (should pass)
    const validate = pxcJSON(`asset:validate --name ${ASSET}`, tmpDir) as {
      result: { allValid: boolean };
    };
    expect(validate.result.allValid).toBe(true);

    // 3. Build
    const destDir = path.join(tmpDir, 'godot-out');
    const build = pxcJSON(
      `asset:build --name ${ASSET} --dest "${destDir}"`,
      tmpDir,
    ) as {
      result: { files: string[]; engine: string };
    };
    expect(build.result.engine).toBe('godot');

    const atlasPng = path.join(destDir, `${ASSET}_tileset.png`);
    const tresFile = path.join(destDir, `${ASSET}.tres`);
    const specOut = path.join(destDir, `${ASSET}.asset.json`);

    expect(fs.existsSync(atlasPng)).toBe(true);
    expect(fs.existsSync(tresFile)).toBe(true);
    expect(fs.existsSync(specOut)).toBe(true);

    const tres = fs.readFileSync(tresFile, 'utf-8');
    expect(tres).toContain('[gd_resource type="TileSet" format=3');
    expect(tres).toContain('tile_size = Vector2i(16, 16)');
    expect(tres).toContain('sources/0 = SubResource("TileSetAtlasSource_1")');

    // 4 tiles in a 2x2 grid — all cells must be declared
    expect(tres).toContain('0:0/0 = 0');
    expect(tres).toContain('1:0/0 = 0');
    expect(tres).toContain('0:1/0 = 0');
    expect(tres).toContain('1:1/0 = 0');
  });

  it('rejects tileset init without --tile-size', () => {
    expect(() =>
      pxc(
        `asset:init --name ${ASSET} --canvas ${CANVAS} --type tileset --engine godot`,
        tmpDir,
      ),
    ).toThrow();
  });

  it('rejects tileset init with non-divisible tile size', () => {
    // Canvas is 32x32, tile 15x15 does not divide evenly — validation catches it.
    pxc(
      `asset:init --name ${ASSET} --canvas ${CANVAS} --type tileset --tile-size 15x15 --engine generic`,
      tmpDir,
    );
    expect(() => pxc(`asset:validate --name ${ASSET}`, tmpDir)).toThrow();
  });
});
