import { PixelBuffer } from '../io/png-codec.js';
import { readCanvasJSON, readLayerFrame } from '../io/project-io.js';
import { flattenLayers } from './layer-engine.js';
import type { LayerWithBuffer } from './layer-engine.js';
import type { CanvasData } from '../types/canvas.js';

export function scaleBuffer(buffer: PixelBuffer, scale: number): PixelBuffer {
  if (scale === 1) return buffer;
  const newWidth = buffer.width * scale;
  const newHeight = buffer.height * scale;
  const scaled = new PixelBuffer(newWidth, newHeight);

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          scaled.setPixel(x * scale + sx, y * scale + sy, pixel);
        }
      }
    }
  }

  return scaled;
}

export function renderFrames(
  projectPath: string,
  canvasName: string,
  canvas: CanvasData,
  frameIndices: number[],
  scale: number,
): PixelBuffer[] {
  const results: PixelBuffer[] = [];

  for (const frameIndex of frameIndices) {
    const frame = canvas.frames[frameIndex];
    if (!frame) {
      throw new Error(`Frame index ${frameIndex} not found in canvas "${canvasName}"`);
    }

    const layersWithBuffers: LayerWithBuffer[] = canvas.layers
      .filter((layerInfo) => layerInfo.type !== 'reference')
      .map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, canvasName, layerInfo.id, frame.id),
      }));

    let buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

    if (scale > 1) {
      buffer = scaleBuffer(buffer, scale);
    }

    results.push(buffer);
  }

  return results;
}
