import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, renderToTerminal, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class ViewPreview extends BaseCommand {
  static description = 'Preview a canvas frame in the terminal';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Frame ID to preview (default: first frame)',
    }),
    grid: Flags.boolean({
      description: 'Show pixel grid (not yet implemented in terminal renderer)',
      default: false,
    }),
    truecolor: Flags.boolean({
      description: 'Use 24-bit truecolor output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ViewPreview);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const frameId = flags.frame ?? canvas.frames[0]?.id;
    if (!frameId) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const frameExists = canvas.frames.some((f) => f.id === frameId);
    if (!frameExists) {
      this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
    }

    const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
      info: layerInfo,
      buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
    }));

    const buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    const rendered = renderToTerminal(buffer, { truecolor: flags.truecolor });
    const renderedLines = rendered.split('\n').length;

    const resultData = {
      canvas: flags.canvas,
      frame: frameId,
      width: canvas.width,
      height: canvas.height,
      renderedLines,
    };

    const cmdResult = makeResult(
      'view:preview',
      { canvas: flags.canvas, frame: flags.frame, grid: flags.grid, truecolor: flags.truecolor },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, () => {
      console.log(rendered);
    });
  }
}
