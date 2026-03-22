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

describe('animation:onion-skin', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-onion-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name walk', tmpDir);
    pxc('frame:add --canvas walk --count 3', tmpDir);
    pxc('draw:rect --canvas walk --x 0 --y 0 --width 2 --height 2 --color "#ff0000" --fill --frame frame-001', tmpDir);
    pxc('draw:rect --canvas walk --x 1 --y 1 --width 2 --height 2 --color "#00ff00" --fill --frame frame-002', tmpDir);
    pxc('draw:rect --canvas walk --x 2 --y 2 --width 2 --height 2 --color "#0000ff" --fill --frame frame-003', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates onion skin overlay', () => {
    const dest = path.join(tmpDir, 'onion.png');
    const result = pxcJSON(`animation:onion-skin --canvas walk --frame 1 --dest "${dest}" --before 1 --after 1`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.frame).toBe(1);
    expect(result.result.before).toBe(1);
    expect(result.result.after).toBe(1);
    expect(fs.existsSync(dest)).toBe(true);
  });

  it('works with only before frames', () => {
    const dest = path.join(tmpDir, 'before.png');
    const result = pxcJSON(`animation:onion-skin --canvas walk --frame 2 --dest "${dest}" --before 2 --after 0`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.before).toBe(2);
    expect(result.result.after).toBe(0);
  });

  it('works with only after frames', () => {
    const dest = path.join(tmpDir, 'after.png');
    const result = pxcJSON(`animation:onion-skin --canvas walk --frame 0 --dest "${dest}" --before 0 --after 2`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.before).toBe(0);
    expect(result.result.after).toBe(2);
  });

  it('supports tint colors', () => {
    const dest = path.join(tmpDir, 'tinted.png');
    const result = pxcJSON(
      `animation:onion-skin --canvas walk --frame 1 --dest "${dest}" --before 1 --after 1 --before-color "#ff000080" --after-color "#0000ff80"`,
      tmpDir,
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });

  it('errors on out-of-range frame', () => {
    const dest = path.join(tmpDir, 'err.png');
    expect(() => {
      pxc(`animation:onion-skin --canvas walk --frame 10 --dest "${dest}"`, tmpDir);
    }).toThrow();
  });
});
