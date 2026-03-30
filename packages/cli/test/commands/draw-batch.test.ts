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

function writeOpsFile(dir: string, ops: unknown[], filename = 'ops.json'): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(ops));
  return filePath;
}

describe('draw:batch', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-batch-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('applies pixel operations from ops file', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'pixel', x: 0, y: 0, color: '#ff0000' },
      { type: 'pixel', x: 7, y: 7, color: '#00ff00' },
    ]);

    const result = pxcJSON(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.applied).toBe(2);

    const sample0 = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample0.result.rgba.r).toBe(255);
    expect(sample0.result.rgba.g).toBe(0);

    const sample7 = pxcJSON('draw:sample --canvas canvas --x 7 --y 7', tmpDir);
    expect(sample7.result.rgba.g).toBe(255);
    expect(sample7.result.rgba.r).toBe(0);
  });

  it('applies rect operations', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'rect', x: 1, y: 1, w: 3, h: 3, color: '#ff0000', fill: true },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    const inside = pxcJSON('draw:sample --canvas canvas --x 2 --y 2', tmpDir);
    expect(inside.result.rgba.r).toBe(255);

    const outside = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(outside.result.rgba.a).toBe(0);
  });

  it('applies line operations', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'line', x1: 0, y1: 0, x2: 7, y2: 0, color: '#0000ff' },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    const sample = pxcJSON('draw:sample --canvas canvas --x 4 --y 0', tmpDir);
    expect(sample.result.rgba.b).toBe(255);
  });

  it('applies mixed operations in order (later ops overwrite earlier)', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'rect', x: 0, y: 0, w: 8, h: 8, color: '#ff0000', fill: true },
      { type: 'pixel', x: 3, y: 3, color: '#00ff00' },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    // Rect fills everything red
    const bg = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(bg.result.rgba.r).toBe(255);
    expect(bg.result.rgba.g).toBe(0);

    // Pixel overwrites to green
    const pixel = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
    expect(pixel.result.rgba.g).toBe(255);
    expect(pixel.result.rgba.r).toBe(0);
  });

  it('produces identical result to individual draw commands', () => {
    // Draw using individual commands
    pxc('draw:rect --canvas canvas --x 1 --y 1 --width 4 --height 4 --color "#1a1a2e" --fill', tmpDir);
    pxc('draw:pixel --canvas canvas --x 2 --y 2 --color "#e94560"', tmpDir);
    pxc('draw:line --canvas canvas --x1 0 --y1 7 --x2 7 --y2 7 --color "#cccccc"', tmpDir);

    // Sample results from individual draws
    const indivRect = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
    const indivPixel = pxcJSON('draw:sample --canvas canvas --x 2 --y 2', tmpDir);
    const indivLine = pxcJSON('draw:sample --canvas canvas --x 4 --y 7', tmpDir);

    // Reset canvas
    pxc('canvas:create --width 8 --height 8 --name canvas2', tmpDir);

    // Draw using batch
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'rect', x: 1, y: 1, w: 4, h: 4, color: '#1a1a2e', fill: true },
      { type: 'pixel', x: 2, y: 2, color: '#e94560' },
      { type: 'line', x1: 0, y1: 7, x2: 7, y2: 7, color: '#cccccc' },
    ]);

    pxc(`draw:batch --canvas canvas2 --ops-file "${opsFile}"`, tmpDir);

    // Sample and compare
    const batchRect = pxcJSON('draw:sample --canvas canvas2 --x 3 --y 3', tmpDir);
    const batchPixel = pxcJSON('draw:sample --canvas canvas2 --x 2 --y 2', tmpDir);
    const batchLine = pxcJSON('draw:sample --canvas canvas2 --x 4 --y 7', tmpDir);

    expect(batchRect.result.rgba).toEqual(indivRect.result.rgba);
    expect(batchPixel.result.rgba).toEqual(indivPixel.result.rgba);
    expect(batchLine.result.rgba).toEqual(indivLine.result.rgba);
  });

  it('fails on invalid operation type without writing', () => {
    // First draw something to verify no partial write
    pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#ff0000"', tmpDir);

    const opsFile = writeOpsFile(tmpDir, [
      { type: 'pixel', x: 0, y: 0, color: '#00ff00' },
      { type: 'invalid', x: 1, y: 1 },
    ]);

    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir)).toThrow();

    // Original pixel should be unchanged (no partial write)
    const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample.result.rgba.r).toBe(255);
    expect(sample.result.rgba.g).toBe(0);
  });

  it('fails on missing ops file', () => {
    expect(() => pxc('draw:batch --canvas canvas --ops-file "nonexistent.json"', tmpDir)).toThrow();
  });

  it('fails on empty ops array', () => {
    const opsFile = writeOpsFile(tmpDir, []);
    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir)).toThrow();
  });

  it('fails on invalid JSON', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, 'not json');
    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${filePath}"`, tmpDir)).toThrow();
  });

  it('fails on non-array JSON', () => {
    const filePath = path.join(tmpDir, 'obj.json');
    fs.writeFileSync(filePath, '{"type": "pixel"}');
    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${filePath}"`, tmpDir)).toThrow();
  });

  it('rect defaults fill to false when not specified (matches draw:rect)', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'rect', x: 0, y: 0, w: 8, h: 8, color: '#ff0000' },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    // Interior pixel should be empty (stroke only, no fill)
    const inside = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(inside.result.rgba.a).toBe(0);

    // Border pixel should be drawn
    const border = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(border.result.rgba.r).toBe(255);
  });

  it('supports specific frame flag', () => {
    pxc('frame:add --canvas canvas --count 1', tmpDir);

    const opsFile = writeOpsFile(tmpDir, [
      { type: 'pixel', x: 0, y: 0, color: '#ff0000' },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}" -f frame-002`, tmpDir);

    // Frame 1 should be untouched
    const f1 = pxcJSON('draw:sample --canvas canvas --x 0 --y 0 -f frame-001', tmpDir);
    expect(f1.result.rgba.a).toBe(0);

    // Frame 2 should have the pixel
    const f2 = pxcJSON('draw:sample --canvas canvas --x 0 --y 0 -f frame-002', tmpDir);
    expect(f2.result.rgba.r).toBe(255);
  });
});
