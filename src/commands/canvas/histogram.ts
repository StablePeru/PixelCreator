import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { topColors } from '../../core/color-analysis-engine.js';
import { rgbaToHex } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasHistogram extends BaseCommand {
  static description = 'Display color histogram of a canvas frame';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Target specific frame ID',
    }),
    top: Flags.integer({
      char: 'n',
      description: 'Number of top colors to display',
      default: 10,
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Specific layer ID (skip flattening)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasHistogram);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const frameId = flags.frame ?? canvas.frames[0].id;
    const frame = canvas.frames.find((f) => f.id === frameId);
    if (!frame) {
      this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
    }

    let buffer;

    if (flags.layer) {
      const layer = canvas.layers.find((l) => l.id === flags.layer);
      if (!layer) {
        this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
      }
      buffer = readLayerFrame(projectPath, flags.canvas, flags.layer, frame.id);
    } else {
      const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frame.id),
      }));
      buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    }

    const top = topColors(buffer, flags.top);

    const colors = top.map((entry) => ({
      hex: rgbaToHex(entry.color),
      count: entry.count,
      percentage: entry.percentage,
    }));

    // Count total unique colors via a full histogram pass
    const { colorHistogram } = await import('../../core/color-analysis-engine.js');
    const hist = colorHistogram(buffer);
    const uniqueColors = hist.size;

    const resultData = {
      colors,
      uniqueColors,
    };

    const cmdResult = makeResult(
      'canvas:histogram',
      { canvas: flags.canvas, frame: flags.frame, top: flags.top, layer: flags.layer },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Color histogram for "${flags.canvas}" (frame: ${frame.id}):`);
      console.log(`  Unique colors: ${data.uniqueColors}`);
      console.log(`  Top ${data.colors.length} colors:`);
      for (const entry of data.colors) {
        console.log(`    ${entry.hex}  ${entry.count} pixels  (${entry.percentage}%)`);
      }
    });
  }
}
