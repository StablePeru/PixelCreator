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

describe('tileset:tile-props', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tileprops-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name tiles', tmpDir);
    pxc('draw:rect --canvas tiles --x 0 --y 0 --width 16 --height 16 --color "#ff0000" --fill', tmpDir);
    pxc('tileset:create --name env --canvas tiles --tile-width 16 --tile-height 16', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows empty properties', () => {
    const result = pxcJSON('tileset:tile-props --name env --tile tile-001', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.properties).toBeDefined();
  });

  it('sets string property', () => {
    const result = pxcJSON('tileset:tile-props --name env --tile tile-001 --set "terrain:grass"', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.properties.terrain).toBe('grass');
  });

  it('sets boolean property', () => {
    const result = pxcJSON('tileset:tile-props --name env --tile tile-001 --set "walkable:true" --type boolean', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.properties.walkable).toBe(true);
  });
});
