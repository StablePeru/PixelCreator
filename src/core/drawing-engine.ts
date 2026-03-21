import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { rgbaEqual, colorDistance } from '../types/common.js';

export function drawPixel(buffer: PixelBuffer, x: number, y: number, color: RGBA): void {
  buffer.setPixel(x, y, color);
}

export function drawLine(
  buffer: PixelBuffer,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGBA,
): void {
  // Bresenham's line algorithm
  let dx = Math.abs(x2 - x1);
  let dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;

  let cx = x1;
  let cy = y1;

  for (;;) {
    buffer.setPixel(cx, cy, color);
    if (cx === x2 && cy === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      cx += sx;
    }
    if (e2 <= dx) {
      err += dx;
      cy += sy;
    }
  }
}

export function drawRect(
  buffer: PixelBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGBA,
  fill: boolean,
): void {
  if (fill) {
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        buffer.setPixel(px, py, color);
      }
    }
  } else {
    // Top and bottom
    for (let px = x; px < x + width; px++) {
      buffer.setPixel(px, y, color);
      buffer.setPixel(px, y + height - 1, color);
    }
    // Left and right
    for (let py = y + 1; py < y + height - 1; py++) {
      buffer.setPixel(x, py, color);
      buffer.setPixel(x + width - 1, py, color);
    }
  }
}

export function floodFill(
  buffer: PixelBuffer,
  startX: number,
  startY: number,
  fillColor: RGBA,
  tolerance: number = 0,
  contiguous: boolean = true,
): void {
  if (startX < 0 || startX >= buffer.width || startY < 0 || startY >= buffer.height) return;

  const targetColor = buffer.getPixel(startX, startY);
  if (rgbaEqual(targetColor, fillColor)) return;

  if (!contiguous) {
    // Replace all matching pixels
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const pixel = buffer.getPixel(x, y);
        if (tolerance === 0 ? rgbaEqual(pixel, targetColor) : colorDistance(pixel, targetColor) <= tolerance) {
          buffer.setPixel(x, y, fillColor);
        }
      }
    }
    return;
  }

  // BFS flood fill
  const visited = new Uint8Array(buffer.width * buffer.height);
  const queue: [number, number][] = [[startX, startY]];
  visited[startY * buffer.width + startX] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    buffer.setPixel(x, y, fillColor);

    const neighbors: [number, number][] = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= buffer.width || ny < 0 || ny >= buffer.height) continue;
      const idx = ny * buffer.width + nx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pixel = buffer.getPixel(nx, ny);
      const matches =
        tolerance === 0 ? rgbaEqual(pixel, targetColor) : colorDistance(pixel, targetColor) <= tolerance;

      if (matches) {
        queue.push([nx, ny]);
      }
    }
  }
}

export function drawCircle(
  buffer: PixelBuffer,
  cx: number,
  cy: number,
  radius: number,
  color: RGBA,
  fill: boolean,
): void {
  if (radius === 0) {
    buffer.setPixel(cx, cy, color);
    return;
  }

  if (fill) {
    // Filled circle using horizontal spans
    let x = 0;
    let y = radius;
    let d = 1 - radius;

    const drawSpan = (sy: number, x1: number, x2: number) => {
      for (let px = x1; px <= x2; px++) {
        buffer.setPixel(px, sy, color);
      }
    };

    while (x <= y) {
      drawSpan(cy + y, cx - x, cx + x);
      drawSpan(cy - y, cx - x, cx + x);
      drawSpan(cy + x, cx - y, cx + y);
      drawSpan(cy - x, cx - y, cx + y);

      x++;
      if (d < 0) {
        d += 2 * x + 1;
      } else {
        y--;
        d += 2 * (x - y) + 1;
      }
    }
  } else {
    // Outline using midpoint circle algorithm (8-way symmetry)
    let x = 0;
    let y = radius;
    let d = 1 - radius;

    while (x <= y) {
      buffer.setPixel(cx + x, cy + y, color);
      buffer.setPixel(cx - x, cy + y, color);
      buffer.setPixel(cx + x, cy - y, color);
      buffer.setPixel(cx - x, cy - y, color);
      buffer.setPixel(cx + y, cy + x, color);
      buffer.setPixel(cx - y, cy + x, color);
      buffer.setPixel(cx + y, cy - x, color);
      buffer.setPixel(cx - y, cy - x, color);

      x++;
      if (d < 0) {
        d += 2 * x + 1;
      } else {
        y--;
        d += 2 * (x - y) + 1;
      }
    }
  }
}

