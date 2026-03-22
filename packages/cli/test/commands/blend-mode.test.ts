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

describe('layer:blend', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-blend-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name sprite', tmpDir);
    pxc('layer:add --canvas sprite --name overlay', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sets blend mode to multiply', () => {
    const result = pxcJSON('layer:blend --canvas sprite --layer layer-002 --mode multiply', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.previousMode).toBe('normal');
    expect(result.result.newMode).toBe('multiply');
  });

  it('sets all valid blend modes', () => {
    for (const mode of ['screen', 'overlay', 'darken', 'lighten', 'normal']) {
      const result = pxcJSON(`layer:blend --canvas sprite --layer layer-001 --mode ${mode}`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.newMode).toBe(mode);
    }
  });

  it('errors with invalid blend mode', () => {
    expect(() => {
      pxc('layer:blend --canvas sprite --layer layer-001 --mode invalid', tmpDir);
    }).toThrow();
  });

  it('errors with nonexistent layer', () => {
    expect(() => {
      pxc('layer:blend --canvas sprite --layer layer-999 --mode multiply', tmpDir);
    }).toThrow();
  });

  it('blend mode persists in canvas.json', () => {
    pxc('layer:blend --canvas sprite --layer layer-002 --mode screen', tmpDir);
    const canvasPath = path.join(tmpDir, 'test.pxc', 'canvases', 'sprite', 'canvas.json');
    const canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf-8'));
    const layer = canvas.layers.find((l: any) => l.id === 'layer-002');
    expect(layer.blendMode).toBe('screen');
  });
});
