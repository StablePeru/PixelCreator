import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class FrameClone extends BaseCommand {
  static override description = 'Clone pixel data from one frame to another within the same canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    source: Flags.string({
      char: 's',
      description: 'Source frame ID (e.g. frame-001)',
      required: true,
    }),
    target: Flags.string({
      char: 't',
      description: 'Target frame ID to overwrite (e.g. frame-003)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameClone);

    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const format = this.getOutputFormat(flags);

    if (flags.source === flags.target) {
      this.error('Source and target frame must be different.');
    }

    const sourceFrame = canvas.frames.find((f) => f.id === flags.source);
    if (!sourceFrame) {
      this.error(`Source frame "${flags.source}" not found in canvas "${flags.canvas}".`);
    }

    const targetFrame = canvas.frames.find((f) => f.id === flags.target);
    if (!targetFrame) {
      this.error(`Target frame "${flags.target}" not found in canvas "${flags.canvas}".`);
    }

    let layersCopied = 0;
    for (const layer of canvas.layers) {
      const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, sourceFrame.id);
      writeLayerFrame(projectPath, flags.canvas, layer.id, targetFrame.id, buffer);
      layersCopied++;
    }

    const resultData = {
      canvas: flags.canvas,
      source: flags.source,
      target: flags.target,
      layersCopied,
    };

    const cmdResult = makeResult(
      'frame:clone',
      { canvas: flags.canvas, source: flags.source, target: flags.target },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(
        `Cloned frame "${data.source}" → "${data.target}" in "${data.canvas}" (${data.layersCopied} layers)`,
      );
    });
  }
}