export function drawEllipse(
  buffer: PixelBuffer,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: RGBA,
  fill: boolean,
): void {
  if (rx === 0 && ry === 0) {
    buffer.setPixel(cx, cy, color);
    return;
  }

  if (rx === 0) {
    // Vertical line
    for (let y = cy - ry; y <= cy + ry; y++) {
      buffer.setPixel(cx, y, color);
    }
    return;
  }

  if (ry === 0) {
    // Horizontal line
    for (let x = cx - rx; x <= cx + rx; x++) {
      buffer.setPixel(x, cy, color);
    }
    return;
  }

  // Midpoint ellipse algorithm
  const rx2 = rx * rx;
  const ry2 = ry * ry;

  let x = 0;
  let y = ry;

  const plot4 = (px: number, py: number) => {
    if (fill) {
      for (let fx = cx - px; fx <= cx + px; fx++) {
        buffer.setPixel(fx, cy + py, color);
        buffer.setPixel(fx, cy - py, color);
      }
    } else {
      buffer.setPixel(cx + px, cy + py, color);
      buffer.setPixel(cx - px, cy + py, color);
      buffer.setPixel(cx + px, cy - py, color);
      buffer.setPixel(cx - px, cy - py, color);
    }
  };

  // Region 1: slope < 1
  let d1 = ry2 - rx2 * ry + 0.25 * rx2;
  let dx = 2 * ry2 * x;
  let dy = 2 * rx2 * y;

  while (dx < dy) {
    plot4(x, y);
    x++;
    dx += 2 * ry2;
    if (d1 < 0) {
      d1 += dx + ry2;
    } else {
      y--;
      dy -= 2 * rx2;
      d1 += dx - dy + ry2;
    }
  }

  // Region 2: slope >= 1
  let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;

  while (y >= 0) {
    plot4(x, y);
    y--;
    dy -= 2 * rx2;
    if (d2 > 0) {
      d2 += rx2 - dy;
    } else {
      x++;
      dx += 2 * ry2;
      d2 += dx - dy + rx2;
    }
  }
}

export function computeContentBounds(buffer: PixelBuffer): { x: number; y: number; width: number; height: number } | null {
  let minX = buffer.width;
  let minY = buffer.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function extractRegion(buffer: PixelBuffer, x: number, y: number, w: number, h: number): PixelBuffer {
  const result = new PixelBuffer(w, h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const srcX = x + px;
      const srcY = y + py;
      if (srcX >= 0 && srcX < buffer.width && srcY >= 0 && srcY < buffer.height) {
        result.setPixel(px, py, buffer.getPixel(srcX, srcY));
      }
    }
  }

  return result;
}

export function replaceColor(
  buffer: PixelBuffer,
  fromColor: RGBA,
  toColor: RGBA,
  tolerance: number = 0,
): number {
  let count = 0;
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      const matches =
        tolerance === 0 ? rgbaEqual(pixel, fromColor) : colorDistance(pixel, fromColor) <= tolerance;
      if (matches) {
        buffer.setPixel(x, y, toColor);
        count++;
      }
    }
  }
  return count;
}

export function drawGradient(
  buffer: PixelBuffer,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colorStart: RGBA,
  colorEnd: RGBA,
  region?: { x: number; y: number; width: number; height: number },
): void {
  const rx = region ? region.x : 0;
  const ry = region ? region.y : 0;
  const rw = region ? region.width : buffer.width;
  const rh = region ? region.height : buffer.height;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  for (let py = ry; py < ry + rh; py++) {
    for (let px = rx; px < rx + rw; px++) {
      let t: number;
      if (lenSq === 0) {
        t = 0;
      } else {
        t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      }
      t = Math.max(0, Math.min(1, t));

      buffer.setPixel(px, py, {
        r: Math.round(colorStart.r + (colorEnd.r - colorStart.r) * t),
        g: Math.round(colorStart.g + (colorEnd.g - colorStart.g) * t),
        b: Math.round(colorStart.b + (colorEnd.b - colorStart.b) * t),
        a: Math.round(colorStart.a + (colorEnd.a - colorStart.a) * t),
      });
    }
  }
}

export function generateOutline(
  buffer: PixelBuffer,
  color: RGBA,
  thickness: number,
  includeCorners: boolean,
): PixelBuffer {
  const { width, height } = buffer;
  const result = new PixelBuffer(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = buffer.getPixel(x, y);
      if (px.a !== 0) continue;

      let found = false;
      outer: for (let dy = -thickness; dy <= thickness; dy++) {
        for (let dx = -thickness; dx <= thickness; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!includeCorners && Math.abs(dx) + Math.abs(dy) > thickness) continue;
          if (includeCorners && (Math.abs(dx) > thickness || Math.abs(dy) > thickness)) continue;

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const neighbor = buffer.getPixel(nx, ny);
          if (neighbor.a !== 0) {
            found = true;
            break outer;
          }
        }
      }

      if (found) {
        result.setPixel(x, y, color);
      }
    }
  }

  return result;
}
