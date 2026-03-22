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

describe('import:spritesheet', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-importss-'));
    pxc('project:init --name test', tmpDir);
    // Create a canvas with 2 frames, export as spritesheet
    pxc('canvas:create --width 8 --height 8 --name src', tmpDir);
    pxc('draw:rect --canvas src --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
    pxc('frame:add --canvas src', tmpDir);
    pxc('draw:rect --canvas src --layer layer-001 --frame frame-002 --x 0 --y 0 --width 8 --height 8 --color "#0000ff" --fill', tmpDir);
    pxc(`export:spritesheet --canvas src --dest "${path.join(tmpDir, 'sheet.png')}" --layout horizontal`, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('imports spritesheet as canvas with frames', () => {
    const result = pxcJSON(`import:spritesheet --file "${path.join(tmpDir, 'sheet.png')}" --name imported --frame-width 8 --frame-height 8`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.framesImported).toBe(2);
    expect(result.result.frameWidth).toBe(8);
    expect(result.result.frameHeight).toBe(8);
  });

  it('creates canvas in project', () => {
    pxc(`import:spritesheet --file "${path.join(tmpDir, 'sheet.png')}" --name imported --frame-width 8 --frame-height 8`, tmpDir);
    const projectPath = path.join(tmpDir, 'test.pxc', 'project.json');
    const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    expect(project.canvases).toContain('imported');
  });

  it('errors on duplicate canvas name', () => {
    expect(() => {
      pxc(`import:spritesheet --file "${path.join(tmpDir, 'sheet.png')}" --name src --frame-width 8 --frame-height 8`, tmpDir);
    }).toThrow();
  });

  it('imports vertical spritesheet', () => {
    pxc(`export:spritesheet --canvas src --dest "${path.join(tmpDir, 'vsheet.png')}" --layout vertical`, tmpDir);
    const result = pxcJSON(`import:spritesheet --file "${path.join(tmpDir, 'vsheet.png')}" --name vimported --frame-width 8 --frame-height 8 --layout vertical`, tmpDir);
    expect(result.success).toBe(true);
    expect(result.result.framesImported).toBe(2);
  });

  it('uses custom duration', () => {
    pxc(`import:spritesheet --file "${path.join(tmpDir, 'sheet.png')}" --name durtest --frame-width 8 --frame-height 8 --duration 200`, tmpDir);
    const canvasPath = path.join(tmpDir, 'test.pxc', 'canvases', 'durtest', 'canvas.json');
    const canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf-8'));
    expect(canvas.frames[0].duration).toBe(200);
  });
});
