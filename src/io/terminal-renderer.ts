import { PixelBuffer } from './png-codec.js';

export function rgbToAnsi256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round((r - 8) / 247 * 24) + 232;
  }
  const ri = Math.round(r / 255 * 5);
  const gi = Math.round(g / 255 * 5);
  const bi = Math.round(b / 255 * 5);
  return 16 + 36 * ri + 6 * gi + bi;
}

function fgAnsi256(code: number): string {
  return `\x1b[38;5;${code}m`;
}

function bgAnsi256(code: number): string {
  return `\x1b[48;5;${code}m`;
}

function fgTruecolor(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bgTruecolor(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

const RESET = '\x1b[0m';

export function renderToTerminal(
  buffer: PixelBuffer,
  options: { truecolor?: boolean; maxWidth?: number } = {},
): string {
  const truecolor = options.truecolor ?? false;
  const lines: string[] = [];

  // Use half-block chars: ▀ for top pixel, ▄ for bottom pixel
  // Each terminal row represents 2 pixel rows
  for (let y = 0; y < buffer.height; y += 2) {
    let line = '';
    for (let x = 0; x < buffer.width; x++) {
      const top = buffer.getPixel(x, y);
      const bottom = y + 1 < buffer.height ? buffer.getPixel(x, y + 1) : { r: 0, g: 0, b: 0, a: 0 };

      if (top.a === 0 && bottom.a === 0) {
        line += ' ';
      } else if (top.a > 0 && bottom.a > 0) {
        // Both pixels visible: fg=top, bg=bottom, char=▀
        if (truecolor) {
          line += fgTruecolor(top.r, top.g, top.b) + bgTruecolor(bottom.r, bottom.g, bottom.b) + '▀' + RESET;
        } else {
          line += fgAnsi256(rgbToAnsi256(top.r, top.g, top.b)) + bgAnsi256(rgbToAnsi256(bottom.r, bottom.g, bottom.b)) + '▀' + RESET;
        }
      } else if (top.a > 0) {
        if (truecolor) {
          line += fgTruecolor(top.r, top.g, top.b) + '▀' + RESET;
        } else {
          line += fgAnsi256(rgbToAnsi256(top.r, top.g, top.b)) + '▀' + RESET;
        }
      } else {
        if (truecolor) {
          line += fgTruecolor(bottom.r, bottom.g, bottom.b) + '▄' + RESET;
        } else {
          line += fgAnsi256(rgbToAnsi256(bottom.r, bottom.g, bottom.b)) + '▄' + RESET;
        }
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

export function renderToTerminalPlain(buffer: PixelBuffer): string {
  // Simple ASCII representation without colors
  const chars = ' .:-=+*#%@';
  const lines: string[] = [];

  for (let y = 0; y < buffer.height; y++) {
    let line = '';
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) {
        line += ' ';
      } else {
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        const idx = Math.floor((brightness / 255) * (chars.length - 1));
        line += chars[idx];
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}
