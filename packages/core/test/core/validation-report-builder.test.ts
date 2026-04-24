import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProjectStructure,
  writeProjectJSON,
  writeCanvasJSON,
  writePaletteJSON,
  writeLayerFrame,
  writeValidationFlags,
  ensureCanvasStructure,
  readProjectJSON,
} from '../../src/io/project-io.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { buildValidationReport } from '../../src/core/validation-report-builder.js';
import { addFlag, emptyFlagsFile } from '../../src/core/validation-engine.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { PaletteData } from '../../src/types/palette.js';

function makeCanvas(overrides: Partial<CanvasData> = {}): CanvasData {
  return {
    name: 'hero',
    width: 16,
    height: 16,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: 'p8',
    layers: [
      {
        id: 'layer-001',
        name: 'body',
        type: 'normal',
        visible: true,
        opacity: 255,
        blendMode: 'normal',
        locked: false,
        order: 0,
      },
    ],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
    ...overrides,
  };
}

function makePalette(): PaletteData {
  return {
    name: 'p8',
    description: 'test palette',
    colors: [
      { index: 0, hex: '#000000', name: 'black', group: null },
      { index: 1, hex: '#ff0000', name: 'red', group: null },
      { index: 2, hex: '#00ff00', name: 'green', group: null },
    ],
    constraints: { maxColors: 8, locked: false, allowAlpha: true },
    ramps: [],
  };
}

