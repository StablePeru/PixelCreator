import { PixelBuffer } from '../io/png-codec.js';
import type { AnimationTag } from '../types/canvas.js';
import { extractRegion } from './drawing-engine.js';

export interface SpritesheetOptions {
  layout: 'horizontal' | 'vertical' | 'grid';
  columns: number;
  spacing: number;
  margin?: number;
  padding?: number;
}

export interface SpritesheetResult {
  buffer: PixelBuffer;
  metadata: SpritesheetMetadata;
}

export interface SpritesheetMetadata {
  size: { width: number; height: number };
  frameSize: { width: number; height: number };
  frames: Array<{ x: number; y: number; w: number; h: number; duration: number }>;
  animationTags: AnimationTag[];
  margin?: number;
  padding?: number;
}

export function composeSpritesheet(
  frames: PixelBuffer[],
  frameWidth: number,
  frameHeight: number,
  durations: number[],
  tags: AnimationTag[],
  options: SpritesheetOptions,
): SpritesheetResult {
  const frameCount = frames.length;
  const spacing = options.spacing;
  const margin = options.margin ?? 0;
  const padding = options.padding ?? 0;

  let cols: number;
  let rows: number;

  if (options.layout === 'horizontal') {
    cols = frameCount;
    rows = 1;
  } else if (options.layout === 'vertical') {
    cols = 1;
    rows = frameCount;
  } else {
    cols = Math.min(options.columns, frameCount);
    rows = Math.ceil(frameCount / cols);
  }

  const cellWidth = frameWidth + padding * 2;
  const cellHeight = frameHeight + padding * 2;
  const sheetWidth = margin * 2 + cols * cellWidth + (cols - 1) * spacing;
  const sheetHeight = margin * 2 + rows * cellHeight + (rows - 1) * spacing;
  const sheet = new PixelBuffer(sheetWidth, sheetHeight);

  const frameMeta: Array<{ x: number; y: number; w: number; h: number; duration: number }> = [];

  for (let i = 0; i < frameCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = margin + col * (cellWidth + spacing) + padding;
    const oy = margin + row * (cellHeight + spacing) + padding;

    const fb = frames[i];

    // Draw frame pixels
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        sheet.setPixel(ox + x, oy + y, fb.getPixel(x, y));
      }
    }

    // Extrude padding (duplicate border pixels to prevent UV bleeding)
    if (padding > 0) {
      for (let p = 1; p <= padding; p++) {
        // Top/bottom extrude
        for (let x = 0; x < frameWidth; x++) {
          sheet.setPixel(ox + x, oy - p, fb.getPixel(x, 0));
          sheet.setPixel(ox + x, oy + frameHeight - 1 + p, fb.getPixel(x, frameHeight - 1));
        }
        // Left/right extrude
        for (let y = 0; y < frameHeight; y++) {
          sheet.setPixel(ox - p, oy + y, fb.getPixel(0, y));
          sheet.setPixel(ox + frameWidth - 1 + p, oy + y, fb.getPixel(frameWidth - 1, y));
        }
        // Corner extrude
        sheet.setPixel(ox - p, oy - p, fb.getPixel(0, 0));
        sheet.setPixel(ox + frameWidth - 1 + p, oy - p, fb.getPixel(frameWidth - 1, 0));
        sheet.setPixel(ox - p, oy + frameHeight - 1 + p, fb.getPixel(0, frameHeight - 1));
        sheet.setPixel(ox + frameWidth - 1 + p, oy + frameHeight - 1 + p, fb.getPixel(frameWidth - 1, frameHeight - 1));
      }
    }

    frameMeta.push({
      x: ox,
      y: oy,
      w: frameWidth,
      h: frameHeight,
      duration: durations[i] ?? 100,
    });
  }

  return {
    buffer: sheet,
    metadata: {
      size: { width: sheetWidth, height: sheetHeight },
      frameSize: { width: frameWidth, height: frameHeight },
      frames: frameMeta,
      animationTags: tags,
      ...(margin > 0 || padding > 0 ? { margin, padding } : {}),
    },
  };
}

export function decomposeSpritesheet(
  buffer: PixelBuffer,
  frameWidth: number,
  frameHeight: number,
  options: { layout: 'horizontal' | 'vertical' | 'grid'; columns?: number; spacing?: number },
): PixelBuffer[] {
  const spacing = options.spacing ?? 0;
  let cols: number;
  let rows: number;

  if (options.layout === 'horizontal') {
    cols = Math.floor((buffer.width + spacing) / (frameWidth + spacing));
    rows = 1;
  } else if (options.layout === 'vertical') {
    cols = 1;
    rows = Math.floor((buffer.height + spacing) / (frameHeight + spacing));
  } else {
    cols = options.columns ?? Math.floor((buffer.width + spacing) / (frameWidth + spacing));
    rows = Math.floor((buffer.height + spacing) / (frameHeight + spacing));
  }

  const frames: PixelBuffer[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = col * (frameWidth + spacing);
      const oy = row * (frameHeight + spacing);
      if (ox + frameWidth <= buffer.width && oy + frameHeight <= buffer.height) {
        frames.push(extractRegion(buffer, ox, oy, frameWidth, frameHeight));
      }
    }
  }

  return frames;
}
