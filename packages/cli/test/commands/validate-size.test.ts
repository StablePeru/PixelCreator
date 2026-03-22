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

describe('validate:size', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-validate-size-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name sprite', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes with no rules', () => {
    const result = pxcJSON('validate:size --all', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.warning).toBe('No size rules defined.');
  });

  it('passes when canvas matches exact rule', () => {
    pxc('project:validation --add-rule "*:exact:16x16"', tmpDir);
    const result = pxcJSON('validate:size --all', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.totalViolations).toBe(0);
    expect(result.result.results[0].passed).toBe(true);
  });

  it('fails when canvas does not match exact rule', () => {
    pxc('project:validation --add-rule "*:exact:8x8"', tmpDir);
    const result = pxcJSON('validate:size --all', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.totalViolations).toBe(1);
    expect(result.result.results[0].passed).toBe(false);
  });

  it('validates a specific canvas', () => {
    pxc('project:validation --add-rule "*:exact:16x16"', tmpDir);
    const result = pxcJSON('validate:size --canvas sprite', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.results).toHaveLength(1);
    expect(result.result.results[0].canvas).toBe('sprite');
  });

  it('only applies matching pattern', () => {
    pxc('project:validation --add-rule "other:exact:8x8"', tmpDir);
    const result = pxcJSON('validate:size --canvas sprite', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.results[0].passed).toBe(true);
  });
});
