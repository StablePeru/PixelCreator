import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { encodeSvg } from '../../src/io/svg-encoder.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const SEMI: RGBA = { r: 0, g: 255, b: 0, a: 128 };

describe('encodeSvg', () => {
  it('produces valid SVG with rect for colored pixel', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    const svg = encodeSvg(buf, { pixelSize: 10, showGrid: false, gridColor: '#ccc', background: null });
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 20 20"');
    expect(svg).toContain('<rect x="0" y="0" width="10" height="10" fill="#ff0000"/>');
    expect(svg).toContain('</svg>');
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    const svg = encodeSvg(buf, { pixelSize: 10, showGrid: false, gridColor: '#ccc', background: null });
    // Only 1 rect for the red pixel
    expect((svg.match(/<rect/g) || []).length).toBe(1);
  });

  it('adds fill-opacity for semi-transparent pixels', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, SEMI);
    const svg = encodeSvg(buf, { pixelSize: 10, showGrid: false, gridColor: '#ccc', background: null });
    expect(svg).toContain('fill-opacity="0.50"');
  });

  it('includes grid lines when showGrid is true', () => {
    const buf = new PixelBuffer(2, 2);
    const svg = encodeSvg(buf, { pixelSize: 10, showGrid: true, gridColor: '#cccccc', background: null });
    expect(svg).toContain('<line');
    expect(svg).toContain('stroke="#cccccc"');
  });

  it('includes background rect when specified', () => {
    const buf = new PixelBuffer(2, 2);
    const svg = encodeSvg(buf, { pixelSize: 10, showGrid: false, gridColor: '#ccc', background: '#ffffff' });
    expect(svg).toContain('fill="#ffffff"');
  });

  it('scale affects rect dimensions', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(1, 1, RED);
    const svg = encodeSvg(buf, { pixelSize: 20, showGrid: false, gridColor: '#ccc', background: null });
    expect(svg).toContain('viewBox="0 0 40 40"');
    expect(svg).toContain('x="20" y="20" width="20" height="20"');
  });

  it('empty buffer produces valid SVG with no rects', () => {
    const buf = new PixelBuffer(4, 4);
    const svg = encodeSvg(buf, { pixelSize: 10, showGrid: false, gridColor: '#ccc', background: null });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).not.toContain('<rect');
  });
});
