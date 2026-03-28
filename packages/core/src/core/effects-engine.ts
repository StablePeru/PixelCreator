import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { hexToRGBA } from '../types/common.js';
import type { LayerEffect, DropShadowParams, OuterGlowParams, OutlineParams, ColorOverlayParams } from '../types/canvas.js';
import { blendChannel } from './layer-engine.js';
import type { BlendMode } from '../types/canvas.js';

export function applyLayerEffects(
  buffer: PixelBuffer,
  effects: LayerEffect[],
  canvasWidth: number,
  canvasHeight: number,
): PixelBuffer {
  let result = buffer;
  for (const effect of effects) {
    if (!effect.enabled) continue;
    switch (effect.type) {
      case 'drop-shadow':
        result = applyDropShadow(result, effect.params as DropShadowParams, canvasWidth, canvasHeight);
        break;
      case 'outer-glow':
        result = applyOuterGlow(result, effect.params as OuterGlowParams, canvasWidth, canvasHeight);
        break;
      case 'outline':
        result = applyOutline(result, effect.params as OutlineParams, canvasWidth, canvasHeight);
        break;
      case 'color-overlay':
        result = applyColorOverlay(result, effect.params as ColorOverlayParams);
        break;
    }
  }
  return result;
}

// --- Drop Shadow ---

export function applyDropShadow(
  buffer: PixelBuffer,
  params: DropShadowParams,
  canvasWidth: number,
  canvasHeight: number,
): PixelBuffer {
  const shadowColor = hexToRGBA(params.color);
  const result = new PixelBuffer(canvasWidth, canvasHeight);

  // Draw shadow at offset
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const src = buffer.getPixel(x, y);
      if (src.a === 0) continue;
      const sx = x + params.offsetX;
      const sy = y + params.offsetY;
      if (sx >= 0 && sx < canvasWidth && sy >= 0 && sy < canvasHeight) {
        const alpha = Math.round(Math.min(src.a, params.opacity));
        result.setPixel(sx, sy, { r: shadowColor.r, g: shadowColor.g, b: shadowColor.b, a: alpha });
      }
    }
  }

  // Apply blur
  const blurred = params.blur > 0 ? boxBlur(result, params.blur) : result;

  // Composite original on top of shadow
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const src = buffer.getPixel(x, y);
      if (src.a === 0) continue;
      blurred.setPixel(x, y, src);
    }
  }

  return blurred;
}

// --- Outer Glow ---

export function applyOuterGlow(
  buffer: PixelBuffer,
  params: OuterGlowParams,
  canvasWidth: number,
  canvasHeight: number,
): PixelBuffer {
  const glowColor = hexToRGBA(params.color);
  const expanded = expandSilhouette(buffer, params.radius);
  const result = new PixelBuffer(canvasWidth, canvasHeight);

  // Draw glow (expanded area minus original)
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const origPixel = x < buffer.width && y < buffer.height ? buffer.getPixel(x, y) : { r: 0, g: 0, b: 0, a: 0 };
      const expPixel = expanded.getPixel(x, y);

      if (expPixel.a > 0 && origPixel.a === 0) {
        // This pixel is in the glow area, not in original content
        const alpha = Math.round((expPixel.a / 255) * params.intensity);
        result.setPixel(x, y, { r: glowColor.r, g: glowColor.g, b: glowColor.b, a: Math.min(255, alpha) });
      }
    }
  }

  // Composite original on top
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const src = buffer.getPixel(x, y);
      if (src.a > 0) result.setPixel(x, y, src);
    }
  }

  return result;
}

// --- Outline ---

export function applyOutline(
  buffer: PixelBuffer,
  params: OutlineParams,
  canvasWidth: number,
  canvasHeight: number,
): PixelBuffer {
  const outlineColor = hexToRGBA(params.color);
  const result = new PixelBuffer(canvasWidth, canvasHeight);

  // Expand the ORIGINAL silhouette by thickness to get the outline zone
  const expanded = expandSilhouette(buffer, params.thickness);

  // Determine which pixels are in the outline zone
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const isExpanded = x < expanded.width && y < expanded.height && expanded.getPixel(x, y).a > 0;
      const isOriginal = x < buffer.width && y < buffer.height && buffer.getPixel(x, y).a > 0;

      let draw = false;
      if (params.position === 'outside' && isExpanded && !isOriginal) draw = true;
      else if (params.position === 'inside' && isOriginal) {
        // Inside: only edge pixels (original pixels adjacent to transparency)
        const edges = isEdgePixel(buffer, x, y);
        if (edges) draw = true;
      }
      else if (params.position === 'center' && isExpanded) draw = true;

      if (draw) {
        result.setPixel(x, y, outlineColor);
      }
    }
  }

  // Composite original on top
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const src = buffer.getPixel(x, y);
      if (src.a > 0) {
        if (params.position === 'inside') {
          // For inside, only keep outline at edges, preserve original elsewhere
          if (!isEdgePixel(buffer, x, y)) {
            result.setPixel(x, y, src);
          }
        } else {
          result.setPixel(x, y, src);
        }
      }
    }
  }

  return result;
}

