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

describe('palette:constraints', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-palconst-'));
    pxc('project:init --name test', tmpDir);
    pxc('palette:create --name main --colors "#ff0000,#00ff00,#0000ff"', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows constraints', () => {
    const result = pxcJSON('palette:constraints --name main', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.constraints).toBeDefined();
    expect(result.result.constraints.maxColors).toBeDefined();
  });

  it('sets max-colors', () => {
    const result = pxcJSON('palette:constraints --name main --max-colors 16', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.constraints.maxColors).toBe(16);
  });

  it('sets locked and allow-alpha', () => {
    const result = pxcJSON('palette:constraints --name main --locked true --allow-alpha false', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.constraints.locked).toBe(true);
    expect(result.result.constraints.allowAlpha).toBe(false);
  });
});
