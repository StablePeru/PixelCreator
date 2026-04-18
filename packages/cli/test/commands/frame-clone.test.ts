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

describe('frame:clone', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-frame-clone-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 2', tmpDir);
    // Draw distinctive pixel on frame-001 (source)
    pxc('draw:pixel --x 1 --y 1 --color "#ff0000" --canvas sprite --frame frame-001', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('clones pixel data from source to target frame', () => {
    const result = pxcJSON('frame:clone --canvas sprite --source frame-001 --target frame-002', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.source).toBe('frame-001');
    expect(result.result.target).toBe('frame-002');
    expect(result.result.layersCopied).toBeGreaterThan(0);
  });

  it('target frame becomes identical to source', () => {
    pxc('frame:clone --canvas sprite --source frame-001 --target frame-002', tmpDir);

    const projectPath = path.join(tmpDir, 'test.pxc');
    const layerDir = path.join(projectPath, 'canvases', 'sprite', 'layers', 'layer-001');

    const sourcePng = fs.readFileSync(path.join(layerDir, 'frame-001.png'));
    const targetPng = fs.readFileSync(path.join(layerDir, 'frame-002.png'));
    expect(sourcePng.equals(targetPng)).toBe(true);
  });

  it('fails when source frame does not exist', () => {
    expect(() => {
      pxc('frame:clone --canvas sprite --source frame-999 --target frame-002', tmpDir);
    }).toThrow();
  });

  it('fails when target frame does not exist', () => {
    expect(() => {
      pxc('frame:clone --canvas sprite --source frame-001 --target frame-999', tmpDir);
    }).toThrow();
  });

  it('fails when source equals target', () => {
    expect(() => {
      pxc('frame:clone --canvas sprite --source frame-001 --target frame-001', tmpDir);
    }).toThrow();
  });
});
