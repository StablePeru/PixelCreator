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

function pxcStdin(args: string, cwd: string, stdinData: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000, input: stdinData });
}

function pxcStdinJSON(args: string, cwd: string, stdinData: string): any {
  const output = pxcStdin(`${args} --output json`, cwd, stdinData);
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

  // --- stdin tests (--ops-file -) ---

  it('reads operations from stdin with --ops-file -', () => {
    const ops = JSON.stringify([
      { type: 'pixel', x: 0, y: 0, color: '#ff0000' },
      { type: 'pixel', x: 7, y: 7, color: '#00ff00' },
    ]);

    const result = pxcStdinJSON('draw:batch --canvas canvas --ops-file -', tmpDir, ops);
    expect(result.success).toBe(true);
    expect(result.result.applied).toBe(2);

    const sample0 = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample0.result.rgba.r).toBe(255);

    const sample7 = pxcJSON('draw:sample --canvas canvas --x 7 --y 7', tmpDir);
    expect(sample7.result.rgba.g).toBe(255);
  });

  it('fails cleanly on invalid JSON from stdin', () => {
    expect(() =>
      pxcStdin('draw:batch --canvas canvas --ops-file -', tmpDir, 'not json'),
    ).toThrow();
  });

  it('fails cleanly on invalid ops from stdin without partial write', () => {
    // Pre-draw a pixel to verify atomicity
    pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#ff0000"', tmpDir);

    const ops = JSON.stringify([
      { type: 'pixel', x: 0, y: 0, color: '#00ff00' },
      { type: 'bogus', x: 1, y: 1 },
    ]);

    expect(() =>
      pxcStdin('draw:batch --canvas canvas --ops-file -', tmpDir, ops),
    ).toThrow();

    // Original pixel must be unchanged (no partial write)
    const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample.result.rgba.r).toBe(255);
    expect(sample.result.rgba.g).toBe(0);
  });

  it('stdin produces identical result to file input', () => {
    const ops = [
      { type: 'rect', x: 0, y: 0, w: 4, h: 4, color: '#1a1a2e', fill: true },
      { type: 'pixel', x: 2, y: 2, color: '#e94560' },
    ];

    // File-based
    const opsFile = writeOpsFile(tmpDir, ops);
    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    const fileRect = pxcJSON('draw:sample --canvas canvas --x 1 --y 1', tmpDir);
    const filePixel = pxcJSON('draw:sample --canvas canvas --x 2 --y 2', tmpDir);

    // Reset with a second canvas
    pxc('canvas:create --width 8 --height 8 --name canvas2', tmpDir);
    pxcStdin('draw:batch --canvas canvas2 --ops-file -', tmpDir, JSON.stringify(ops));
    const stdinRect = pxcJSON('draw:sample --canvas canvas2 --x 1 --y 1', tmpDir);
    const stdinPixel = pxcJSON('draw:sample --canvas canvas2 --x 2 --y 2', tmpDir);

    expect(stdinRect.result.rgba).toEqual(fileRect.result.rgba);
    expect(stdinPixel.result.rgba).toEqual(filePixel.result.rgba);
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

  // --- color aliases tests ---

  it('resolves colorRef from colors map', () => {
    const doc = {
      colors: { RED: '#ff0000', GREEN: '#00ff00' },
      operations: [
        { type: 'pixel', x: 0, y: 0, colorRef: 'RED' },
        { type: 'pixel', x: 7, y: 7, colorRef: 'GREEN' },
      ],
    };
    const opsFile = path.join(tmpDir, 'alias.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    const result = pxcJSON(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.applied).toBe(2);

    const s0 = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(s0.result.rgba.r).toBe(255);
    expect(s0.result.rgba.g).toBe(0);

    const s7 = pxcJSON('draw:sample --canvas canvas --x 7 --y 7', tmpDir);
    expect(s7.result.rgba.g).toBe(255);
    expect(s7.result.rgba.r).toBe(0);
  });

  it('allows mixing color and colorRef in different ops', () => {
    const doc = {
      colors: { DARK: '#1a1a2e' },
      operations: [
        { type: 'rect', x: 0, y: 0, w: 8, h: 8, colorRef: 'DARK', fill: true },
        { type: 'pixel', x: 3, y: 3, color: '#e94560' },
      ],
    };
    const opsFile = path.join(tmpDir, 'mix.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    const bg = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(bg.result.rgba.r).toBe(0x1a);

    const pixel = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
    expect(pixel.result.rgba.r).toBe(0xe9);
  });

  it('works with extended format via stdin', () => {
    const doc = {
      colors: { BLUE: '#0000ff' },
      operations: [
        { type: 'line', x1: 0, y1: 0, x2: 7, y2: 0, colorRef: 'BLUE' },
      ],
    };

    const result = pxcStdinJSON(
      'draw:batch --canvas canvas --ops-file -',
      tmpDir,
      JSON.stringify(doc),
    );
    expect(result.success).toBe(true);

    const sample = pxcJSON('draw:sample --canvas canvas --x 4 --y 0', tmpDir);
    expect(sample.result.rgba.b).toBe(255);
  });

  it('works with extended format without colors block', () => {
    const doc = {
      operations: [
        { type: 'pixel', x: 0, y: 0, color: '#ff0000' },
      ],
    };
    const opsFile = path.join(tmpDir, 'nocolor.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    const result = pxcJSON(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    expect(result.success).toBe(true);

    const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample.result.rgba.r).toBe(255);
  });

  it('fails when color and colorRef both specified', () => {
    const doc = {
      colors: { RED: '#ff0000' },
      operations: [
        { type: 'pixel', x: 0, y: 0, color: '#00ff00', colorRef: 'RED' },
      ],
    };
    const opsFile = path.join(tmpDir, 'both.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    expect(() =>
      pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir),
    ).toThrow();
  });

  it('fails on unknown colorRef alias without partial write', () => {
    pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#ff0000"', tmpDir);

    const doc = {
      colors: { RED: '#ff0000' },
      operations: [
        { type: 'pixel', x: 0, y: 0, colorRef: 'RED' },
        { type: 'pixel', x: 1, y: 1, colorRef: 'NONEXISTENT' },
      ],
    };
    const opsFile = path.join(tmpDir, 'badref.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    expect(() =>
      pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir),
    ).toThrow();

    // Original pixel unchanged — atomicity preserved
    const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample.result.rgba.r).toBe(255);
    expect(sample.result.rgba.g).toBe(0);
  });

  it('fails when colors map has non-string values', () => {
    const doc = {
      colors: { BAD: 123 },
      operations: [
        { type: 'pixel', x: 0, y: 0, colorRef: 'BAD' },
      ],
    };
    const opsFile = path.join(tmpDir, 'badmap.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    expect(() =>
      pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir),
    ).toThrow();
  });

  it('colorRef produces identical result to inline color', () => {
    // Inline color
    const opsInline = writeOpsFile(tmpDir, [
      { type: 'rect', x: 1, y: 1, w: 4, h: 4, color: '#1a1a2e', fill: true },
      { type: 'pixel', x: 2, y: 2, color: '#e94560' },
      { type: 'line', x1: 0, y1: 7, x2: 7, y2: 7, color: '#cccccc' },
    ]);
    pxc(`draw:batch --canvas canvas --ops-file "${opsInline}"`, tmpDir);

    const inlineRect = pxcJSON('draw:sample --canvas canvas --x 3 --y 3', tmpDir);
    const inlinePixel = pxcJSON('draw:sample --canvas canvas --x 2 --y 2', tmpDir);
    const inlineLine = pxcJSON('draw:sample --canvas canvas --x 4 --y 7', tmpDir);

    // colorRef equivalent
    pxc('canvas:create --width 8 --height 8 --name canvas2', tmpDir);
    const doc = {
      colors: { DARK: '#1a1a2e', ACCENT: '#e94560', GRAY: '#cccccc' },
      operations: [
        { type: 'rect', x: 1, y: 1, w: 4, h: 4, colorRef: 'DARK', fill: true },
        { type: 'pixel', x: 2, y: 2, colorRef: 'ACCENT' },
        { type: 'line', x1: 0, y1: 7, x2: 7, y2: 7, colorRef: 'GRAY' },
      ],
    };
    const refFile = path.join(tmpDir, 'ref.json');
    fs.writeFileSync(refFile, JSON.stringify(doc));
    pxc(`draw:batch --canvas canvas2 --ops-file "${refFile}"`, tmpDir);

    const refRect = pxcJSON('draw:sample --canvas canvas2 --x 3 --y 3', tmpDir);
    const refPixel = pxcJSON('draw:sample --canvas canvas2 --x 2 --y 2', tmpDir);
    const refLine = pxcJSON('draw:sample --canvas canvas2 --x 4 --y 7', tmpDir);

    expect(refRect.result.rgba).toEqual(inlineRect.result.rgba);
    expect(refPixel.result.rgba).toEqual(inlinePixel.result.rgba);
    expect(refLine.result.rgba).toEqual(inlineLine.result.rgba);
  });

  // --- circle operation tests ---

  it('applies filled circle operation', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'circle', cx: 4, cy: 4, radius: 3, color: '#ff0000', fill: true },
    ]);

    const result = pxcJSON(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.applied).toBe(1);

    // Center should be filled
    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.r).toBe(255);

    // Point on circle edge (4+3, 4) = (7, 4) should be filled
    const edge = pxcJSON('draw:sample --canvas canvas --x 7 --y 4', tmpDir);
    expect(edge.result.rgba.r).toBe(255);

    // Corner (0,0) should be empty — outside radius 3 from center (4,4)
    const corner = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(corner.result.rgba.a).toBe(0);
  });

  it('applies outline circle operation (fill defaults to false)', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'circle', cx: 4, cy: 4, radius: 3, color: '#ff0000' },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    // Edge pixel should be drawn
    const edge = pxcJSON('draw:sample --canvas canvas --x 7 --y 4', tmpDir);
    expect(edge.result.rgba.r).toBe(255);

    // Center should be empty (outline only)
    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.a).toBe(0);
  });

  it('circle supports colorRef', () => {
    const doc = {
      colors: { RED: '#ff0000' },
      operations: [
        { type: 'circle', cx: 4, cy: 4, radius: 2, colorRef: 'RED', fill: true },
      ],
    };
    const opsFile = path.join(tmpDir, 'circleref.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.r).toBe(255);
  });

  it('circle via stdin works', () => {
    const ops = JSON.stringify([
      { type: 'circle', cx: 4, cy: 4, radius: 2, color: '#00ff00', fill: true },
    ]);

    const result = pxcStdinJSON('draw:batch --canvas canvas --ops-file -', tmpDir, ops);
    expect(result.success).toBe(true);

    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.g).toBe(255);
  });

  it('fails on circle with missing radius', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'circle', cx: 4, cy: 4, color: '#ff0000' },
    ]);

    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir)).toThrow();
  });

  it('circle produces identical result to draw:circle command', () => {
    // Individual command
    pxc('draw:circle --canvas canvas --cx 4 --cy 4 --radius 3 --color "#ff0000" --fill', tmpDir);
    const indivCenter = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    const indivEdge = pxcJSON('draw:sample --canvas canvas --x 7 --y 4', tmpDir);
    const indivOuter = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);

    // Batch equivalent
    pxc('canvas:create --width 8 --height 8 --name canvas2', tmpDir);
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'circle', cx: 4, cy: 4, radius: 3, color: '#ff0000', fill: true },
    ]);
    pxc(`draw:batch --canvas canvas2 --ops-file "${opsFile}"`, tmpDir);

    const batchCenter = pxcJSON('draw:sample --canvas canvas2 --x 4 --y 4', tmpDir);
    const batchEdge = pxcJSON('draw:sample --canvas canvas2 --x 7 --y 4', tmpDir);
    const batchOuter = pxcJSON('draw:sample --canvas canvas2 --x 0 --y 0', tmpDir);

    expect(batchCenter.result.rgba).toEqual(indivCenter.result.rgba);
    expect(batchEdge.result.rgba).toEqual(indivEdge.result.rgba);
    expect(batchOuter.result.rgba).toEqual(indivOuter.result.rgba);
  });

  // --- ellipse operation tests ---

  it('applies filled ellipse operation', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'ellipse', cx: 4, cy: 4, rx: 3, ry: 2, color: '#0000ff', fill: true },
    ]);

    const result = pxcJSON(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.applied).toBe(1);

    // Center should be filled
    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.b).toBe(255);

    // Horizontal edge (4+3, 4) = (7, 4) should be filled
    const hEdge = pxcJSON('draw:sample --canvas canvas --x 7 --y 4', tmpDir);
    expect(hEdge.result.rgba.b).toBe(255);

    // Vertical edge (4, 4+2) = (4, 6) should be filled
    const vEdge = pxcJSON('draw:sample --canvas canvas --x 4 --y 6', tmpDir);
    expect(vEdge.result.rgba.b).toBe(255);

    // Corner (0,0) should be empty
    const corner = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(corner.result.rgba.a).toBe(0);
  });

  it('applies outline ellipse operation (fill defaults to false)', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'ellipse', cx: 4, cy: 4, rx: 3, ry: 2, color: '#0000ff' },
    ]);

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    // Edge should be drawn
    const edge = pxcJSON('draw:sample --canvas canvas --x 7 --y 4', tmpDir);
    expect(edge.result.rgba.b).toBe(255);

    // Center should be empty (outline only)
    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.a).toBe(0);
  });

  it('ellipse supports colorRef', () => {
    const doc = {
      colors: { BLUE: '#0000ff' },
      operations: [
        { type: 'ellipse', cx: 4, cy: 4, rx: 3, ry: 2, colorRef: 'BLUE', fill: true },
      ],
    };
    const opsFile = path.join(tmpDir, 'ellipseref.json');
    fs.writeFileSync(opsFile, JSON.stringify(doc));

    pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);

    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.b).toBe(255);
  });

  it('ellipse via stdin works', () => {
    const ops = JSON.stringify([
      { type: 'ellipse', cx: 4, cy: 4, rx: 2, ry: 1, color: '#00ff00', fill: true },
    ]);

    const result = pxcStdinJSON('draw:batch --canvas canvas --ops-file -', tmpDir, ops);
    expect(result.success).toBe(true);

    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.g).toBe(255);
  });

  it('fails on ellipse with missing ry', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'ellipse', cx: 4, cy: 4, rx: 3, color: '#ff0000' },
    ]);

    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir)).toThrow();
  });

  it('ellipse produces identical result to draw:ellipse command', () => {
    // Individual command
    pxc('draw:ellipse --canvas canvas --cx 4 --cy 4 --rx 3 --ry 2 --color "#0000ff" --fill', tmpDir);
    const indivCenter = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    const indivHEdge = pxcJSON('draw:sample --canvas canvas --x 7 --y 4', tmpDir);
    const indivOuter = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);

    // Batch equivalent
    pxc('canvas:create --width 8 --height 8 --name canvas2', tmpDir);
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'ellipse', cx: 4, cy: 4, rx: 3, ry: 2, color: '#0000ff', fill: true },
    ]);
    pxc(`draw:batch --canvas canvas2 --ops-file "${opsFile}"`, tmpDir);

    const batchCenter = pxcJSON('draw:sample --canvas canvas2 --x 4 --y 4', tmpDir);
    const batchHEdge = pxcJSON('draw:sample --canvas canvas2 --x 7 --y 4', tmpDir);
    const batchOuter = pxcJSON('draw:sample --canvas canvas2 --x 0 --y 0', tmpDir);

    expect(batchCenter.result.rgba).toEqual(indivCenter.result.rgba);
    expect(batchHEdge.result.rgba).toEqual(indivHEdge.result.rgba);
    expect(batchOuter.result.rgba).toEqual(indivOuter.result.rgba);
  });

  // --- atomicity with circle/ellipse ---

  it('invalid circle in batch prevents all writes (atomicity)', () => {
    pxc('draw:pixel --canvas canvas --x 0 --y 0 --color "#ff0000"', tmpDir);

    const opsFile = writeOpsFile(tmpDir, [
      { type: 'circle', cx: 4, cy: 4, radius: 2, color: '#00ff00', fill: true },
      { type: 'circle', cx: 4, cy: 4, color: '#0000ff' },
    ]);

    expect(() => pxc(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir)).toThrow();

    // Original pixel unchanged
    const sample = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(sample.result.rgba.r).toBe(255);
    expect(sample.result.rgba.g).toBe(0);
  });

  // --- mixed operations with circle/ellipse ---

  it('mixes rect, circle, ellipse, pixel in one batch', () => {
    const opsFile = writeOpsFile(tmpDir, [
      { type: 'rect', x: 0, y: 0, w: 8, h: 8, color: '#111111', fill: true },
      { type: 'circle', cx: 4, cy: 4, radius: 2, color: '#ff0000', fill: true },
      { type: 'ellipse', cx: 4, cy: 4, rx: 3, ry: 1, color: '#00ff00', fill: true },
      { type: 'pixel', x: 4, y: 4, color: '#0000ff' },
    ]);

    const result = pxcJSON(`draw:batch --canvas canvas --ops-file "${opsFile}"`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.applied).toBe(4);

    // Center overwritten by pixel (last op)
    const center = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
    expect(center.result.rgba.b).toBe(255);
    expect(center.result.rgba.r).toBe(0);
    expect(center.result.rgba.g).toBe(0);

    // Corner should be rect color (not circle/ellipse)
    const corner = pxcJSON('draw:sample --canvas canvas --x 0 --y 0', tmpDir);
    expect(corner.result.rgba.r).toBe(0x11);
  });
});