describe('buildValidationReport', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-report-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    fs.mkdirSync(projectPath);
    initProjectStructure(projectPath, 'test');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function seedCanvas(canvas: CanvasData = makeCanvas()): CanvasData {
    writeCanvasJSON(projectPath, canvas.name, canvas);
    ensureCanvasStructure(projectPath, canvas.name, canvas);
    writeValidationFlags(projectPath, canvas.name, emptyFlagsFile(canvas.name));
    return canvas;
  }

  it('returns a minimal report with empty sections when no checks opted in', () => {
    seedCanvas();
    const report = buildValidationReport(projectPath, 'hero', { now: 42 });

    expect(report).toEqual({
      canvas: 'hero',
      generatedAt: 42,
      manual: [],
      automatic: { size: [] },
    });
  });

  it('always includes manual flags and size violations', () => {
    seedCanvas();
    // Add a manual flag
    let flags = emptyFlagsFile('hero');
    flags = addFlag(flags, {
      canvas: 'hero',
      severity: 'error',
      category: 'palette',
      note: 'off-palette pixel at head',
      now: 1000,
    });
    writeValidationFlags(projectPath, 'hero', flags);

    // Add a size rule that the canvas violates
    const project = readProjectJSON(projectPath);
    project.validation.sizeRules = [{ pattern: '*', type: 'exact', width: 32, height: 32 }];
    writeProjectJSON(projectPath, project);

    const report = buildValidationReport(projectPath, 'hero', { now: 1 });
    expect(report.manual).toHaveLength(1);
    expect(report.manual[0].note).toBe('off-palette pixel at head');
    expect(report.automatic.size).toHaveLength(1);
    expect(report.automatic.size?.[0].rule).toBe('exact');
  });

  it('respects openOnly default — resolved flags are filtered out', () => {
    seedCanvas();
    let flags = emptyFlagsFile('hero');
    flags = addFlag(flags, {
      canvas: 'hero',
      severity: 'warning',
      category: 'palette',
      note: 'open',
      now: 1000,
    });
    flags = addFlag(flags, {
      canvas: 'hero',
      severity: 'warning',
      category: 'palette',
      note: 'resolved',
      now: 2000,
    });
    flags = {
      ...flags,
      flags: flags.flags.map((f, i) =>
        i === 1 ? { ...f, resolvedAt: 3000, resolution: 'fixed' } : f,
      ),
    };
    writeValidationFlags(projectPath, 'hero', flags);

    const openOnly = buildValidationReport(projectPath, 'hero');
    expect(openOnly.manual).toHaveLength(1);
    expect(openOnly.manual[0].note).toBe('open');

    const all = buildValidationReport(projectPath, 'hero', { openOnly: false });
    expect(all.manual).toHaveLength(2);
  });

  it('aggregates palette violations per frame when includePalette=true', () => {
    const canvas = seedCanvas();
    writePaletteJSON(projectPath, makePalette());

    // Stain a pixel with a color NOT in the palette
    const buf = new PixelBuffer(canvas.width, canvas.height);
    buf.setPixel(3, 3, { r: 17, g: 34, b: 51, a: 255 }); // #112233 — off palette
    buf.setPixel(5, 5, { r: 255, g: 0, b: 0, a: 255 }); // #ff0000 — in palette
    writeLayerFrame(projectPath, 'hero', 'layer-001', 'frame-001', buf);

    const report = buildValidationReport(projectPath, 'hero', { includePalette: true });
    expect(report.automatic.palette).toBeDefined();
    expect(report.automatic.palette).toHaveLength(1);
    const issue = report.automatic.palette![0];
    expect(issue.canvas).toBe('hero');
    expect(issue.frame).toBe(0);
    expect(issue.totalPixelsOutOfPalette).toBe(1);
    expect(issue.offenders[0]).toEqual({ x: 3, y: 3, color: '#112233' });
  });

  it('returns empty palette issues when canvas has no palette bound', () => {
    seedCanvas(makeCanvas({ palette: null }));
    const report = buildValidationReport(projectPath, 'hero', { includePalette: true });
    expect(report.automatic.palette).toEqual([]);
  });

  it('accepts a palette override when includePalette=true', () => {
    const canvas = seedCanvas(makeCanvas({ palette: null }));
    writePaletteJSON(projectPath, makePalette());
    const buf = new PixelBuffer(canvas.width, canvas.height);
    buf.setPixel(1, 1, { r: 17, g: 34, b: 51, a: 255 });
    writeLayerFrame(projectPath, 'hero', 'layer-001', 'frame-001', buf);

    const report = buildValidationReport(projectPath, 'hero', {
      includePalette: true,
      paletteOverride: 'p8',
    });
    expect(report.automatic.palette).toHaveLength(1);
    expect(report.automatic.palette![0].totalPixelsOutOfPalette).toBe(1);
  });

  it('includes accessibility report when includeAccessibility=true', () => {
    seedCanvas();
    writePaletteJSON(projectPath, makePalette());

    const report = buildValidationReport(projectPath, 'hero', { includeAccessibility: true });
    expect(report.automatic.accessibility).toBeDefined();
    expect(report.automatic.accessibility!.paletteName).toBe('p8');
    expect(report.automatic.accessibility!.totalColors).toBe(3);
    expect(report.automatic.accessibility!.score).toBeGreaterThanOrEqual(0);
  });

  it('skips accessibility when canvas has no palette and no override', () => {
    seedCanvas(makeCanvas({ palette: null }));
    const report = buildValidationReport(projectPath, 'hero', { includeAccessibility: true });
    expect(report.automatic.accessibility).toBeUndefined();
  });

  it('includes asset validation results when includeAsset=true', () => {
    seedCanvas();
    // Seed one invalid asset spec to ensure the section lights up.
    const specsDir = path.join(projectPath, 'assets');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(
      path.join(specsDir, 'broken.asset.json'),
      JSON.stringify({ totally: 'wrong-shape' }),
    );

    const report = buildValidationReport(projectPath, 'hero', { includeAsset: true });
    expect(report.automatic.asset).toBeDefined();
    expect(report.automatic.asset!.length).toBeGreaterThan(0);
    const broken = report.automatic.asset!.find((a) => a.asset === 'broken');
    expect(broken).toBeDefined();
    expect(broken!.valid).toBe(false);
  });

  it('returns an empty asset array when the project has no specs', () => {
    seedCanvas();
    const report = buildValidationReport(projectPath, 'hero', { includeAsset: true });
    expect(report.automatic.asset).toEqual([]);
  });

  it('does not populate optional sections by default', () => {
    seedCanvas();
    const report = buildValidationReport(projectPath, 'hero');
    expect(report.automatic.palette).toBeUndefined();
    expect(report.automatic.accessibility).toBeUndefined();
    expect(report.automatic.asset).toBeUndefined();
    expect(report.automatic.size).toEqual([]);
  });
});
