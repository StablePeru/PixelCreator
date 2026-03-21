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

describe('animation:set-timing', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-timing-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 3', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sets duration for a single frame', () => {
    const result = pxcJSON('animation:set-timing --canvas sprite --frame 0 --duration 200', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.duration).toBe(200);
    expect(result.result.updatedFrames).toBe(1);

    const list = pxcJSON('frame:list --canvas sprite', tmpDir);
    expect(list.result.frames[0].duration).toBe(200);
    expect(list.result.frames[1].duration).toBe(100); // unchanged
  });

  it('sets duration for all frames when no target specified', () => {
    const result = pxcJSON('animation:set-timing --canvas sprite --duration 50', tmpDir);
    expect(result.result.updatedFrames).toBe(4);

    const list = pxcJSON('frame:list --canvas sprite', tmpDir);
    expect(list.result.frames.every((f: any) => f.duration === 50)).toBe(true);
  });

  it('sets timing via --fps', () => {
    const result = pxcJSON('animation:set-timing --canvas sprite --fps 12', tmpDir);
    expect(result.result.duration).toBe(83); // Math.round(1000/12)
    expect(result.result.fps).toBe(12);
  });

  it('sets timing for a range', () => {
    const result = pxcJSON('animation:set-timing --canvas sprite --range 1-2 --duration 300', tmpDir);
    expect(result.result.updatedFrames).toBe(2);

    const list = pxcJSON('frame:list --canvas sprite', tmpDir);
    expect(list.result.frames[0].duration).toBe(100); // unchanged
    expect(list.result.frames[1].duration).toBe(300);
    expect(list.result.frames[2].duration).toBe(300);
    expect(list.result.frames[3].duration).toBe(100); // unchanged
  });

  it('errors when both --duration and --fps are specified', () => {
    expect(() => {
      pxc('animation:set-timing --canvas sprite --duration 100 --fps 12', tmpDir);
    }).toThrow();
  });

  it('errors when neither --duration nor --fps is specified', () => {
    expect(() => {
      pxc('animation:set-timing --canvas sprite --frame 0', tmpDir);
    }).toThrow();
  });
});
