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

describe('E2E asset pipeline — biome-blend slice', () => {
  let tmpDir: string;
  const SOURCE = 'grass';
  const TARGET = 'sand';
  const ASSET = 'grass_to_sand';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-biome-blend-e2e-'));
    pxc('project:init --name test', tmpDir);

    pxc(`canvas:create --width 16 --height 16 --name ${SOURCE}`, tmpDir);
    pxc(
      `draw:rect --x 0 --y 0 --width 16 --height 16 --color "#3cb43c" --fill --canvas ${SOURCE}`,
      tmpDir,
    );

    pxc(`canvas:create --width 16 --height 16 --name ${TARGET}`, tmpDir);
    pxc(
      `draw:rect --x 0 --y 0 --width 16 --height 16 --color "#e6c88c" --fill --canvas ${TARGET}`,
      tmpDir,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('init + list + validate + build produce Godot TileSet artifacts', () => {
    const init = pxcJSON(
      `asset:init --name ${ASSET} --type biome-blend --source-canvas ${SOURCE} --target-canvas ${TARGET} --tile-size 16x16 --engine godot`,
      tmpDir,
    ) as {
      result: {
        type: string;
        engine: string;
        sourceCanvas: string;
        targetCanvas: string;
        path: string;
      };
    };
    expect(init.result.type).toBe('biome-blend');
    expect(init.result.sourceCanvas).toBe(SOURCE);
    expect(init.result.targetCanvas).toBe(TARGET);

    const specPath = path.join(tmpDir, 'test.pxc', 'assets', `${ASSET}.asset.json`);
    expect(fs.existsSync(specPath)).toBe(true);
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    expect(spec.type).toBe('biome-blend');
    expect(spec.tileSize).toEqual({ width: 16, height: 16 });
    expect(spec.source.canvas).toBe(SOURCE);
    expect(spec.target.canvas).toBe(TARGET);

    // list should surface it with the biome-blend display branch
    const listOut = pxc(`asset:list`, tmpDir);
    expect(listOut).toContain(ASSET);
    expect(listOut).toContain('biome-blend');
    expect(listOut).toContain(`source=${SOURCE}`);
    expect(listOut).toContain(`target=${TARGET}`);

    const validate = pxcJSON(`asset:validate --name ${ASSET}`, tmpDir) as {
      result: { allValid: boolean };
    };
    expect(validate.result.allValid).toBe(true);

    const destDir = path.join(tmpDir, 'godot-out');
    const build = pxcJSON(
      `asset:build --name ${ASSET} --dest "${destDir}"`,
      tmpDir,
    ) as {
      result: { files: string[]; engine: string };
    };
    expect(build.result.engine).toBe('godot');

    const atlasPng = path.join(destDir, `${ASSET}_blend.png`);
    const tresFile = path.join(destDir, `${ASSET}.tres`);
    const specOut = path.join(destDir, `${ASSET}.asset.json`);

    expect(fs.existsSync(atlasPng)).toBe(true);
    expect(fs.existsSync(tresFile)).toBe(true);
    expect(fs.existsSync(specOut)).toBe(true);

    const tres = fs.readFileSync(tresFile, 'utf-8');
    expect(tres).toContain('[gd_resource type="TileSet" format=3');
    expect(tres).toContain('tile_size = Vector2i(16, 16)');
    expect(tres).toContain('sources/0 = SubResource("TileSetAtlasSource_1")');
    // With default columns (min(47, 12) = 12), all 47 tiles must be declared.
    expect(tres).toContain('0:0/0 = 0');
  });

  it('rejects biome-blend init without --source-canvas and --target-canvas', () => {
    expect(() =>
      pxc(
        `asset:init --name ${ASSET} --type biome-blend --tile-size 16x16 --engine generic`,
        tmpDir,
      ),
    ).toThrow();
  });

  it('rejects biome-blend init without --tile-size', () => {
    expect(() =>
      pxc(
        `asset:init --name ${ASSET} --type biome-blend --source-canvas ${SOURCE} --target-canvas ${TARGET} --engine generic`,
        tmpDir,
      ),
    ).toThrow();
  });

  it('doubles tile count with --include-inverse', () => {
    pxc(
      `asset:init --name ${ASSET} --type biome-blend --source-canvas ${SOURCE} --target-canvas ${TARGET} --tile-size 16x16 --include-inverse --engine generic`,
      tmpDir,
    );
    const destDir = path.join(tmpDir, 'generic-out');
    pxc(`asset:build --name ${ASSET} --dest "${destDir}"`, tmpDir);

    const metadataPath = path.join(destDir, `${ASSET}.blend.json`);
    expect(fs.existsSync(metadataPath)).toBe(true);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    expect(metadata.tileCount).toBe(94);
  });
});
