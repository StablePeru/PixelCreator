import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 10000 });
}

function pxcJSON(args: string, cwd: string): any {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('canvas:extract', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-extract-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name source', tmpDir);
    pxc('draw:rect --canvas source --x 4 --y 4 --width 8 --height 8 --color "#00ff00" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts region as new canvas', () => {
    const result = pxcJSON('canvas:extract --canvas source --name region --x 4 --y 4 --width 8 --height 8', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('region');
    expect(result.result.region.width).toBe(8);
    expect(result.result.region.height).toBe(8);
  });

  it('errors when region exceeds bounds', () => {
    expect(() => {
      pxc('canvas:extract --canvas source --name bad --x 10 --y 10 --width 8 --height 8', tmpDir);
    }).toThrow();
  });

  it('errors with duplicate canvas name', () => {
    expect(() => {
      pxc('canvas:extract --canvas source --name source --x 0 --y 0 --width 8 --height 8', tmpDir);
    }).toThrow();
  });
});
