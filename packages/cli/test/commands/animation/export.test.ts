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

describe('animation:export', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-anim-export-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 2', tmpDir);
    pxc('draw:rect --x 0 --y 0 --width 2 --height 2 --color "#ff0000" --fill --canvas sprite --frame frame-001', tmpDir);
    pxc('draw:rect --x 2 --y 2 --width 2 --height 2 --color "#00ff00" --fill --canvas sprite --frame frame-002', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports GIF with valid magic bytes', () => {
    const dest = path.join(tmpDir, 'output.gif');
    const result = pxcJSON(`animation:export --canvas sprite --format gif --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.frameCount).toBe(3);

    expect(fs.existsSync(dest)).toBe(true);
    const data = fs.readFileSync(dest);
    expect(data.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  });

  it('exports APNG with PNG signature', () => {
    const dest = path.join(tmpDir, 'output.apng');
    const result = pxcJSON(`animation:export --canvas sprite --format apng --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);

    expect(fs.existsSync(dest)).toBe(true);
    const data = fs.readFileSync(dest);
    expect(data[0]).toBe(137);
    expect(data[1]).toBe(80);  // P
    expect(data[2]).toBe(78);  // N
    expect(data[3]).toBe(71);  // G
  });

  it('exports spritesheet with metadata', () => {
    const dest = path.join(tmpDir, 'sheet.png');
    const result = pxcJSON(`animation:export --canvas sprite --format spritesheet --dest "${dest}" --sheet-layout horizontal`, tmpDir);
    expect(result.success).toBe(true);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.existsSync(dest.replace('.png', '.json'))).toBe(true);
  });

  it('exports individual frames', () => {
    const dest = path.join(tmpDir, 'frames');
    const result = pxcJSON(`animation:export --canvas sprite --format frames --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);

    expect(fs.existsSync(dest)).toBe(true);
    const files = fs.readdirSync(dest).filter((f) => f.endsWith('.png'));
    expect(files.length).toBe(3);
  });
});

describe('animation:preview', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-anim-preview-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 1', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a preview GIF', () => {
    const dest = path.join(tmpDir, 'preview.gif');
    const result = pxcJSON(`animation:preview --canvas sprite --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);

    const data = fs.readFileSync(dest);
    expect(data.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  });

  it('generates a preview APNG', () => {
    const dest = path.join(tmpDir, 'preview.apng');
    const result = pxcJSON(`animation:preview --canvas sprite --format apng --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });
});

describe('export:gif', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-export-gif-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 1', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports GIF via export:gif command', () => {
    const dest = path.join(tmpDir, 'out.gif');
    const result = pxcJSON(`export:gif --canvas sprite --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });
});

describe('export:apng', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-export-apng-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 1', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports APNG via export:apng command', () => {
    const dest = path.join(tmpDir, 'out.apng');
    const result = pxcJSON(`export:apng --canvas sprite --dest "${dest}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });
});
