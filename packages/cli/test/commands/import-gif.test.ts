import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { PixelBuffer } from '@pixelcreator/core';
import { encodeGif } from '@pixelcreator/core';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): any {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

function createTestGif(tmpDir: string, frameCount: number, width: number, height: number): string {
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const buffer = new PixelBuffer(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer.setPixel(x, y, { r: (i * 80) % 256, g: 128, b: 0, a: 255 });
      }
    }
    frames.push({ buffer, duration: 100 });
  }
  const gifData = encodeGif(frames, { width, height, loop: 0 });
  const gifPath = path.join(tmpDir, 'test.gif');
  fs.writeFileSync(gifPath, gifData);
  return gifPath;
}

describe('import:gif', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-gif-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('imports a GIF as a new canvas', () => {
    const gifPath = createTestGif(tmpDir, 3, 8, 8);
    const result = pxcJSON(`import:gif --file "${gifPath}" --name imported`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('imported');
    expect(result.result.framesImported).toBe(3);
    expect(result.result.width).toBe(8);
    expect(result.result.height).toBe(8);
  });

  it('creates canvas with correct frame count', () => {
    const gifPath = createTestGif(tmpDir, 5, 4, 4);
    pxc(`import:gif --file "${gifPath}" --name multi`, tmpDir);

    const info = pxcJSON('canvas:info --canvas multi', tmpDir);
    expect(info.result.frames).toBe(5);
  });

  it('registers canvas in project', () => {
    const gifPath = createTestGif(tmpDir, 2, 4, 4);
    pxc(`import:gif --file "${gifPath}" --name gif-canvas`, tmpDir);

    const project = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8')
    );
    expect(project.canvases).toContain('gif-canvas');
  });

  it('errors on duplicate canvas name', () => {
    const gifPath = createTestGif(tmpDir, 1, 4, 4);
    pxc(`import:gif --file "${gifPath}" --name dup`, tmpDir);
    expect(() => pxc(`import:gif --file "${gifPath}" --name dup`, tmpDir)).toThrow();
  });

  it('supports duration override', () => {
    const gifPath = createTestGif(tmpDir, 2, 4, 4);
    const result = pxcJSON(`import:gif --file "${gifPath}" --name timed --duration 200`, tmpDir);
    expect(result.success).toBe(true);

    const frames = pxcJSON('frame:list --canvas timed', tmpDir);
    expect(frames.result.frames[0].duration).toBe(200);
  });
});
