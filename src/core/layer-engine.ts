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
    case 'color-dodge':
      return Math.min(255, Math.round(dstC * 255 / Math.max(1, 255 - srcC)));
    case 'color-burn':
      return Math.max(0, Math.round(255 - (255 - dstC) * 255 / Math.max(1, srcC)));
    case 'hard-light':
      return srcC < 128
        ? Math.round(2 * srcC * dstC / 255)
        : 255 - Math.round(2 * (255 - srcC) * (255 - dstC) / 255);
    case 'soft-light': {
      const s = srcC / 255;
      const d = dstC / 255;
      const result = s < 0.5
        ? d - (1 - 2 * s) * d * (1 - d)
        : d + (2 * s - 1) * (Math.sqrt(d) - d);
      return Math.round(Math.max(0, Math.min(255, result * 255)));
    }
    case 'difference':
      return Math.abs(srcC - dstC);
    case 'exclusion':
      return srcC + dstC - Math.round(2 * srcC * dstC / 255);
    case 'addition':
      return Math.min(255, srcC + dstC);
    case 'subtract':
      return Math.max(0, dstC - srcC);
    default:
      return srcC;
  }
}

export function getChildLayers(layers: LayerInfo[], parentId: string | null): LayerInfo[] {
  return layers.filter((l) => (l.parentId ?? null) === parentId);
}

export function applyClippingMask(layer: PixelBuffer, base: PixelBuffer): PixelBuffer {
  const result = layer.clone();
  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const basePixel = base.getPixel(x, y);
      if (basePixel.a === 0) {
        result.setPixel(x, y, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
  }
  return result;
}

function compositeLayerOnto(
  result: PixelBuffer,
  srcBuffer: PixelBuffer,
  blendMode: BlendMode,
  opacity: number,
  width: number,
  height: number,
): void {
  const layerOpacity = opacity / 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = srcBuffer.getPixel(x, y);
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
}

export function flattenLayers(layers: LayerWithBuffer[], width: number, height: number): PixelBuffer {
  return flattenLayerTree(layers, width, height, null);
}

export function flattenLayerTree(
  allLayers: LayerWithBuffer[],
  width: number,
  height: number,
  parentId: string | null,
): PixelBuffer {
  const result = new PixelBuffer(width, height);

  // Get direct children of this parent, sorted by order
  const children = allLayers
    .filter((l) => (l.info.parentId ?? null) === parentId && l.info.visible)
    .sort((a, b) => a.info.order - b.info.order);

  let prevBuffer: PixelBuffer | null = null;

  for (const layer of children) {
    let layerBuffer: PixelBuffer;

    if (layer.info.isGroup) {
      // Recursively flatten group children
      layerBuffer = flattenLayerTree(allLayers, width, height, layer.info.id);
    } else {
      layerBuffer = layer.buffer;
    }

    // Apply clipping mask if enabled
    if (layer.info.clipping && prevBuffer) {
      layerBuffer = applyClippingMask(layerBuffer, prevBuffer);
    }

    // Composite onto result
    compositeLayerOnto(result, layerBuffer, layer.info.blendMode, layer.info.isGroup ? layer.info.opacity : layer.info.opacity, width, height);

    // Track previous composited state for clipping
    prevBuffer = result.clone();
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
