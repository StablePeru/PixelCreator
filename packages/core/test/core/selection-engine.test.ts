import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  createRectSelection,
  createEllipseSelection,
  createColorSelection,
  createAllSelection,
  invertSelection,
  mergeSelections,
  getSelectionBounds,
  getSelectionPixelCount,
  clearSelection,
  extractSelection,
  pasteBuffer,
  moveSelection,
  selectionToPixelBuffer,
  pixelBufferToSelection,
} from '../../src/core/selection-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('createRectSelection', () => {
  it('creates a rectangular selection within bounds', () => {
    const mask = createRectSelection(8, 8, 2, 2, 4, 4);
    expect(mask.data[2 * 8 + 2]).toBe(255);
    expect(mask.data[5 * 8 + 5]).toBe(255);
    expect(mask.data[0]).toBe(0);
    expect(mask.data[6 * 8 + 6]).toBe(0);
  });

  it('clamps selection to canvas bounds', () => {
    const mask = createRectSelection(8, 8, -2, -2, 6, 6);
    expect(mask.data[0]).toBe(255);
    expect(mask.data[3 * 8 + 3]).toBe(255);
    expect(mask.data[4 * 8]).toBe(0);
    expect(getSelectionPixelCount(mask)).toBe(16); // 4x4 visible
  });

  it('handles zero-area selection', () => {
    const mask = createRectSelection(8, 8, 2, 2, 0, 0);
    expect(getSelectionPixelCount(mask)).toBe(0);
  });

  it('selects full canvas', () => {
    const mask = createRectSelection(8, 8, 0, 0, 8, 8);
    expect(getSelectionPixelCount(mask)).toBe(64);
  });
});

describe('createEllipseSelection', () => {
  it('creates an elliptical selection', () => {
    const mask = createEllipseSelection(16, 16, 8, 8, 4, 3);
    expect(mask.data[8 * 16 + 8]).toBe(255); // center
    expect(getSelectionPixelCount(mask)).toBeGreaterThan(0);
  });

  it('handles radius 0 as single pixel', () => {
    const mask = createEllipseSelection(8, 8, 3, 3, 0, 0);
    expect(getSelectionPixelCount(mask)).toBe(1);
    expect(mask.data[3 * 8 + 3]).toBe(255);
  });

  it('handles rx=0 as vertical line', () => {
    const mask = createEllipseSelection(8, 8, 4, 4, 0, 2);
    expect(mask.data[2 * 8 + 4]).toBe(255);
    expect(mask.data[6 * 8 + 4]).toBe(255);
    expect(mask.data[4 * 8 + 3]).toBe(0);
  });

  it('handles ry=0 as horizontal line', () => {
    const mask = createEllipseSelection(8, 8, 4, 4, 2, 0);
    expect(mask.data[4 * 8 + 2]).toBe(255);
    expect(mask.data[4 * 8 + 6]).toBe(255);
    expect(mask.data[3 * 8 + 4]).toBe(0);
  });

  it('clips to canvas bounds', () => {
    const mask = createEllipseSelection(8, 8, 0, 0, 4, 4);
    expect(getSelectionPixelCount(mask)).toBeGreaterThan(0);
    // All selected pixels should be within canvas
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const val = mask.data[y * 8 + x];
        expect(val === 0 || val === 255).toBe(true);
      }
    }
  });
});

describe('createColorSelection', () => {
  it('selects exact color match globally', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(2, 2, RED);
    buf.setPixel(1, 1, GREEN);

    const mask = createColorSelection(buf, RED, 0, false);
    expect(mask.data[0]).toBe(255);
    expect(mask.data[2 * 4 + 2]).toBe(255);
    expect(mask.data[1 * 4 + 1]).toBe(0);
    expect(getSelectionPixelCount(mask)).toBe(2);
  });

  it('selects with tolerance', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, { r: 250, g: 0, b: 0, a: 255 });
    buf.setPixel(1, 0, { r: 200, g: 0, b: 0, a: 255 });

    const mask = createColorSelection(buf, RED, 10, false);
    expect(mask.data[0]).toBe(255); // within tolerance
    expect(mask.data[1]).toBe(0);   // outside tolerance
  });

  it('selects contiguous pixels from start point', () => {
    const buf = new PixelBuffer(4, 4);
    // Create two separate red regions
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, RED);
    buf.setPixel(3, 3, RED);

    const mask = createColorSelection(buf, RED, 0, true, 0, 0);
    expect(mask.data[0]).toBe(255);
    expect(mask.data[1]).toBe(255);
    expect(mask.data[3 * 4 + 3]).toBe(0); // not contiguous
  });

  it('returns empty mask for no match', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);

    const mask = createColorSelection(buf, GREEN, 0, false);
    expect(getSelectionPixelCount(mask)).toBe(0);
  });

  it('returns empty mask if start point out of bounds', () => {
    const buf = new PixelBuffer(4, 4);
    const mask = createColorSelection(buf, RED, 0, true, -1, 0);
    expect(getSelectionPixelCount(mask)).toBe(0);
  });

  it('returns empty mask for contiguous without start point', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const mask = createColorSelection(buf, RED, 0, true);
    expect(getSelectionPixelCount(mask)).toBe(0);
  });
});

