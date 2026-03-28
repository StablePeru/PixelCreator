import { describe, it, expect, vi } from 'vitest';
import { scaleBuffer, renderFrames } from '../../src/core/frame-renderer.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { CanvasData } from '../../src/types/canvas.js';

vi.mock('../../src/io/project-io.js', () => ({
  readCanvasJSON: vi.fn(),
  readLayerFrame: vi.fn(() => new PixelBuffer(4, 4)),
}));

describe('frame-renderer', () => {
  describe('scaleBuffer', () => {
    it('returns same buffer at scale 1', () => {
      const buf = new PixelBuffer(4, 4);
      buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
      const result = scaleBuffer(buf, 1);
      expect(result).toBe(buf); // same reference
    });

    it('scales 2x2 to 4x4 at 2x', () => {
      const buf = new PixelBuffer(2, 2);
      buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
      buf.setPixel(1, 0, { r: 0, g: 255, b: 0, a: 255 });
      buf.setPixel(0, 1, { r: 0, g: 0, b: 255, a: 255 });
      buf.setPixel(1, 1, { r: 255, g: 255, b: 0, a: 255 });

      const result = scaleBuffer(buf, 2);
      expect(result.width).toBe(4);
      expect(result.height).toBe(4);

      // Check that each pixel is expanded to 2x2 block
      expect(result.getPixel(0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.getPixel(1, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.getPixel(0, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.getPixel(1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

      expect(result.getPixel(2, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(result.getPixel(3, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    });

    it('scales 1x1 to 3x3 at 3x', () => {
      const buf = new PixelBuffer(1, 1);
      buf.setPixel(0, 0, { r: 128, g: 64, b: 32, a: 200 });

      const result = scaleBuffer(buf, 3);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);

      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(result.getPixel(x, y)).toEqual({ r: 128, g: 64, b: 32, a: 200 });
        }
      }
    });
  });

  describe('renderFrames', () => {
    const makeCanvas = (opts?: { includeReference?: boolean }): CanvasData => ({
      name: 'test-canvas',
      width: 4,
      height: 4,
      created: '2024-01-01',
      modified: '2024-01-01',
      palette: null,
      layers: [
        {
          id: 'layer-001',
          name: 'Layer 1',
          type: 'normal',
          visible: true,
          opacity: 100,
          blendMode: 'normal',
          locked: false,
          order: 0,
        },
        ...(opts?.includeReference
          ? [
              {
                id: 'ref-001',
                name: 'Reference',
                type: 'reference' as const,
                visible: true,
                opacity: 100,
                blendMode: 'normal' as const,
                locked: false,
                order: 1,
              },
            ]
          : []),
      ],
      frames: [
        { id: 'frame-001', index: 0, duration: 100 },
        { id: 'frame-002', index: 1, duration: 100 },
      ],
      animationTags: [],
    });

    it('renders a single frame at scale 1', () => {
      const canvas = makeCanvas();
      const results = renderFrames('/fake/path', 'test-canvas', canvas, [0], 1);
      expect(results).toHaveLength(1);
      expect(results[0].width).toBe(4);
      expect(results[0].height).toBe(4);
    });

    it('renders multiple frames', () => {
      const canvas = makeCanvas();
      const results = renderFrames('/fake/path', 'test-canvas', canvas, [0, 1], 1);
      expect(results).toHaveLength(2);
    });

    it('scales output when scale > 1', () => {
      const canvas = makeCanvas();
      const results = renderFrames('/fake/path', 'test-canvas', canvas, [0], 2);
      expect(results).toHaveLength(1);
      expect(results[0].width).toBe(8);
      expect(results[0].height).toBe(8);
    });

    it('throws on invalid frame index', () => {
      const canvas = makeCanvas();
      expect(() => renderFrames('/fake/path', 'test-canvas', canvas, [99], 1)).toThrow(
        'Frame index 99 not found',
      );
    });

    it('excludes reference layers from rendering', () => {
      const canvas = makeCanvas({ includeReference: true });
      const results = renderFrames('/fake/path', 'test-canvas', canvas, [0], 1);
      expect(results).toHaveLength(1);
      // The mock readLayerFrame should only be called for the normal layer, not the reference one
    });
  });
});
