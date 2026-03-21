import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  drawStamp,
  drawThickLine,
  drawThickRect,
  drawLine,
  drawRect,
  drawCircle,
  drawEllipse,
  drawPolyline,
  drawPolygon,
  drawBezierQuadratic,
  drawBezierCubic,
  drawRadialGradient,
  drawPatternFill,
} from '../../src/core/drawing-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('drawStamp', () => {
  it('size 1 draws single pixel', () => {
    const buf = new PixelBuffer(8, 8);
    drawStamp(buf, 4, 4, RED, 1, 'circle');
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(3, 4)).toEqual(TRANSPARENT);
  });

  it('circle stamp of size 3 fills nearby pixels', () => {
    const buf = new PixelBuffer(8, 8);
    drawStamp(buf, 4, 4, RED, 3, 'circle');
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(4, 3)).toEqual(RED);
    expect(buf.getPixel(3, 4)).toEqual(RED);
  });

  it('square stamp of size 3 fills 3x3', () => {
    const buf = new PixelBuffer(8, 8);
    drawStamp(buf, 4, 4, RED, 3, 'square');
    for (let y = 3; y <= 5; y++) {
      for (let x = 3; x <= 5; x++) {
        expect(buf.getPixel(x, y)).toEqual(RED);
      }
    }
  });

  it('clips at canvas edges', () => {
    const buf = new PixelBuffer(4, 4);
    drawStamp(buf, 0, 0, RED, 5, 'square');
    expect(buf.getPixel(0, 0)).toEqual(RED);
    // Should not throw
  });
});

describe('drawThickLine', () => {
  it('thickness 1 matches drawLine', () => {
    const buf1 = new PixelBuffer(16, 16);
    const buf2 = new PixelBuffer(16, 16);
    drawLine(buf1, 0, 0, 15, 15, RED);
    drawThickLine(buf2, 0, 0, 15, 15, RED, 1);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        expect(buf2.getPixel(x, y)).toEqual(buf1.getPixel(x, y));
      }
    }
  });

  it('thickness 3 horizontal line covers 3 rows', () => {
    const buf = new PixelBuffer(16, 16);
    drawThickLine(buf, 2, 8, 12, 8, RED, 3);
    // Center row
    expect(buf.getPixel(7, 8)).toEqual(RED);
    // Adjacent rows
    expect(buf.getPixel(7, 7)).toEqual(RED);
    expect(buf.getPixel(7, 9)).toEqual(RED);
  });

  it('single pixel thick line produces stamp', () => {
    const buf = new PixelBuffer(8, 8);
    drawThickLine(buf, 4, 4, 4, 4, RED, 3);
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(4, 3)).toEqual(RED);
  });
});

describe('drawThickRect', () => {
  it('thickness 1 matches drawRect outline', () => {
    const buf1 = new PixelBuffer(16, 16);
    const buf2 = new PixelBuffer(16, 16);
    drawRect(buf1, 2, 2, 10, 10, RED, false);
    drawThickRect(buf2, 2, 2, 10, 10, RED, false, 1);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        expect(buf2.getPixel(x, y)).toEqual(buf1.getPixel(x, y));
      }
    }
  });

  it('fill mode ignores thickness', () => {
    const buf = new PixelBuffer(16, 16);
    drawThickRect(buf, 2, 2, 4, 4, RED, true, 5);
    expect(buf.getPixel(3, 3)).toEqual(RED);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('thickness 3 creates wider border', () => {
    const buf = new PixelBuffer(32, 32);
    drawThickRect(buf, 5, 5, 20, 20, RED, false, 3);
    // Border should be colored
    expect(buf.getPixel(5, 5)).toEqual(RED);
    // Interior should be empty (if rect large enough)
    expect(buf.getPixel(15, 15)).toEqual(TRANSPARENT);
  });
});

describe('drawCircle thickness', () => {
  it('thickness 1 unchanged', () => {
    const buf = new PixelBuffer(32, 32);
    drawCircle(buf, 16, 16, 8, RED, false, 1);
    expect(buf.getPixel(24, 16)).toEqual(RED);
    expect(buf.getPixel(16, 16)).toEqual(TRANSPARENT);
  });

  it('thickness 3 creates wider ring', () => {
    const buf = new PixelBuffer(32, 32);
    drawCircle(buf, 16, 16, 10, RED, false, 3);
    // Outer edge should be colored
    expect(buf.getPixel(26, 16)).toEqual(RED);
    // Inner pixels (well inside) should be empty
    expect(buf.getPixel(16, 16)).toEqual(TRANSPARENT);
  });

  it('fill ignores thickness', () => {
    const buf = new PixelBuffer(16, 16);
    drawCircle(buf, 8, 8, 5, RED, true, 3);
    expect(buf.getPixel(8, 8)).toEqual(RED);
  });
});