describe('createAllSelection', () => {
  it('selects all pixels', () => {
    const mask = createAllSelection(4, 4);
    expect(getSelectionPixelCount(mask)).toBe(16);
  });
});

describe('invertSelection', () => {
  it('inverts a partial selection', () => {
    const mask = createRectSelection(4, 4, 0, 0, 2, 2);
    expect(getSelectionPixelCount(mask)).toBe(4);

    const inverted = invertSelection(mask);
    expect(getSelectionPixelCount(inverted)).toBe(12);
    expect(inverted.data[0]).toBe(0);
    expect(inverted.data[3 * 4 + 3]).toBe(255);
  });

  it('inverts full selection to empty', () => {
    const mask = createAllSelection(4, 4);
    const inverted = invertSelection(mask);
    expect(getSelectionPixelCount(inverted)).toBe(0);
  });

  it('inverts empty selection to full', () => {
    const mask = createRectSelection(4, 4, 0, 0, 0, 0);
    const inverted = invertSelection(mask);
    expect(getSelectionPixelCount(inverted)).toBe(16);
  });
});

describe('mergeSelections', () => {
  it('merges two non-overlapping selections', () => {
    const a = createRectSelection(8, 8, 0, 0, 2, 2);
    const b = createRectSelection(8, 8, 4, 4, 2, 2);
    const merged = mergeSelections(a, b);
    expect(getSelectionPixelCount(merged)).toBe(8);
  });

  it('merges overlapping selections without duplication', () => {
    const a = createRectSelection(8, 8, 0, 0, 4, 4);
    const b = createRectSelection(8, 8, 2, 2, 4, 4);
    const merged = mergeSelections(a, b);
    expect(getSelectionPixelCount(merged)).toBe(28); // union: 16+16-4 overlap
  });
});

describe('getSelectionBounds', () => {
  it('returns bounds of selected region', () => {
    const mask = createRectSelection(8, 8, 2, 3, 4, 2);
    const bounds = getSelectionBounds(mask);
    expect(bounds).toEqual({ x: 2, y: 3, width: 4, height: 2 });
  });

  it('returns null for empty selection', () => {
    const mask = createRectSelection(8, 8, 0, 0, 0, 0);
    expect(getSelectionBounds(mask)).toBeNull();
  });

  it('returns single pixel bounds', () => {
    const data = new Uint8Array(64);
    data[3 * 8 + 5] = 255;
    const mask = { width: 8, height: 8, data };
    expect(getSelectionBounds(mask)).toEqual({ x: 5, y: 3, width: 1, height: 1 });
  });
});

describe('getSelectionPixelCount', () => {
  it('counts selected pixels', () => {
    const mask = createRectSelection(8, 8, 0, 0, 3, 3);
    expect(getSelectionPixelCount(mask)).toBe(9);
  });

  it('returns 0 for empty', () => {
    const mask = createRectSelection(8, 8, 0, 0, 0, 0);
    expect(getSelectionPixelCount(mask)).toBe(0);
  });
});

describe('clearSelection', () => {
  it('clears selected pixels to transparent', () => {
    const buf = new PixelBuffer(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setPixel(x, y, RED);
      }
    }

    const mask = createRectSelection(4, 4, 1, 1, 2, 2);
    clearSelection(buf, mask);

    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(1, 1)).toEqual(TRANSPARENT);
    expect(buf.getPixel(2, 2)).toEqual(TRANSPARENT);
    expect(buf.getPixel(3, 3)).toEqual(RED);
  });

  it('clears to custom color', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const mask = createRectSelection(4, 4, 0, 0, 1, 1);
    clearSelection(buf, mask, GREEN);
    expect(buf.getPixel(0, 0)).toEqual(GREEN);
  });
});

