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

describe('export:batch', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-batch-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite1', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name sprite2', tmpDir);
    pxc('draw:rect --canvas sprite1 --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
    pxc('draw:rect --canvas sprite2 --x 0 --y 0 --width 16 --height 16 --color "#0000ff" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports all canvases', () => {
    const dest = path.join(tmpDir, 'exports');
    const result = pxcJSON(`export:batch --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.total).toBe(2);
    expect(fs.existsSync(path.join(dest, 'sprite1.png'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'sprite2.png'))).toBe(true);
  });

  it('exports specific canvases', () => {
    const dest = path.join(tmpDir, 'exports2');
    const result = pxcJSON(`export:batch --dest "${dest}" --canvases sprite1`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.total).toBe(1);
    expect(fs.existsSync(path.join(dest, 'sprite1.png'))).toBe(true);
  });

  it('exports with scale', () => {
    const dest = path.join(tmpDir, 'exports3');
    const result = pxcJSON(`export:batch --dest "${dest}" --scale 2 --canvases sprite1`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.exported[0].width).toBe(16);
    expect(result.result.exported[0].height).toBe(16);
  });

  it('creates dest directory', () => {
    const dest = path.join(tmpDir, 'new', 'nested', 'dir');
    const result = pxcJSON(`export:batch --dest "${dest}" --canvases sprite1`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(dest, 'sprite1.png'))).toBe(true);
  });
});