describe('drawEllipse thickness', () => {
  it('thickness 1 unchanged', () => {
    const buf = new PixelBuffer(32, 32);
    drawEllipse(buf, 16, 16, 10, 6, RED, false, 1);
    expect(buf.getPixel(26, 16)).toEqual(RED);
  });

  it('thickness 3 creates wider outline', () => {
    const buf = new PixelBuffer(32, 32);
    drawEllipse(buf, 16, 16, 10, 8, RED, false, 3);
    // Center should be empty
    expect(buf.getPixel(16, 16)).toEqual(TRANSPARENT);
  });

  it('fill ignores thickness', () => {
    const buf = new PixelBuffer(16, 16);
    drawEllipse(buf, 8, 8, 5, 3, RED, true, 3);
    expect(buf.getPixel(8, 8)).toEqual(RED);
  });
});

describe('drawPolyline', () => {
  it('2-point polyline equals a line', () => {
    const buf1 = new PixelBuffer(16, 16);
    const buf2 = new PixelBuffer(16, 16);
    drawLine(buf1, 0, 0, 10, 10, RED);
    drawPolyline(buf2, [{ x: 0, y: 0 }, { x: 10, y: 10 }], RED);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        expect(buf2.getPixel(x, y)).toEqual(buf1.getPixel(x, y));
      }
    }
  });

  it('3-point polyline draws two segments', () => {
    const buf = new PixelBuffer(16, 16);
    drawPolyline(buf, [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 8 }], RED);
    expect(buf.getPixel(4, 0)).toEqual(RED);
    expect(buf.getPixel(8, 4)).toEqual(RED);
  });

  it('polyline with thickness', () => {
    const buf = new PixelBuffer(16, 16);
    drawPolyline(buf, [{ x: 0, y: 8 }, { x: 15, y: 8 }], RED, 3);
    expect(buf.getPixel(8, 7)).toEqual(RED);
    expect(buf.getPixel(8, 9)).toEqual(RED);
  });

  it('fewer than 2 points does nothing', () => {
    const buf = new PixelBuffer(8, 8);
    drawPolyline(buf, [{ x: 0, y: 0 }], RED);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('drawPolygon', () => {
  it('triangle outline draws 3 edges', () => {
    const buf = new PixelBuffer(16, 16);
    drawPolygon(buf, [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 7, y: 15 }], RED, false);
    expect(buf.getPixel(7, 0)).toEqual(RED); // top edge
    expect(buf.getPixel(0, 0)).toEqual(RED); // vertex
  });

  it('square fill fills interior', () => {
    const buf = new PixelBuffer(16, 16);
    drawPolygon(buf, [{ x: 2, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 10 }, { x: 2, y: 10 }], RED, true);
    expect(buf.getPixel(6, 6)).toEqual(RED);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('polygon with thickness', () => {
    const buf = new PixelBuffer(32, 32);
    drawPolygon(buf, [{ x: 5, y: 5 }, { x: 25, y: 5 }, { x: 25, y: 25 }, { x: 5, y: 25 }], RED, false, 3);
    // Thick border should be visible
    expect(buf.getPixel(5, 5)).toEqual(RED);
  });

  it('fewer than 3 points does nothing', () => {
    const buf = new PixelBuffer(8, 8);
    drawPolygon(buf, [{ x: 0, y: 0 }, { x: 5, y: 5 }], RED, true);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('triangle fill covers expected area', () => {
    const buf = new PixelBuffer(16, 16);
    drawPolygon(buf, [{ x: 0, y: 15 }, { x: 15, y: 15 }, { x: 7, y: 0 }], RED, true);
    // Bottom center should be filled
    expect(buf.getPixel(7, 14)).toEqual(RED);
    // Top corners far from triangle should be empty
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(buf.getPixel(15, 0)).toEqual(TRANSPARENT);
  });
});

describe('drawBezierQuadratic', () => {
  it('straight-line bezier approximates a line', () => {
    const buf = new PixelBuffer(16, 16);
    drawBezierQuadratic(buf, { x: 0, y: 0 }, { x: 7, y: 7 }, { x: 15, y: 15 }, RED, 1, 32);
    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(15, 15)).toEqual(RED);
    expect(buf.getPixel(7, 7)).toEqual(RED);
  });

  it('start and end points are colored', () => {
    const buf = new PixelBuffer(16, 16);
    drawBezierQuadratic(buf, { x: 0, y: 8 }, { x: 8, y: 0 }, { x: 15, y: 8 }, RED);
    expect(buf.getPixel(0, 8)).toEqual(RED);
    expect(buf.getPixel(15, 8)).toEqual(RED);
  });

  it('with thickness', () => {
    const buf = new PixelBuffer(16, 16);
    drawBezierQuadratic(buf, { x: 0, y: 8 }, { x: 8, y: 0 }, { x: 15, y: 8 }, RED, 3);
    expect(buf.getPixel(0, 8)).toEqual(RED);
  });

  it('custom segment count', () => {
    const buf = new PixelBuffer(16, 16);
    drawBezierQuadratic(buf, { x: 0, y: 0 }, { x: 8, y: 0 }, { x: 15, y: 15 }, RED, 1, 4);
    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(15, 15)).toEqual(RED);
  });
});

describe('drawBezierCubic', () => {
  it('start and end points are colored', () => {
    const buf = new PixelBuffer(16, 16);
    drawBezierCubic(buf, { x: 0, y: 8 }, { x: 5, y: 0 }, { x: 10, y: 15 }, { x: 15, y: 8 }, RED);
    expect(buf.getPixel(0, 8)).toEqual(RED);
    expect(buf.getPixel(15, 8)).toEqual(RED);
  });

  it('with thickness', () => {
    const buf = new PixelBuffer(16, 16);
    drawBezierCubic(buf, { x: 0, y: 8 }, { x: 5, y: 0 }, { x: 10, y: 15 }, { x: 15, y: 8 }, RED, 3);
    expect(buf.getPixel(0, 8)).toEqual(RED);
  });

  it('custom segment count', () => {
    const buf = new PixelBuffer(32, 32);
    drawBezierCubic(buf, { x: 0, y: 16 }, { x: 10, y: 0 }, { x: 20, y: 31 }, { x: 31, y: 16 }, RED, 1, 8);
    expect(buf.getPixel(0, 16)).toEqual(RED);
    expect(buf.getPixel(31, 16)).toEqual(RED);
  });
});

describe('drawRadialGradient', () => {
  it('center equals colorStart', () => {
    const buf = new PixelBuffer(16, 16);
    drawRadialGradient(buf, 8, 8, 8, WHITE, BLACK);
    expect(buf.getPixel(8, 8)).toEqual(WHITE);
  });

  it('edge equals colorEnd', () => {
    const buf = new PixelBuffer(32, 32);
    drawRadialGradient(buf, 16, 16, 10, WHITE, BLACK);
    const edgePixel = buf.getPixel(26, 16);
    expect(edgePixel.r).toBeLessThan(30);
    expect(edgePixel.g).toBeLessThan(30);
  });

  it('beyond radius equals colorEnd', () => {
    const buf = new PixelBuffer(32, 32);
    drawRadialGradient(buf, 16, 16, 5, WHITE, BLACK);
    const farPixel = buf.getPixel(0, 0);
    expect(farPixel).toEqual(BLACK);
  });

  it('midpoint is interpolated', () => {
    const buf = new PixelBuffer(32, 32);
    drawRadialGradient(buf, 16, 16, 10, { r: 0, g: 0, b: 0, a: 255 }, { r: 200, g: 200, b: 200, a: 255 });
    const midPixel = buf.getPixel(21, 16); // ~5px from center
    expect(midPixel.r).toBeGreaterThan(50);
    expect(midPixel.r).toBeLessThan(150);
  });

  it('region constrains fill', () => {
    const buf = new PixelBuffer(16, 16);
    drawRadialGradient(buf, 8, 8, 8, WHITE, BLACK, { x: 4, y: 4, width: 8, height: 8 });
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(buf.getPixel(8, 8).a).toBe(255);
  });
});

describe('drawPatternFill', () => {
  it('tiles 2x2 pattern on 4x4 buffer', () => {
    const pattern = new PixelBuffer(2, 2);
    pattern.setPixel(0, 0, RED);
    pattern.setPixel(1, 1, BLUE);

    const buf = new PixelBuffer(4, 4);
    drawPatternFill(buf, pattern);

    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(2, 0)).toEqual(RED);
    expect(buf.getPixel(1, 1)).toEqual(BLUE);
    expect(buf.getPixel(3, 3)).toEqual(BLUE);
  });

  it('offset shifts pattern', () => {
    const pattern = new PixelBuffer(2, 2);
    pattern.setPixel(0, 0, RED);

    const buf = new PixelBuffer(4, 4);
    drawPatternFill(buf, pattern, undefined, 1, 1);

    expect(buf.getPixel(1, 1)).toEqual(RED);
    expect(buf.getPixel(3, 3)).toEqual(RED);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('transparent pattern pixels do not overwrite', () => {
    const pattern = new PixelBuffer(2, 2);
    pattern.setPixel(0, 0, RED);
    // (1,0), (0,1), (1,1) are transparent

    const buf = new PixelBuffer(4, 4);
    buf.setPixel(1, 0, GREEN);
    drawPatternFill(buf, pattern);

    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(1, 0)).toEqual(GREEN); // preserved
  });

  it('region constrains fill', () => {
    const pattern = new PixelBuffer(1, 1);
    pattern.setPixel(0, 0, RED);

    const buf = new PixelBuffer(8, 8);
    drawPatternFill(buf, pattern, { x: 2, y: 2, width: 4, height: 4 });

    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(buf.getPixel(3, 3)).toEqual(RED);
    expect(buf.getPixel(6, 6)).toEqual(TRANSPARENT);
  });

  it('pattern larger than target works', () => {
    const pattern = new PixelBuffer(8, 8);
    pattern.setPixel(0, 0, RED);
    pattern.setPixel(3, 3, BLUE);

    const buf = new PixelBuffer(4, 4);
    drawPatternFill(buf, pattern);

    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(3, 3)).toEqual(BLUE);
  });
});
