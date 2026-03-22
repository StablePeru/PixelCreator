import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { rgbToAnsi256, renderToTerminal, renderToTerminalPlain } from '../../src/io/terminal-renderer.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };

describe('rgbToAnsi256', () => {
  it('maps pure red to color cube', () => {
    const code = rgbToAnsi256(255, 0, 0);
    expect(code).toBeGreaterThanOrEqual(16);
    expect(code).toBeLessThanOrEqual(231);
  });

  it('maps black to near-black', () => {
    expect(rgbToAnsi256(0, 0, 0)).toBe(16);
  });

  it('maps gray to grayscale range', () => {
    const code = rgbToAnsi256(128, 128, 128);
    expect(code).toBeGreaterThanOrEqual(232);
    expect(code).toBeLessThanOrEqual(255);
  });
});

describe('renderToTerminal', () => {
  it('produces output with ANSI codes', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const output = renderToTerminal(buf);
    expect(output).toContain('\x1b[');
    expect(output).toContain('▀');
  });

  it('handles empty buffer', () => {
    const buf = new PixelBuffer(4, 4);
    const output = renderToTerminal(buf);
    expect(output).toBeDefined();
  });

  it('truecolor mode uses RGB codes', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    const output = renderToTerminal(buf, { truecolor: true });
    expect(output).toContain('38;2;255;0;0');
  });

  it('compresses 2 rows into 1 with half-blocks', () => {
    const buf = new PixelBuffer(1, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(0, 1, RED);
    const lines = renderToTerminal(buf).split('\n');
    expect(lines.length).toBe(2); // 4 pixel rows → 2 terminal rows
  });
});

describe('renderToTerminalPlain', () => {
  it('renders ASCII art', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const output = renderToTerminalPlain(buf);
    expect(output).not.toContain('\x1b['); // no ANSI codes
    expect(output.length).toBeGreaterThan(0);
  });
});
