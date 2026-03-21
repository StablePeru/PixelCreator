import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { extractUniqueColors } from '../../core/palette-engine.js';
import { computeContentBounds } from '../../core/drawing-engine.js';
import { rgbaToHex } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasStats extends BaseCommand {
  static description = 'Analyze pixel and color distribution of a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasStats);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const frameId = flags.frame ?? canvas.frames[0].id;
    const frame = canvas.frames.find((f) => f.id === frameId);
    if (!frame) {
      this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
    }

    // Flatten all layers for this frame
    const layersWithBuffers: LayerWithBuffer[] = [];
    for (const layer of canvas.layers) {
      const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      layersWithBuffers.push({ info: layer, buffer });
    }

    const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

    // Count pixels
    let opaquePixels = 0;
    let transparentPixels = 0;
    const colorCounts = new Map<string, number>();

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const px = flattened.getPixel(x, y);
        if (px.a === 0) {
          transparentPixels++;
        } else {
          opaquePixels++;
          const hex = rgbaToHex(px);
          colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + 1);
        }
      }
    }

    const uniqueColors = extractUniqueColors(flattened, false);
    const contentBounds = computeContentBounds(flattened);

    const colorDistribution = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color, count]) => ({ color, count }));

    const totalPixels = canvas.width * canvas.height;

    const resultData = {
      canvas: flags.canvas,
      frame: frame.id,
      width: canvas.width,
      height: canvas.height,
      totalPixels,
      opaquePixels,
      transparentPixels,
      uniqueColors: uniqueColors.length,
      colorDistribution,
      contentBounds,
    };

    const cmdResult = makeResult(
      'canvas:stats',
      { canvas: flags.canvas, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.canvas}" stats (frame: ${data.frame}):`);
      this.log(`  Size: ${data.width}x${data.height} (${data.totalPixels} pixels)`);
      this.log(`  Opaque: ${data.opaquePixels}, Transparent: ${data.transparentPixels}`);
      this.log(`  Unique colors: ${data.uniqueColors}`);
      if (data.contentBounds) {
        const b = data.contentBounds;
        this.log(`  Content bounds: (${b.x}, ${b.y}) ${b.width}x${b.height}`);
      } else {
        this.log('  Content bounds: empty');
      }
      if (data.colorDistribution.length > 0) {
        this.log('  Top colors:');
        for (const entry of data.colorDistribution.slice(0, 10)) {
          this.log(`    ${entry.color}: ${entry.count}`);
        }
      }
    });
  }
}