function isEdgePixel(buffer: PixelBuffer, x: number, y: number): boolean {
  if (buffer.getPixel(x, y).a === 0) return false;
  const neighbors: [number, number][] = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  for (const [nx, ny] of neighbors) {
    if (nx < 0 || nx >= buffer.width || ny < 0 || ny >= buffer.height) return true;
    if (buffer.getPixel(nx, ny).a === 0) return true;
  }
  return false;
}

// --- Color Overlay ---

export function applyColorOverlay(
  buffer: PixelBuffer,
  params: ColorOverlayParams,
): PixelBuffer {
  const overlayColor = hexToRGBA(params.color);
  const result = buffer.clone();
  const mode = params.blendMode as BlendMode;
  const opacityScale = params.opacity / 255;

  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const src = result.getPixel(x, y);
      if (src.a === 0) continue;

      let r = overlayColor.r;
      let g = overlayColor.g;
      let b = overlayColor.b;

      if (mode !== 'normal') {
        r = blendChannel(mode, overlayColor.r, src.r);
        g = blendChannel(mode, overlayColor.g, src.g);
        b = blendChannel(mode, overlayColor.b, src.b);
      }

      result.setPixel(x, y, {
        r: Math.round(src.r + (r - src.r) * opacityScale),
        g: Math.round(src.g + (g - src.g) * opacityScale),
        b: Math.round(src.b + (b - src.b) * opacityScale),
        a: src.a,
      });
    }
  }

  return result;
}

// --- Utilities ---

export function boxBlur(buffer: PixelBuffer, radius: number): PixelBuffer {
  if (radius <= 0) return buffer;
  const { width, height } = buffer;

  // Horizontal pass
  const hPass = new PixelBuffer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width) {
          const p = buffer.getPixel(nx, y);
          r += p.r; g += p.g; b += p.b; a += p.a;
          count++;
        }
      }
      hPass.setPixel(x, y, {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
        a: Math.round(a / count),
      });
    }
  }

  // Vertical pass
  const result = new PixelBuffer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < height) {
          const p = hPass.getPixel(x, ny);
          r += p.r; g += p.g; b += p.b; a += p.a;
          count++;
        }
      }
      result.setPixel(x, y, {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
        a: Math.round(a / count),
      });
    }
  }

  return result;
}

export function expandSilhouette(buffer: PixelBuffer, radius: number): PixelBuffer {
  const { width, height } = buffer;
  const result = new PixelBuffer(width, height);
  const r2 = radius * radius;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check if this pixel is already non-transparent
      const orig = buffer.getPixel(x, y);
      if (orig.a > 0) {
        result.setPixel(x, y, { r: 255, g: 255, b: 255, a: 255 });
        continue;
      }

      // Check if any non-transparent pixel is within radius
      let bestDist2 = r2 + 1;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const dist2 = dx * dx + dy * dy;
          if (dist2 > r2) continue;
          const p = buffer.getPixel(nx, ny);
          if (p.a > 0 && dist2 < bestDist2) {
            bestDist2 = dist2;
          }
        }
      }

      if (bestDist2 <= r2) {
        // Distance falloff: closer = more opaque
        const dist = Math.sqrt(bestDist2);
        const falloff = 1 - dist / (radius + 1);
        result.setPixel(x, y, { r: 255, g: 255, b: 255, a: Math.round(falloff * 255) });
      }
    }
  }

  return result;
}

export function detectEdges(buffer: PixelBuffer): PixelBuffer {
  const { width, height } = buffer;
  const result = new PixelBuffer(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) continue;

      // Check 4-connected neighbors
      const neighbors: [number, number][] = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      let isEdge = false;
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          isEdge = true;
          break;
        }
        if (buffer.getPixel(nx, ny).a === 0) {
          isEdge = true;
          break;
        }
      }

      if (isEdge) {
        result.setPixel(x, y, { r: 255, g: 255, b: 255, a: 255 });
      }
    }
  }

  return result;
}
