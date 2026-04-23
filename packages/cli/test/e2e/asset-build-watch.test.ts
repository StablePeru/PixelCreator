import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync, spawn, ChildProcess } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 30000 });
}

async function waitFor(
  predicate: () => boolean,
  { timeoutMs = 10000, intervalMs = 100 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('waitFor timed out');
}

describe('E2E asset:build --watch', () => {
  let tmpDir: string;
  let child: ChildProcess | null;
  const CANVAS = 'watchcanvas';
  const ASSET = 'watched';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-asset-watch-'));
    child = null;

    pxc('project:init --name test', tmpDir);
    pxc(`canvas:create --width 4 --height 1 --name ${CANVAS}`, tmpDir);
    pxc(`draw:pixel --canvas ${CANVAS} --x 0 --y 0 --color "#ff0000"`, tmpDir);

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

  afterEach(async () => {
    if (child) {
      const exited = new Promise<void>((resolve) => {
        if (child!.exitCode !== null) return resolve();
        child!.once('exit', () => resolve());
      });
      if (!child.killed) child.kill();
      // Wait up to 3s for the child to exit so it releases file handles.
      await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup on Windows — occasional EPERM from lingering handles.
    }
  });

  it(
    'runs an initial build and rebuilds when the spec changes',
    async () => {
      const specPath = path.join(tmpDir, 'test.pxc', 'assets', `${ASSET}.asset.json`);
      const destDir = path.join(tmpDir, 'watch-out');

      const stdoutChunks: string[] = [];
      child = spawn(
        'node',
        [BIN, 'asset:build', '--name', ASSET, '--watch', '--debounce', '100', '--dest', destDir],
        { cwd: tmpDir },
      );
      child.stdout?.on('data', (d: Buffer) => stdoutChunks.push(d.toString()));
      child.stderr?.on('data', (d: Buffer) => stdoutChunks.push(d.toString()));

      // Wait for the first successful build.
      await waitFor(
        () => stdoutChunks.join('').includes('Initial build complete'),
        { timeoutMs: 12000 },
      );

      // Confirm output files exist.
      expect(fs.existsSync(destDir)).toBe(true);
      const filesBefore = fs.readdirSync(destDir).sort();
      expect(filesBefore.length).toBeGreaterThan(0);

      // Mutate the spec — bump scale to 2.
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
      spec.export.scale = 2;
      fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

      // Wait for the rebuild log.
      await waitFor(
        () => {
          const joined = stdoutChunks.join('');
          const matches = joined.match(/Rebuild complete/g);
          return !!matches && matches.length >= 1;
        },
        { timeoutMs: 12000 },
      );

      // Confirm rebuild wrote files again (possibly same filenames, new contents).
      const filesAfter = fs.readdirSync(destDir).sort();
      expect(filesAfter.length).toBeGreaterThan(0);
    },
    20000,
  );
});