describe('extractSelection', () => {
  it('extracts only selected pixels', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(1, 1, RED);
    buf.setPixel(2, 2, GREEN);
    buf.setPixel(3, 3, BLUE);

    const mask = createRectSelection(4, 4, 1, 1, 2, 2);
    const extracted = extractSelection(buf, mask);

    expect(extracted.getPixel(1, 1)).toEqual(RED);
    expect(extracted.getPixel(2, 2)).toEqual(GREEN);
    expect(extracted.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(extracted.getPixel(3, 3)).toEqual(TRANSPARENT);
  });
});

describe('pasteBuffer', () => {
  it('pastes source onto dest at offset', () => {
    const dest = new PixelBuffer(8, 8);
    const source = new PixelBuffer(4, 4);
    source.setPixel(0, 0, RED);
    source.setPixel(1, 1, GREEN);

    pasteBuffer(dest, source, 2, 2);
    expect(dest.getPixel(2, 2)).toEqual(RED);
    expect(dest.getPixel(3, 3)).toEqual(GREEN);
    expect(dest.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('clips source outside dest bounds', () => {
    const dest = new PixelBuffer(4, 4);
    const source = new PixelBuffer(4, 4);
    source.setPixel(0, 0, RED);
    source.setPixel(3, 3, GREEN);

    pasteBuffer(dest, source, 2, 2);
    expect(dest.getPixel(2, 2)).toEqual(RED);
    // source(3,3) would be at dest(5,5) which is out of bounds
    expect(dest.getPixel(3, 3)).toEqual(TRANSPARENT);
  });

  it('skips transparent source pixels', () => {
    const dest = new PixelBuffer(4, 4);
    dest.setPixel(0, 0, RED);
    const source = new PixelBuffer(4, 4);
    // source(0,0) is transparent

    pasteBuffer(dest, source, 0, 0);
    expect(dest.getPixel(0, 0)).toEqual(RED); // preserved
  });
});

describe('moveSelection', () => {
  it('moves selected pixels by offset', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(2, 2, RED);
    buf.setPixel(3, 3, GREEN);

    const mask = createRectSelection(8, 8, 2, 2, 2, 2);
    const result = moveSelection(buf, mask, 3, 1);

    expect(result.getPixel(2, 2)).toEqual(TRANSPARENT); // cleared
    expect(result.getPixel(3, 3)).toEqual(TRANSPARENT); // cleared
    expect(result.getPixel(5, 3)).toEqual(RED);   // moved
    expect(result.getPixel(6, 4)).toEqual(GREEN);  // moved
  });

  it('clips pixels moved out of bounds', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(3, 3, RED);

    const mask = createRectSelection(4, 4, 3, 3, 1, 1);
    const result = moveSelection(buf, mask, 1, 1);

    expect(result.getPixel(3, 3)).toEqual(TRANSPARENT);
    // (4,4) is out of bounds, pixel is lost
  });
});

describe('selectionToPixelBuffer / pixelBufferToSelection', () => {
  it('round-trips correctly', () => {
    const original = createRectSelection(8, 8, 2, 2, 4, 3);
    const buffer = selectionToPixelBuffer(original);
    const restored = pixelBufferToSelection(buffer);

    expect(restored.width).toBe(original.width);
    expect(restored.height).toBe(original.height);

    for (let i = 0; i < original.data.length; i++) {
      expect(restored.data[i]).toBe(original.data[i]);
    }
  });

  it('converts selected pixels to white', () => {
    const mask = createRectSelection(4, 4, 0, 0, 1, 1);
    const buffer = selectionToPixelBuffer(mask);
    const pixel = buffer.getPixel(0, 0);
    expect(pixel.r).toBe(255);
    expect(pixel.g).toBe(255);
    expect(pixel.b).toBe(255);
  });

  it('converts unselected pixels to black', () => {
    const mask = createRectSelection(4, 4, 2, 2, 1, 1);
    const buffer = selectionToPixelBuffer(mask);
    const pixel = buffer.getPixel(0, 0);
    expect(pixel.r).toBe(0);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
  });
});
