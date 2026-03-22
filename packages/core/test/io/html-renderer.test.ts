import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { renderToHtml, renderAnimationHtml } from '../../src/io/html-renderer.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };

describe('renderToHtml', () => {
  it('produces valid HTML', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const html = renderToHtml(buf, { scale: 10, grid: false, title: 'Test' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<canvas');
    expect(html).toContain('data:image/png;base64,');
  });

  it('includes grid JS when grid=true', () => {
    const buf = new PixelBuffer(4, 4);
    const html = renderToHtml(buf, { scale: 10, grid: true, title: 'Grid' });
    expect(html).toContain('drawGrid');
  });

  it('embeds title', () => {
    const buf = new PixelBuffer(4, 4);
    const html = renderToHtml(buf, { scale: 5, grid: false, title: 'My Sprite' });
    expect(html).toContain('My Sprite');
  });

  it('scale affects canvas dimensions', () => {
    const buf = new PixelBuffer(8, 8);
    const html = renderToHtml(buf, { scale: 20, grid: false, title: 'Big' });
    expect(html).toContain('width="160"');
    expect(html).toContain('height="160"');
  });
});

describe('renderAnimationHtml', () => {
  it('produces HTML with multiple frames', () => {
    const frames = [new PixelBuffer(4, 4), new PixelBuffer(4, 4)];
    frames[0].setPixel(0, 0, RED);
    const html = renderAnimationHtml(frames, [100, 100], { scale: 10, grid: false, title: 'Anim' });
    expect(html).toContain('Pause');
    expect(html).toContain('Frame 1/2');
    expect(html).toContain('data:image/png;base64,');
  });

  it('includes durations in JS', () => {
    const frames = [new PixelBuffer(2, 2), new PixelBuffer(2, 2)];
    const html = renderAnimationHtml(frames, [200, 300], { scale: 5, grid: false, title: 'T' });
    expect(html).toContain('200');
    expect(html).toContain('300');
  });
});
