import { PixelBuffer } from '../io/png-codec.js';
import { extractRegion } from './drawing-engine.js';

export interface NineSliceConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface NineSliceRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeNineSliceRegions(
  width: number,
  height: number,
  config: NineSliceConfig,
): NineSliceRegion[] {
  const { top, bottom, left, right } = config;

  if (top + bottom > height) throw new Error(`top (${top}) + bottom (${bottom}) exceeds height (${height})`);
  if (left + right > width) throw new Error(`left (${left}) + right (${right}) exceeds width (${width})`);

  const centerW = width - left - right;
  const centerH = height - top - bottom;
  const regions: NineSliceRegion[] = [];

  if (top > 0 && left > 0) regions.push({ name: 'top-left', x: 0, y: 0, width: left, height: top });
  if (top > 0 && centerW > 0) regions.push({ name: 'top', x: left, y: 0, width: centerW, height: top });
  if (top > 0 && right > 0) regions.push({ name: 'top-right', x: width - right, y: 0, width: right, height: top });
  if (centerH > 0 && left > 0) regions.push({ name: 'left', x: 0, y: top, width: left, height: centerH });
  if (centerH > 0 && centerW > 0) regions.push({ name: 'center', x: left, y: top, width: centerW, height: centerH });
  if (centerH > 0 && right > 0) regions.push({ name: 'right', x: width - right, y: top, width: right, height: centerH });
  if (bottom > 0 && left > 0) regions.push({ name: 'bottom-left', x: 0, y: height - bottom, width: left, height: bottom });
  if (bottom > 0 && centerW > 0) regions.push({ name: 'bottom', x: left, y: height - bottom, width: centerW, height: bottom });
  if (bottom > 0 && right > 0) regions.push({ name: 'bottom-right', x: width - right, y: 0 + height - bottom, width: right, height: bottom });

  return regions;
}

export function sliceNine(
  buffer: PixelBuffer,
  config: NineSliceConfig,
): { regions: NineSliceRegion[]; buffers: Map<string, PixelBuffer> } {
  const regions = computeNineSliceRegions(buffer.width, buffer.height, config);
  const buffers = new Map<string, PixelBuffer>();

  for (const region of regions) {
    buffers.set(region.name, extractRegion(buffer, region.x, region.y, region.width, region.height));
  }

  return { regions, buffers };
}
