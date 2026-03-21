import { describe, it, expect } from 'vitest';
import {
  resolveFrameSequence,
  applyFpsOverride,
  validateTagRange,
} from '../../src/core/animation-engine.js';
import type { FrameInfo, AnimationTag } from '../../src/types/canvas.js';

function makeFrames(count: number, duration = 100): FrameInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `frame-${String(i + 1).padStart(3, '0')}`,
    index: i,
    duration,
  }));
}

describe('animation-engine', () => {
  describe('resolveFrameSequence', () => {
    it('returns all frames when no tag is provided', () => {
      const frames = makeFrames(4);
      const result = resolveFrameSequence(frames);
      expect(result).toHaveLength(4);
      expect(result.map((f) => f.index)).toEqual([0, 1, 2, 3]);
    });

    it('resolves forward tag', () => {
      const frames = makeFrames(5);
      const tag: AnimationTag = { name: 'walk', from: 1, to: 3, direction: 'forward', repeat: 1 };
      const result = resolveFrameSequence(frames, tag);
      expect(result.map((f) => f.index)).toEqual([1, 2, 3]);
    });

    it('resolves reverse tag', () => {
      const frames = makeFrames(5);
      const tag: AnimationTag = { name: 'walk', from: 1, to: 3, direction: 'reverse', repeat: 1 };
      const result = resolveFrameSequence(frames, tag);
      expect(result.map((f) => f.index)).toEqual([3, 2, 1]);
    });

    it('resolves pingpong tag', () => {
      const frames = makeFrames(5);
      const tag: AnimationTag = { name: 'walk', from: 0, to: 3, direction: 'pingpong', repeat: 1 };
      const result = resolveFrameSequence(frames, tag);
      // forward: 0,1,2,3 + reverse middle: 2,1
      expect(result.map((f) => f.index)).toEqual([0, 1, 2, 3, 2, 1]);
    });

    it('pingpong with 2 frames has no middle reverse', () => {
      const frames = makeFrames(5);
      const tag: AnimationTag = { name: 'walk', from: 1, to: 2, direction: 'pingpong', repeat: 1 };
      const result = resolveFrameSequence(frames, tag);
      expect(result.map((f) => f.index)).toEqual([1, 2]);
    });

    it('pingpong with 1 frame', () => {
      const frames = makeFrames(3);
      const tag: AnimationTag = { name: 'blink', from: 1, to: 1, direction: 'pingpong', repeat: 1 };
      const result = resolveFrameSequence(frames, tag);
      expect(result.map((f) => f.index)).toEqual([1]);
    });

    it('repeat multiplies sequence', () => {
      const frames = makeFrames(3);
      const tag: AnimationTag = { name: 'walk', from: 0, to: 1, direction: 'forward', repeat: 3 };
      const result = resolveFrameSequence(frames, tag);
      expect(result.map((f) => f.index)).toEqual([0, 1, 0, 1, 0, 1]);
    });

    it('preserves per-frame duration', () => {
      const frames: FrameInfo[] = [
        { id: 'frame-001', index: 0, duration: 50 },
        { id: 'frame-002', index: 1, duration: 200 },
        { id: 'frame-003', index: 2, duration: 100 },
      ];
      const result = resolveFrameSequence(frames);
      expect(result.map((f) => f.duration)).toEqual([50, 200, 100]);
    });
  });

  describe('applyFpsOverride', () => {
    it('overrides all durations based on FPS', () => {
      const sequence = [
        { index: 0, duration: 100 },
        { index: 1, duration: 200 },
      ];
      const result = applyFpsOverride(sequence, 10);
      expect(result.every((f) => f.duration === 100)).toBe(true);
    });

    it('rounds duration correctly for 12 FPS', () => {
      const sequence = [{ index: 0, duration: 100 }];
      const result = applyFpsOverride(sequence, 12);
      expect(result[0].duration).toBe(83); // 1000/12 = 83.33
    });
  });

  describe('validateTagRange', () => {
    it('returns null for valid tag', () => {
      const tag: AnimationTag = { name: 'walk', from: 0, to: 3, direction: 'forward', repeat: 1 };
      expect(validateTagRange(tag, 5)).toBeNull();
    });

    it('detects negative from', () => {
      const tag: AnimationTag = { name: 'walk', from: -1, to: 3, direction: 'forward', repeat: 1 };
      expect(validateTagRange(tag, 5)).toContain('negative');
    });

    it('detects to exceeding frame count', () => {
      const tag: AnimationTag = { name: 'walk', from: 0, to: 5, direction: 'forward', repeat: 1 };
      expect(validateTagRange(tag, 5)).toContain('exceeds');
    });

    it('detects from > to', () => {
      const tag: AnimationTag = { name: 'walk', from: 3, to: 1, direction: 'forward', repeat: 1 };
      expect(validateTagRange(tag, 5)).toContain('greater');
    });
  });
});
