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

function getCanvasTags(tmpDir: string, canvasName: string): any[] {
  const canvasPath = path.join(tmpDir, 'test.pxc', 'canvases', canvasName, 'canvas.json');
  const canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf-8'));
  return canvas.animationTags;
}

describe('frame:add tag expansion', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tag-expand-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name sprite', tmpDir);
    pxc('frame:add --canvas sprite --count 5', tmpDir);
    // Create tag covering frames 2-4
    pxc('animation:create-tag --canvas sprite --name run --from 2 --to 4', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adding frames after tag range leaves tags unchanged', () => {
    pxc('frame:add --canvas sprite --count 2', tmpDir); // appends at end
    const tags = getCanvasTags(tmpDir, 'sprite');
    expect(tags[0].from).toBe(2);
    expect(tags[0].to).toBe(4);
  });

  it('adding frames before tag shifts from and to', () => {
    pxc('frame:add --canvas sprite --count 2 --after 0', tmpDir); // insert at index 1
    const tags = getCanvasTags(tmpDir, 'sprite');
    expect(tags[0].from).toBe(4); // 2 + 2
    expect(tags[0].to).toBe(6); // 4 + 2
  });

  it('adding frames within tag expands to', () => {
    pxc('frame:add --canvas sprite --count 2 --after 2', tmpDir); // insert at index 3 (within tag 2-4)
    const tags = getCanvasTags(tmpDir, 'sprite');
    expect(tags[0].from).toBe(2);
    expect(tags[0].to).toBe(6); // 4 + 2
  });

  it('adding frames at start shifts all tags', () => {
    pxc('animation:create-tag --canvas sprite --name idle --from 0 --to 1', tmpDir);
    pxc('frame:add --canvas sprite --count 3 --after -1', tmpDir); // insert at index 0

    const tags = getCanvasTags(tmpDir, 'sprite');
    const run = tags.find((t: any) => t.name === 'run');
    const idle = tags.find((t: any) => t.name === 'idle');

    expect(run.from).toBe(5); // 2 + 3
    expect(run.to).toBe(7); // 4 + 3
    expect(idle.from).toBe(3); // 0 + 3
    expect(idle.to).toBe(4); // 1 + 3
  });
});
