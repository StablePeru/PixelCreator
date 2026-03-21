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

describe('View & HTML Export Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-view-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 1 --y 1 --width 6 --height 6 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('view:preview', () => {
    it('renders ANSI preview', () => {
      const output = pxc('view:preview --canvas canvas', tmpDir);
      expect(output).toContain('\x1b['); // ANSI codes present
    });

    it('JSON mode returns metadata', () => {
      const result = pxcJSON('view:preview --canvas canvas', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.width).toBe(8);
      expect(result.result.height).toBe(8);
    });
  });

  describe('export:html', () => {
    it('generates HTML file', () => {
      const dest = path.join(tmpDir, 'preview.html');
      const result = pxcJSON(`export:html --canvas canvas --dest "${dest}" --scale 10`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
      const html = fs.readFileSync(dest, 'utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('data:image/png;base64,');
    });

    it('animated HTML includes frames', () => {
      pxc('frame:add --canvas canvas', tmpDir);
      const dest = path.join(tmpDir, 'anim.html');
      pxc(`export:html --canvas canvas --dest "${dest}" --animated`, tmpDir);
      const html = fs.readFileSync(dest, 'utf-8');
      expect(html).toContain('Pause');
      expect(html).toContain('Frame 1/');
    });

    it('grid option adds grid JS', () => {
      const dest = path.join(tmpDir, 'grid.html');
      pxc(`export:html --canvas canvas --dest "${dest}" --grid`, tmpDir);
      const html = fs.readFileSync(dest, 'utf-8');
      expect(html).toContain('drawGrid');
    });
  });
});
