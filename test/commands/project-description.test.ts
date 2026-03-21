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

describe('project:description', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-desc-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows empty description by default', () => {
    const result = pxcJSON('project:description', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.description).toBe('');
    expect(result.result.changed).toBe(false);
  });

  it('sets project description', () => {
    const result = pxcJSON('project:description --set "My game sprites"', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.description).toBe('My game sprites');
    expect(result.result.changed).toBe(true);
  });
});
