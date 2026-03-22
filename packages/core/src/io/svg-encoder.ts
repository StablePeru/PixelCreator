import { PixelBuffer } from './png-codec.js';

export interface SvgOptions {
  pixelSize: number;
  showGrid: boolean;
  gridColor: string;
  background: string | null;
}

export function encodeSvg(buffer: PixelBuffer, options: SvgOptions): string {
  const { pixelSize, showGrid, gridColor, background } = options;
  const svgWidth = buffer.width * pixelSize;
  const svgHeight = buffer.height * pixelSize;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`);

  if (background) {
    parts.push(`  <rect width="${svgWidth}" height="${svgHeight}" fill="${background}"/>`);
  }

  // Pixel rects
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) continue;

      const r = pixel.r.toString(16).padStart(2, '0');
      const g = pixel.g.toString(16).padStart(2, '0');
      const b = pixel.b.toString(16).padStart(2, '0');
      const fill = `#${r}${g}${b}`;
      const sx = x * pixelSize;
      const sy = y * pixelSize;

      if (pixel.a < 255) {
        const opacity = (pixel.a / 255).toFixed(2);
        parts.push(`  <rect x="${sx}" y="${sy}" width="${pixelSize}" height="${pixelSize}" fill="${fill}" fill-opacity="${opacity}"/>`);
      } else {
        parts.push(`  <rect x="${sx}" y="${sy}" width="${pixelSize}" height="${pixelSize}" fill="${fill}"/>`);
      }
    }
  }

  // Grid lines
  if (showGrid) {
    parts.push(`  <g stroke="${gridColor}" stroke-width="0.5" opacity="0.3">`);
    for (let x = 0; x <= buffer.width; x++) {
      parts.push(`    <line x1="${x * pixelSize}" y1="0" x2="${x * pixelSize}" y2="${svgHeight}"/>`);
    }
    for (let y = 0; y <= buffer.height; y++) {
      parts.push(`    <line x1="0" y1="${y * pixelSize}" x2="${svgWidth}" y2="${y * pixelSize}"/>`);
    }
    parts.push('  </g>');
  }

  parts.push('</svg>');
  return parts.join('\n');
}
