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
  return JSON.parse(pxc(`${args} --output json`, cwd));
}

describe('E2E asset:list', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-asset-list-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty list for a project without any asset specs', () => {
    const out = pxcJSON('asset:list', tmpDir) as {
      result: { assets: unknown[]; count: number };
    };
    expect(out.result.count).toBe(0);
    expect(out.result.assets).toEqual([]);
  });

  it('lists all specs under .pxc/assets/ with parsed metadata', () => {
    pxc('canvas:create --width 16 --height 16 --name hero', tmpDir);
    pxc('canvas:create --width 32 --height 32 --name enemy', tmpDir);
    pxc('asset:init --name hero --canvas hero --engine godot', tmpDir);
    pxc('asset:init --name enemy --canvas enemy --engine unity --scale 2', tmpDir);

    const out = pxcJSON('asset:list', tmpDir) as {
      result: {
        count: number;
        assets: Array<{
          name: string;
          valid: boolean;
          type: string;
          canvas: string;
          engine: string;
          scale: number;
          animationCount: number;
          animationNames: string[];
        }>;
      };
    };

    expect(out.result.count).toBe(2);
    const byName = new Map(out.result.assets.map((a) => [a.name, a]));

    const hero = byName.get('hero')!;
    expect(hero).toBeDefined();
    expect(hero.valid).toBe(true);
    expect(hero.type).toBe('character-spritesheet');
    expect(hero.canvas).toBe('hero');
    expect(hero.engine).toBe('godot');
    expect(hero.scale).toBe(1);
    expect(hero.animationCount).toBeGreaterThanOrEqual(1);

    const enemy = byName.get('enemy')!;
    expect(enemy).toBeDefined();
    expect(enemy.engine).toBe('unity');
    expect(enemy.scale).toBe(2);
  });

  it('marks specs with malformed JSON as invalid without aborting the listing', () => {
    pxc('canvas:create --width 16 --height 16 --name hero', tmpDir);
    pxc('asset:init --name hero --canvas hero', tmpDir);

    // Inject a broken spec file directly
    const assetsDir = path.join(tmpDir, 'test.pxc', 'assets');
    fs.writeFileSync(
      path.join(assetsDir, 'broken.asset.json'),
      '{ this is not valid JSON }',
    );

    const out = pxcJSON('asset:list', tmpDir) as {
      result: {
        count: number;
        assets: Array<{ name: string; valid: boolean; error?: string }>;
      };
    };

    expect(out.result.count).toBe(2);
    const byName = new Map(out.result.assets.map((a) => [a.name, a]));
    expect(byName.get('hero')!.valid).toBe(true);
    expect(byName.get('broken')!.valid).toBe(false);
    expect(byName.get('broken')!.error).toBeTruthy();
  });

  it('text output is human-readable and includes animation names with --details', () => {
    pxc('canvas:create --width 16 --height 16 --name hero', tmpDir);
    pxc('asset:init --name hero --canvas hero', tmpDir);

    const text = pxc('asset:list --details', tmpDir);
    expect(text).toContain('hero');
    expect(text).toContain('canvas=hero');
    expect(text).toContain('animations:');
  });
});
