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

describe('export:sequence', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-seq-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name walk', tmpDir);
    pxc('frame:add --canvas walk --count 2', tmpDir);
    pxc('draw:rect --canvas walk --x 0 --y 0 --width 4 --height 4 --color "#ff0000" --fill --frame frame-001', tmpDir);
    pxc('draw:rect --canvas walk --x 0 --y 0 --width 4 --height 4 --color "#00ff00" --fill --frame frame-002', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports frames as numbered PNGs', () => {
    const dest = path.join(tmpDir, 'frames');
    const result = pxcJSON(`export:sequence --canvas walk --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.frameCount).toBe(3);
    expect(result.result.files).toHaveLength(3);
    expect(fs.existsSync(path.join(dest, 'walk_001.png'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'walk_002.png'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'walk_003.png'))).toBe(true);
  });

  it('uses custom prefix', () => {
    const dest = path.join(tmpDir, 'out');
    const result = pxcJSON(`export:sequence --canvas walk --dest "${dest}" --prefix anim`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(dest, 'anim_001.png'))).toBe(true);
  });

  it('applies scale factor', () => {
    const dest = path.join(tmpDir, 'scaled');
    const result = pxcJSON(`export:sequence --canvas walk --dest "${dest}" --scale 2`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.scale).toBe(2);
  });

  it('respects padding option', () => {
    const dest = path.join(tmpDir, 'padded');
    const result = pxcJSON(`export:sequence --canvas walk --dest "${dest}" --padding 5`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.files[0]).toBe('walk_00001.png');
  });

  it('creates destination directory if missing', () => {
    const dest = path.join(tmpDir, 'new', 'dir');
    const result = pxcJSON(`export:sequence --canvas walk --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });

  it('returns valid JSON output', () => {
    const dest = path.join(tmpDir, 'json');
    const result = pxcJSON(`export:sequence --canvas walk --dest "${dest}"`, tmpDir);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('command');
    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('duration');
    expect(result.result.canvas).toBe('walk');
  });
});
