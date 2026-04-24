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

describe('validation:* commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-validation-cli-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name hero', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('list on a fresh canvas returns no flags', () => {
    const result = pxcJSON('validation:list --canvas hero', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.count).toBe(0);
    expect(result.result.flags).toEqual([]);
  });

  it('flag creates a new flag with sequential ID', () => {
    const r1 = pxcJSON('validation:flag --canvas hero --severity warning --category palette --note "3 pixels off"', tmpDir);
    expect(r1.success).toBe(true);
    expect(r1.result.flag.id).toBe('flag-001');
    expect(r1.result.flag.canvas).toBe('hero');

    const r2 = pxcJSON('validation:flag --canvas hero --severity error --category pixel --note "second"', tmpDir);
    expect(r2.result.flag.id).toBe('flag-002');
  });

  it('flag with frame, layer, region, and multiple tags', () => {
    const r = pxcJSON(
      'validation:flag --canvas hero --severity info --category composition --note "scope" --frame 0 --layer layer-001 --region 1,2,3,4 --tag a --tag b',
      tmpDir,
    );
    const flag = r.result.flag;
    expect(flag.frameIndex).toBe(0);
    expect(flag.layerId).toBe('layer-001');
    expect(flag.region).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(flag.tags).toEqual(['a', 'b']);
  });

  it('list filters by open-only after resolve', () => {
    pxcJSON('validation:flag --canvas hero --severity warning --category palette --note one', tmpDir);
    pxcJSON('validation:flag --canvas hero --severity error --category pixel --note two', tmpDir);
    pxcJSON('validation:resolve --canvas hero --id flag-001 --resolution fixed', tmpDir);

    const all = pxcJSON('validation:list --canvas hero', tmpDir);
    expect(all.result.count).toBe(2);

    const open = pxcJSON('validation:list --canvas hero --open-only', tmpDir);
    expect(open.result.count).toBe(1);
    expect(open.result.flags[0].id).toBe('flag-002');
  });

  it('list filters by severity and category', () => {
    pxcJSON('validation:flag --canvas hero --severity warning --category palette --note p1', tmpDir);
    pxcJSON('validation:flag --canvas hero --severity error --category pixel --note p2', tmpDir);
    pxcJSON('validation:flag --canvas hero --severity warning --category animation --note p3', tmpDir);

    const bySev = pxcJSON('validation:list --canvas hero --severity error', tmpDir);
    expect(bySev.result.flags.map((f: any) => f.id)).toEqual(['flag-002']);

    const byCat = pxcJSON('validation:list --canvas hero --category animation', tmpDir);
    expect(byCat.result.flags.map((f: any) => f.id)).toEqual(['flag-003']);
  });

  it('resolve stamps resolvedAt and resolution', () => {
    pxcJSON('validation:flag --canvas hero --severity info --category other --note n', tmpDir);
    const r = pxcJSON('validation:resolve --canvas hero --id flag-001 --resolution "fixed in layer-001"', tmpDir);
    expect(r.result.flag.resolvedAt).toBeTypeOf('number');
    expect(r.result.flag.resolution).toBe('fixed in layer-001');
  });

  it('remove drops the flag from disk', () => {
    pxcJSON('validation:flag --canvas hero --severity info --category other --note n1', tmpDir);
    pxcJSON('validation:flag --canvas hero --severity info --category other --note n2', tmpDir);
    pxcJSON('validation:remove --canvas hero --id flag-001', tmpDir);

    const list = pxcJSON('validation:list --canvas hero', tmpDir);
    expect(list.result.flags.map((f: any) => f.id)).toEqual(['flag-002']);
  });

  it('report returns manual flags + empty size violations when no rules defined', () => {
    pxcJSON('validation:flag --canvas hero --severity warning --category palette --note "palette drift"', tmpDir);

    const report = pxcJSON('validation:report --canvas hero', tmpDir);
    expect(report.result.canvas).toBe('hero');
    expect(report.result.manual).toHaveLength(1);
    expect(report.result.automatic.size).toEqual([]);
  });

  it('report includes size violations when rules are set', () => {
    pxc('project:validation --add-rule "*:exact:8x8"', tmpDir);
    const report = pxcJSON('validation:report --canvas hero', tmpDir);
    expect(report.result.automatic.size.length).toBeGreaterThan(0);
  });

  it('report omits optional sections by default', () => {
    const report = pxcJSON('validation:report --canvas hero', tmpDir);
    expect(report.result.automatic.palette).toBeUndefined();
    expect(report.result.automatic.accessibility).toBeUndefined();
    expect(report.result.automatic.asset).toBeUndefined();
  });

  it('report --all populates palette, accessibility, and asset sections', () => {
    pxc('palette:create --name p8 --colors "#000000,#ffffff"', tmpDir);
    const report = pxcJSON('validation:report --canvas hero --all --palette p8', tmpDir);
    expect(Array.isArray(report.result.automatic.palette)).toBe(true);
    expect(report.result.automatic.accessibility).toBeDefined();
    expect(report.result.automatic.accessibility.paletteName).toBe('p8');
    expect(Array.isArray(report.result.automatic.asset)).toBe(true);
  });

  it('flag --dry-run does not persist', () => {
    pxcJSON('validation:flag --canvas hero --severity info --category other --note n --dry-run', tmpDir);
    const list = pxcJSON('validation:list --canvas hero', tmpDir);
    expect(list.result.count).toBe(0);
  });

  it('flag fails on unknown canvas', () => {
    expect(() =>
      pxc('validation:flag --canvas ghost --severity info --category other --note n', tmpDir),
    ).toThrow();
  });
});
