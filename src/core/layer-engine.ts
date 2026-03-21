import { PixelBuffer } from '../io/png-codec.js';
import type { LayerInfo, BlendMode } from '../types/canvas.js';

export type Anchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface LayerWithBuffer {
  info: LayerInfo;
  buffer: PixelBuffer;
}

export function compositeAlpha(dst: number, src: number, srcA: number): number {
  return Math.round(dst * (1 - srcA / 255) + src * (srcA / 255));
}

export function blendChannel(mode: BlendMode, srcC: number, dstC: number): number {
  switch (mode) {
    case 'normal':
      return srcC;
    case 'multiply':
      return Math.round(srcC * dstC / 255);
    case 'screen':
      return srcC + dstC - Math.round(srcC * dstC / 255);
    case 'overlay':
      return dstC < 128
        ? Math.round(2 * srcC * dstC / 255)
        : 255 - Math.round(2 * (255 - srcC) * (255 - dstC) / 255);
    case 'darken':
      return Math.min(srcC, dstC);
    case 'lighten':
      return Math.max(srcC, dstC);
    default:
      return srcC;
  }
}

export function flattenLayers(layers: LayerWithBuffer[], width: number, height: number): PixelBuffer {
  const result = new PixelBuffer(width, height);

  // Sort by order (lower = bottom)
  const sorted = [...layers]
    .filter((l) => l.info.visible)
    .sort((a, b) => a.info.order - b.info.order);

  for (const layer of sorted) {
    const layerOpacity = layer.info.opacity / 255;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = layer.buffer.getPixel(x, y);
        if (src.a === 0) continue;

        const effectiveAlpha = Math.round(src.a * layerOpacity);
        if (effectiveAlpha === 0) continue;

        const dst = result.getPixel(x, y);

        if (dst.a === 0) {
          result.setPixel(x, y, { r: src.r, g: src.g, b: src.b, a: effectiveAlpha });
        } else {
          let blendR = src.r;
          let blendG = src.g;
          let blendB = src.b;
          if (layer.info.blendMode !== 'normal') {
            blendR = blendChannel(layer.info.blendMode, src.r, dst.r);
            blendG = blendChannel(layer.info.blendMode, src.g, dst.g);
            blendB = blendChannel(layer.info.blendMode, src.b, dst.b);
          }

          const outA = effectiveAlpha + dst.a * (1 - effectiveAlpha / 255);
          if (outA === 0) continue;

          result.setPixel(x, y, {
            r: Math.round((blendR * effectiveAlpha + dst.r * dst.a * (1 - effectiveAlpha / 255)) / outA),
            g: Math.round((blendG * effectiveAlpha + dst.g * dst.a * (1 - effectiveAlpha / 255)) / outA),
            b: Math.round((blendB * effectiveAlpha + dst.b * dst.a * (1 - effectiveAlpha / 255)) / outA),
            a: Math.round(outA),
          });
        }
      }
    }
  }

  return result;
}

export function mergeLayerBuffers(
  bottom: PixelBuffer,
  top: PixelBuffer,
  topOpacity: number,
  blendMode: BlendMode = 'normal',
): PixelBuffer {
  const width = bottom.width;
  const height = bottom.height;
  const result = bottom.clone();
  const opacityFactor = topOpacity / 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = top.getPixel(x, y);
      if (src.a === 0) continue;

      const effectiveAlpha = Math.round(src.a * opacityFactor);
      if (effectiveAlpha === 0) continue;

      const dst = result.getPixel(x, y);

      if (dst.a === 0) {
        result.setPixel(x, y, { r: src.r, g: src.g, b: src.b, a: effectiveAlpha });
      } else {
        let blendR = src.r;
        let blendG = src.g;
        let blendB = src.b;
        if (blendMode !== 'normal') {
          blendR = blendChannel(blendMode, src.r, dst.r);
          blendG = blendChannel(blendMode, src.g, dst.g);
          blendB = blendChannel(blendMode, src.b, dst.b);
        }

        const outA = effectiveAlpha + dst.a * (1 - effectiveAlpha / 255);
        if (outA === 0) continue;

        result.setPixel(x, y, {
          r: Math.round((blendR * effectiveAlpha + dst.r * dst.a * (1 - effectiveAlpha / 255)) / outA),
          g: Math.round((blendG * effectiveAlpha + dst.g * dst.a * (1 - effectiveAlpha / 255)) / outA),
          b: Math.round((blendB * effectiveAlpha + dst.b * dst.a * (1 - effectiveAlpha / 255)) / outA),
          a: Math.round(outA),
        });
      }
    }
  }

  return result;
}

export function resizeBuffer(
  source: PixelBuffer,
  newWidth: number,
  newHeight: number,
  anchor: Anchor,
): PixelBuffer {
  const result = new PixelBuffer(newWidth, newHeight);

  // Calculate offset based on anchor
  let offsetX = 0;
  let offsetY = 0;

  if (anchor.includes('center') && !anchor.includes('left') && !anchor.includes('right')) {
    offsetX = Math.floor((newWidth - source.width) / 2);
  } else if (anchor.includes('right')) {
    offsetX = newWidth - source.width;
  }

  if (anchor.includes('center') && !anchor.includes('top') && !anchor.includes('bottom')) {
    offsetY = Math.floor((newHeight - source.height) / 2);
  } else if (anchor.includes('bottom')) {
    offsetY = newHeight - source.height;
  }

  // Copy pixels from source to result at calculated offset
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const destX = x + offsetX;
      const destY = y + offsetY;
      if (destX >= 0 && destX < newWidth && destY >= 0 && destY < newHeight) {
        result.setPixel(destX, destY, source.getPixel(x, y));
      }
    }
  }

  return result;
}
