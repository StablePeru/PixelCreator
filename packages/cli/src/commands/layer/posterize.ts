import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, posterize, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerPosterize extends BaseCommand {
  static description = 'Posterize a layer (reduce color levels)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    layer: Flags.string({
      description: 'Layer ID',
      required: true,
    }),
    levels: Flags.integer({
      description: 'Number of color levels (2-256)',
      required: true,
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerPosterize);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.levels < 2 || flags.levels > 256) {
      this.error('Levels must be between 2 and 256.');
    }

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }
    if (layer.locked) {
      this.error(`Layer "${flags.layer}" is locked.`);
    }

    const frames = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : canvas.frames;

    if (flags.frame && frames.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let framesProcessed = 0;
    for (const frame of frames) {
      const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      const adjusted = posterize(buffer, flags.levels);
      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, adjusted);
      framesProcessed++;
    }

    const resultData = {
      canvas: flags.canvas,
      layer: flags.layer,
      levels: flags.levels,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'layer:posterize',
      { canvas: flags.canvas, layer: flags.layer, levels: flags.levels, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" posterized to ${data.levels} levels`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
