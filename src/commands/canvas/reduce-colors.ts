import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
} from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { generatePalette } from '../../core/color-analysis-engine.js';
import { colorDistance } from '../../types/common.js';
import type { RGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasReduceColors extends BaseCommand {
  static description = 'Reduce the number of colors in a canvas to a maximum';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    'max-colors': Flags.integer({
      description: 'Maximum number of colors',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Target specific frame ID',
    }),
    'all-frames': Flags.boolean({
      description: 'Process all frames',
      default: true,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasReduceColors);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const maxColors = flags['max-colors'];
    if (maxColors < 1) {
      this.error('--max-colors must be at least 1.');
    }

    const framesToProcess = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : flags['all-frames']
        ? canvas.frames
        : [canvas.frames[0]];

    if (flags.frame && framesToProcess.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let framesProcessed = 0;

    for (const frame of framesToProcess) {
      // Build a palette from the flattened frame to determine the target colors
      const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frame.id),
      }));
      const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
      const palette = generatePalette(flattened, maxColors);

      // For each layer, remap pixels to nearest palette color
      for (const layer of canvas.layers) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        let modified = false;

        for (let y = 0; y < buffer.height; y++) {
          for (let x = 0; x < buffer.width; x++) {
            const px = buffer.getPixel(x, y);
            if (px.a === 0) continue;

            const nearest = findNearest(px, palette);
            if (nearest.r !== px.r || nearest.g !== px.g || nearest.b !== px.b) {
              buffer.setPixel(x, y, { r: nearest.r, g: nearest.g, b: nearest.b, a: px.a });
              modified = true;
            }
          }
        }

        if (modified) {
          writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, buffer);
        }
      }

      framesProcessed++;
    }

    const resultData = {
      maxColors,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'canvas:reduce-colors',
      { canvas: flags.canvas, 'max-colors': maxColors, frame: flags.frame, 'all-frames': flags['all-frames'] },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Canvas "${flags.canvas}" reduced to max ${data.maxColors} colors`);
      console.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}

function findNearest(pixel: RGBA, palette: RGBA[]): RGBA {
  let best = palette[0];
  let bestDist = colorDistance(pixel, best);

  for (let i = 1; i < palette.length; i++) {
    const dist = colorDistance(pixel, palette[i]);
    if (dist < bestDist) {
      bestDist = dist;
      best = palette[i];
    }
  }

  return best;
}
