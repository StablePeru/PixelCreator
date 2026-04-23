import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 30000 });
}

interface ExecError extends Error {
  status: number;
  stderr: string;
  stdout: string;
}

function pxcExpectFail(args: string, cwd: string): ExecError {
  try {
    execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 30000 });
    throw new Error(`Command should have failed: ${args}`);
  } catch (err) {
    const e = err as ExecError;
    if (typeof e.status !== 'number') throw err;
    return e;
  }
}

describe('E2E asset:build — maxColors enforcement', () => {
  let tmpDir: string;
  const CANVAS = 'palette-overflow';
  const ASSET = 'overflow';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-asset-maxcolors-'));
    pxc('project:init --name test', tmpDir);
    // 4x1 canvas — one frame, four distinct pixels with four distinct RGBAs
    pxc(`canvas:create --width 4 --height 1 --name ${CANVAS}`, tmpDir);
    pxc(`draw:pixel --canvas ${CANVAS} --x 0 --y 0 --color "#ff0000"`, tmpDir);
    pxc(`draw:pixel --canvas ${CANVAS} --x 1 --y 0 --color "#00ff00"`, tmpDir);
    pxc(`draw:pixel --canvas ${CANVAS} --x 2 --y 0 --color "#0000ff"`, tmpDir);
    pxc(`draw:pixel --canvas ${CANVAS} --x 3 --y 0 --color "#ffff00"`, tmpDir);

    // Write spec with maxColors=2 (canvas has 4 unique colors → should fail)
    const spec = {
      name: ASSET,
      type: 'character-spritesheet',
      canvas: CANVAS,
      frameSize: { width: 4, height: 1 },
      animations: [
        { name: 'idle', from: 0, to: 0, fps: 1, direction: 'forward', loop: true },
      ],
      export: { engine: 'generic', scale: 1, layout: 'horizontal', padding: 0 },
      constraints: {
        maxColors: 2,
        requireAllFramesFilled: true,
        spatialConsistency: {
          enabled: false,
          baselineTolerance: 2,
          horizontalTolerance: 2,
          topExtentRatio: 2,
          lateralExtentRatio: 2,
        },
      },
    };
    const assetsDir = path.join(tmpDir, 'test.pxc', 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, `${ASSET}.asset.json`),
      JSON.stringify(spec, null, 2),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // oclif wraps long stderr lines at terminal width; collapse whitespace before asserting.
  const normalize = (s: string) => s.replace(/[»\s]+/g, ' ').trim();

  it('asset:build fails with a clear maxColors error and actionable hint', () => {
    const err = pxcExpectFail(`asset:build --name ${ASSET}`, tmpDir);
    expect(err.status).not.toBe(0);
    const output = normalize(err.stderr + err.stdout);
    expect(output).toContain('maxColors');
    expect(output).toContain('4 unique colors');
    expect(output).toContain('maxColors is 2');
    expect(output).toContain('pxc palette:generate');
    expect(output).toContain(`--canvas ${CANVAS}`);
    expect(output).toContain('--max-colors 2');
  });

  it('asset:validate reports the same maxColors error without --strict', () => {
    const err = pxcExpectFail(`asset:validate --name ${ASSET}`, tmpDir);
    expect(err.status).not.toBe(0);
    const output = normalize(err.stderr + err.stdout);
    expect(output).toContain('maxColors');
    expect(output).toContain('4 unique colors');
  });

  it('asset:build succeeds once maxColors is raised to cover the palette', () => {
    // Patch spec in place: raise maxColors to 4
    const specPath = path.join(tmpDir, 'test.pxc', 'assets', `${ASSET}.asset.json`);
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    spec.constraints.maxColors = 4;
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

    const out = pxc(`asset:build --name ${ASSET} --output json`, tmpDir);
    const parsed = JSON.parse(out) as { success: boolean; result: { fileCount: number } };
    expect(parsed.success).toBe(true);
    expect(parsed.result.fileCount).toBeGreaterThan(0);
  });
});
