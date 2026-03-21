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

describe('project:tags', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tags-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists empty tags', () => {
    const result = pxcJSON('project:tags', tmpDir);
    expect(result.success).toBe(true);
    expect(Object.keys(result.result.tags)).toHaveLength(0);
  });

  it('adds a tag', () => {
    const result = pxcJSON('project:tags --add "category:character"', tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.tags.category).toContain('character');
  });

  it('adds multiple values to same key', () => {
    pxc('project:tags --add "category:character"', tmpDir);
    pxc('project:tags --add "category:npc"', tmpDir);
    const result = pxcJSON('project:tags', tmpDir);
    expect(result.result.tags.category).toEqual(['character', 'npc']);
  });

  it('removes a tag value', () => {
    pxc('project:tags --add "category:character"', tmpDir);
    pxc('project:tags --add "category:npc"', tmpDir);
    pxc('project:tags --remove "category:npc"', tmpDir);
    const result = pxcJSON('project:tags', tmpDir);
    expect(result.result.tags.category).toEqual(['character']);
  });

  it('removes entire key', () => {
    pxc('project:tags --add "category:character"', tmpDir);
    pxc('project:tags --remove-key category', tmpDir);
    const result = pxcJSON('project:tags', tmpDir);
    expect(result.result.tags.category).toBeUndefined();
  });
});
