import { PixelBuffer } from '../io/png-codec.js';
import type { BatchFrameTransform } from '../types/canvas.js';
import {
  flipBufferH,
  flipBufferV,
  rotateBuffer90,
  adjustBrightness,
  adjustContrast,
  invertColors,
  desaturate,
  hueShift,
  posterize,
} from './transform-engine.js';

export interface BatchFrameResult {
  frameId: string;
  buffer: PixelBuffer;
}

type TransformFn = (buf: PixelBuffer, params?: Record<string, number>) => PixelBuffer;

const transformMap: Record<BatchFrameTransform, TransformFn> = {
  'flip-h': (buf) => flipBufferH(buf),
  'flip-v': (buf) => flipBufferV(buf),
  'rotate-90': (buf) => rotateBuffer90(buf, 1),
  'rotate-180': (buf) => rotateBuffer90(buf, 2),
  'rotate-270': (buf) => rotateBuffer90(buf, 3),
  brightness: (buf, p) => adjustBrightness(buf, p?.amount ?? 0),
  contrast: (buf, p) => adjustContrast(buf, p?.amount ?? 0),
  invert: (buf) => invertColors(buf),
  desaturate: (buf, p) => desaturate(buf, p?.amount ?? 100),
  'hue-shift': (buf, p) => hueShift(buf, p?.degrees ?? 0),
  posterize: (buf, p) => posterize(buf, p?.levels ?? 4),
};

/**
 * Apply a named transform to multiple frame buffers.
 * Returns new buffers (immutable — originals are not modified).
 */
export function batchApplyToFrames(
  frames: Array<{ frameId: string; buffer: PixelBuffer }>,
  transform: BatchFrameTransform,
  params?: Record<string, number>,
): BatchFrameResult[] {
  const fn = transformMap[transform];
  if (!fn) {
    throw new Error(`Unknown batch transform: ${transform}`);
  }

  return frames.map(({ frameId, buffer }) => ({
    frameId,
    buffer: fn(buffer, params),
  }));
}

/**
 * Validate that all frame IDs exist in the available frames list.
 * Returns null if valid, or an error message string.
 */
export function validateBatchFrameIds(
  frameIds: string[],
  availableFrames: Array<{ id: string }>,
): string | null {
  if (frameIds.length === 0) {
    return 'No frame IDs provided';
  }

  const available = new Set(availableFrames.map((f) => f.id));
  const missing = frameIds.filter((id) => !available.has(id));

  if (missing.length > 0) {
    return `Unknown frame IDs: ${missing.join(', ')}`;
  }

  return null;
}
