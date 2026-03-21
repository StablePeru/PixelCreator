import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { colorHistogram } from '../../core/color-analysis-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasColorCount extends BaseCommand {
  static description = 'Count unique colors in a canvas frame';

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
    layer: Flags.string({
      char: 'l',
      description: 'Specific layer ID (skip flattening)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasColorCount);

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

    const hist = colorHistogram(buffer);
    const uniqueColors = hist.size;

    const resultData = {
      uniqueColors,
      canvas: flags.canvas,
    };

    const cmdResult = makeResult(
      'canvas:color-count',
      { canvas: flags.canvas, frame: flags.frame, layer: flags.layer },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Canvas "${data.canvas}" has ${data.uniqueColors} unique colors (frame: ${frameId})`);
    });
  }
}
