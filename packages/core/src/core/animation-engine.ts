import type { FrameInfo, AnimationTag } from '../types/canvas.js';
import type { RGBA } from '../types/common.js';
import { PixelBuffer } from '../io/png-codec.js';
import { mergeLayerBuffers } from './layer-engine.js';

export interface ResolvedFrame {
  index: number;
  duration: number;
}

export function resolveFrameSequence(frames: FrameInfo[], tag?: AnimationTag): ResolvedFrame[] {
  if (!tag) {
    return frames.map((f) => ({ index: f.index, duration: f.duration }));
  }

  const from = tag.from;
  const to = tag.to;
  const slice = frames.filter((f) => f.index >= from && f.index <= to);

  if (slice.length === 0) return [];

  let sequence: ResolvedFrame[] = [];

  if (tag.direction === 'forward') {
    sequence = slice.map((f) => ({ index: f.index, duration: f.duration }));
  } else if (tag.direction === 'reverse') {
    sequence = [...slice].reverse().map((f) => ({ index: f.index, duration: f.duration }));
  } else {
    // pingpong: forward + reverse without duplicating endpoints
    const forward = slice.map((f) => ({ index: f.index, duration: f.duration }));
    const reverseMiddle = slice.length > 2
      ? [...slice].reverse().slice(1, -1).map((f) => ({ index: f.index, duration: f.duration }))
      : [];
    sequence = [...forward, ...reverseMiddle];
  }

  const repeat = Math.max(1, tag.repeat);
  if (repeat === 1) return sequence;

  const result: ResolvedFrame[] = [];
  for (let i = 0; i < repeat; i++) {
    result.push(...sequence);
  }
  return result;
}

export function applyFpsOverride(sequence: ResolvedFrame[], fps: number): ResolvedFrame[] {
  const duration = Math.round(1000 / fps);
  return sequence.map((f) => ({ ...f, duration }));
}

export function compositeOnionSkin(
  currentFrame: PixelBuffer,
  beforeFrames: PixelBuffer[],
  afterFrames: PixelBuffer[],
  opacity: number,
  beforeTint?: RGBA,
  afterTint?: RGBA,
): PixelBuffer {
  let result = new PixelBuffer(currentFrame.width, currentFrame.height);

  // Composite before frames (farthest first, so nearest ends up on top)
  const beforeCount = beforeFrames.length;
  for (let i = beforeFrames.length - 1; i >= 0; i--) {
    const frameOpacity = Math.round(opacity * (i + 1) / beforeCount);
    let frame = beforeFrames[i];
    if (beforeTint) {
      frame = tintBuffer(frame, beforeTint);
    }
    result = mergeLayerBuffers(result, frame, frameOpacity);
  }

  // Composite after frames (farthest first)
  const afterCount = afterFrames.length;
  for (let i = afterFrames.length - 1; i >= 0; i--) {
    const frameOpacity = Math.round(opacity * (i + 1) / afterCount);
    let frame = afterFrames[i];
    if (afterTint) {
      frame = tintBuffer(frame, afterTint);
    }
    result = mergeLayerBuffers(result, frame, frameOpacity);
  }

  // Current frame at full opacity on top
  result = mergeLayerBuffers(result, currentFrame, 255);

  return result;
}

function tintBuffer(buffer: PixelBuffer, tint: RGBA): PixelBuffer {
  const result = buffer.clone();
  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const pixel = result.getPixel(x, y);
      if (pixel.a === 0) continue;
      result.setPixel(x, y, {
        r: Math.round((pixel.r + tint.r) / 2),
        g: Math.round((pixel.g + tint.g) / 2),
        b: Math.round((pixel.b + tint.b) / 2),
        a: pixel.a,
      });
    }
  }
  return result;
}

export function validateTagRange(tag: AnimationTag, frameCount: number): string | null {
  if (tag.from < 0) return `Tag "${tag.name}" from index ${tag.from} is negative`;
  if (tag.to >= frameCount) return `Tag "${tag.name}" to index ${tag.to} exceeds frame count ${frameCount}`;
  if (tag.from > tag.to) return `Tag "${tag.name}" from index ${tag.from} is greater than to index ${tag.to}`;
  return null;
}

export function generatePaletteCycleFrames(
  buffer: PixelBuffer,
  paletteColors: RGBA[],
  cycleIndices: number[],
  frameCount: number,
): PixelBuffer[] {
  const results: PixelBuffer[] = [];
  const cycleColors = cycleIndices.map((i) => paletteColors[i]);

  for (let frame = 0; frame < frameCount; frame++) {
    const shifted = new PixelBuffer(buffer.width, buffer.height);

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const pixel = buffer.getPixel(x, y);
        if (pixel.a === 0) continue;

        // Check if this pixel matches one of the cycle colors
        let matched = false;
        for (let ci = 0; ci < cycleColors.length; ci++) {
          const cc = cycleColors[ci];
          if (pixel.r === cc.r && pixel.g === cc.g && pixel.b === cc.b && pixel.a === cc.a) {
            // Shift to next color in cycle
            const newIdx = (ci + frame) % cycleColors.length;
            shifted.setPixel(x, y, cycleColors[newIdx]);
            matched = true;
            break;
          }
        }

        if (!matched) {
          shifted.setPixel(x, y, pixel);
        }
      }
    }

    results.push(shifted);
  }

  return results;
}

export function reverseFrameRange(frames: FrameInfo[], from: number, to: number): FrameInfo[] {
  const result = [...frames];
  const rangeFrames = result.slice(from, to + 1).reverse();

  // Preserve IDs and indices but swap durations and labels
  for (let i = 0; i < rangeFrames.length; i++) {
    const targetIdx = from + i;
    result[targetIdx] = {
      ...result[targetIdx],
      duration: rangeFrames[i].duration,
      label: rangeFrames[i].label,
    };
  }

  return result;
}
