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

describe('Animation v2 Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-anim-v2-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    // Draw red on frame 0
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill', tmpDir);
    // Add frame 1 and draw blue
    pxc('frame:add --canvas canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 0 --y 0 --width 8 --height 8 --color "#0000ff" --fill --frame frame-002', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('animation:tween', () => {
    it('generates intermediate frames', () => {
      const result = pxcJSON('animation:tween --canvas canvas --from 0 --to 1 --steps 2', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.framesGenerated).toBe(2);

      // Should now have 4 frames (original 2 + 2 tweened)
      const frames = pxcJSON('frame:list --canvas canvas', tmpDir);
      expect(frames.result.frames.length).toBe(4);
    });

    it('tween frames have blended colors', () => {
      pxc('animation:tween --canvas canvas --from 0 --to 1 --steps 1', tmpDir);
      // Frame at index 1 should be a mix of red and blue
      const frames = pxcJSON('frame:list --canvas canvas', tmpDir);
      const tweenFrameId = frames.result.frames[1].id;
      const sample = pxcJSON(`draw:sample --canvas canvas --x 4 --y 4 --frame ${tweenFrameId}`, tmpDir);
      // Should be purple-ish (mix of red and blue)
      expect(sample.result.rgba.r).toBeGreaterThan(80);
      expect(sample.result.rgba.b).toBeGreaterThan(80);
    });
  });

  describe('animation:reverse-frames', () => {
    it('reverses frame order', () => {
      const result = pxcJSON('animation:reverse-frames --canvas canvas --from 0 --to 1', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.framesReversed).toBe(2);

      // Frame 0 should now have blue content
      const sample = pxcJSON('draw:sample --canvas canvas --x 4 --y 4', tmpDir);
      expect(sample.result.rgba.b).toBe(255);
    });
  });

  describe('animation:ease', () => {
    it('applies easing to tag durations', () => {
      // Create a tag
      pxc('animation:create-tag --canvas canvas --name walk --from 0 --to 1', tmpDir);
      const result = pxcJSON('animation:ease --canvas canvas --tag walk --ease ease-in', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.framesAffected).toBe(2);
    });

    it('applies total-duration', () => {
      pxc('animation:create-tag --canvas canvas --name run --from 0 --to 1', tmpDir);
      const result = pxcJSON('animation:ease --canvas canvas --tag run --ease linear --total-duration 500', tmpDir);
      expect(result.success).toBe(true);
      // Each frame should be ~250ms
      expect(result.result.durations[0]).toBeCloseTo(250, -1);
    });
  });

  describe('frame:copy-to', () => {
    it('copies frames between canvases', () => {
      pxc('canvas:create --width 8 --height 8 --name target', tmpDir);
      const result = pxcJSON('frame:copy-to --canvas canvas --target target --frame 0', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.framesCopied).toBe(1);

      // Target should now have 2 frames
      const frames = pxcJSON('frame:list --canvas target', tmpDir);
      expect(frames.result.frames.length).toBe(2);
    });

    it('copies range of frames', () => {
      pxc('canvas:create --width 8 --height 8 --name target2', tmpDir);
      const result = pxcJSON('frame:copy-to --canvas canvas --target target2 --range "0-1"', tmpDir);
      expect(result.result.framesCopied).toBe(2);
    });
  });

  describe('frame:label', () => {
    it('sets a label on a frame', () => {
      const result = pxcJSON('frame:label --canvas canvas --frame 0 --label "keyframe-start"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.label).toBe('keyframe-start');
    });

    it('clears a label', () => {
      pxc('frame:label --canvas canvas --frame 0 --label "test"', tmpDir);
      const result = pxcJSON('frame:label --canvas canvas --frame 0 --clear', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.label).toBeNull();
    });
  });

  describe('frame:labels', () => {
    it('lists labeled frames', () => {
      pxc('frame:label --canvas canvas --frame 0 --label "start"', tmpDir);
      pxc('frame:label --canvas canvas --frame 1 --label "end"', tmpDir);
      const result = pxcJSON('frame:labels --canvas canvas', tmpDir);
      expect(result.result.labeledCount).toBe(2);
      expect(result.result.labels[0].label).toBe('start');
    });

    it('returns empty when no labels', () => {
      const result = pxcJSON('frame:labels --canvas canvas', tmpDir);
      expect(result.result.labeledCount).toBe(0);
    });
  });
});
