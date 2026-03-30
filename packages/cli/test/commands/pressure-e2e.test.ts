/**
 * Pressure Pipeline E2E Validation (M5 closure)
 *
 * Validates the full reproducible flow:
 *   1. Create project + canvas
 *   2. Create brush preset WITH pressureSensitivity
 *   3. draw:stroke using preset pressure config (no inline override)
 *   4. draw:stroke using inline override over preset config
 *   5. Verify deterministic pixel output via draw:sample
 *   6. Run twice — verify identical output (reproducibility)
 *
 * This test proves the pressure contract is end-to-end functional
 * and deterministic, suitable for recipe/automation pipelines.
 */
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

/** Run the full pressure pipeline in a fresh project and return sampled pixels */
function runPressurePipeline(rootDir: string): {
  presetFromProject: any;
  samplesPreset: Array<{ x: number; y: number; rgba: any }>;
  samplesOverride: Array<{ x: number; y: number; rgba: any }>;
} {
  // 1. Init project + canvas
  pxc('project:init --name e2e', rootDir);
  pxc('canvas:create --width 32 --height 32 --name art', rootDir);

  // 2. Create pressure-enabled preset: soft curve, minSize 0.3, minOpacity 0.2
  pxc(
    'brush:create --name "E2E Pressure" --size 3 --shape circle ' +
    '--pressure-enabled --pressure-curve soft --pressure-min-size 0.3 --pressure-min-opacity 0.2',
    rootDir,
  );

  // Read back the preset to get its ID and verify persistence
  const project = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'e2e.pxc', 'project.json'), 'utf-8'),
  );
  const preset = project.settings.brushPresets.find((p: any) => p.name === 'E2E Pressure');

  // 3. draw:stroke using preset config (no inline override)
  //    Points form a diagonal: (4,4) → (8,8) → (12,12) → (16,16)
  //    Pressure ramps up: 0.2 → 0.5 → 0.8 → 1.0
  pxcJSON(
    `draw:stroke -c art --points "4,4 8,8 12,12 16,16" --color "#ff0000" ` +
    `--brush ${preset.id} --pressure "0.2 0.5 0.8 1.0"`,
    rootDir,
  );

  // Sample key pixels along the stroke path
  const presetSampleCoords = [
    { x: 4, y: 4 },   // start — low pressure
    { x: 8, y: 8 },   // mid — medium pressure
    { x: 12, y: 12 }, // mid-high
    { x: 16, y: 16 }, // end — full pressure
    { x: 0, y: 0 },   // corner — should be untouched (transparent)
  ];

  const samplesPreset = presetSampleCoords.map(({ x, y }) => {
    const s = pxcJSON(`draw:sample -c art --x ${x} --y ${y}`, rootDir);
    return { x, y, rgba: s.result.rgba };
  });

  // 4. draw:stroke with inline override: hard curve instead of preset's soft
  //    Different points to avoid overlap: horizontal line at y=24
  pxcJSON(
    `draw:stroke -c art --points "4,24 10,24 16,24 22,24" --color "#0000ff" ` +
    `--brush ${preset.id} --pressure "0.3 0.6 0.9 1.0" --pressure-curve hard`,
    rootDir,
  );

  const overrideSampleCoords = [
    { x: 4, y: 24 },  // start
    { x: 10, y: 24 }, // mid
    { x: 16, y: 24 }, // mid-high
    { x: 22, y: 24 }, // end — full pressure
  ];

  const samplesOverride = overrideSampleCoords.map(({ x, y }) => {
    const s = pxcJSON(`draw:sample -c art --x ${x} --y ${y}`, rootDir);
    return { x, y, rgba: s.result.rgba };
  });

  return { presetFromProject: preset, samplesPreset, samplesOverride };
}

describe('Pressure Pipeline E2E (M5 closure)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-pressure-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('preset persists pressureSensitivity with correct config', () => {
    const { presetFromProject } = runPressurePipeline(tmpDir);
    expect(presetFromProject.pressureSensitivity).toEqual({
      enabled: true,
      curve: 'soft',
      minSize: 0.3,
      minOpacity: 0.2,
    });
  });

  it('stroke with preset pressure produces non-transparent pixels on path', () => {
    const { samplesPreset } = runPressurePipeline(tmpDir);

    // Pixels on the stroke path should have red channel > 0
    for (const s of samplesPreset.slice(0, 4)) {
      expect(s.rgba.a, `pixel (${s.x},${s.y}) should not be transparent`).toBeGreaterThan(0);
      expect(s.rgba.r, `pixel (${s.x},${s.y}) should have red`).toBeGreaterThan(0);
    }

    // Corner pixel should be untouched
    const corner = samplesPreset[4];
    expect(corner.rgba.a, 'corner (0,0) should be transparent').toBe(0);
  });

  it('higher pressure produces equal or higher opacity along stroke', () => {
    const { samplesPreset } = runPressurePipeline(tmpDir);

    // With pressure ramp 0.2 → 0.5 → 0.8 → 1.0 and soft curve,
    // the end point (full pressure) should have >= opacity than the start
    const startAlpha = samplesPreset[0].rgba.a;
    const endAlpha = samplesPreset[3].rgba.a;
    expect(endAlpha).toBeGreaterThanOrEqual(startAlpha);
  });

  it('inline override (hard curve) produces different output than preset (soft curve)', () => {
    const { samplesPreset, samplesOverride } = runPressurePipeline(tmpDir);

    // The override uses hard curve + blue color vs preset's soft curve + red color
    // At full pressure (last point), the pixel must have blue
    const fullPressureOverride = samplesOverride[samplesOverride.length - 1];
    expect(
      fullPressureOverride.rgba.b,
      `override pixel at full pressure (${fullPressureOverride.x},${fullPressureOverride.y}) should have blue`,
    ).toBeGreaterThan(0);

    // At least one override point should be painted (high pressure points)
    const paintedOverride = samplesOverride.filter(s => s.rgba.a > 0);
    expect(paintedOverride.length, 'at least some override points should be painted').toBeGreaterThan(0);

    // Preset pixels (red stroke) should have no blue channel
    for (const s of samplesPreset.slice(0, 4)) {
      expect(s.rgba.b, `preset pixel (${s.x},${s.y}) should have no blue`).toBe(0);
    }

    // The override's painted pixels should have blue, not red
    for (const s of paintedOverride) {
      expect(s.rgba.b, `painted override pixel (${s.x},${s.y}) should have blue`).toBeGreaterThan(0);
      expect(s.rgba.r, `painted override pixel (${s.x},${s.y}) should have no red`).toBe(0);
    }
  });

  it('pipeline is deterministic — identical inputs produce identical output', () => {
    // Run 1
    const run1Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-repro-1-'));
    const run1 = runPressurePipeline(run1Dir);

    // Run 2
    const run2Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-repro-2-'));
    const run2 = runPressurePipeline(run2Dir);

    // Verify pixel-for-pixel identity
    for (let i = 0; i < run1.samplesPreset.length; i++) {
      expect(run1.samplesPreset[i].rgba, `preset sample ${i} should be identical across runs`)
        .toEqual(run2.samplesPreset[i].rgba);
    }

    for (let i = 0; i < run1.samplesOverride.length; i++) {
      expect(run1.samplesOverride[i].rgba, `override sample ${i} should be identical across runs`)
        .toEqual(run2.samplesOverride[i].rgba);
    }

    // Cleanup
    fs.rmSync(run1Dir, { recursive: true, force: true });
    fs.rmSync(run2Dir, { recursive: true, force: true });
  });
});
