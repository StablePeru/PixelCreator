import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, formatOutput, makeResult, hexToRGBA, generateCheckerboard } from '@pixelcreator/core';

export default class GenerateCheckerboard extends BaseCommand {
  static override description = 'Generate a checkerboard pattern on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    'cell-size': Flags.integer({ description: 'Size of each checker cell in pixels', default: 4 }),
    color1: Flags.string({ description: 'First checker color (hex)', default: '#ffffff' }),
    color2: Flags.string({ description: 'Second checker color (hex)', default: '#000000' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateCheckerboard);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    hexToRGBA(flags.color1);
    hexToRGBA(flags.color2);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    generateCheckerboard(buffer, { cellSize: flags['cell-size'], color1: flags.color1, color2: flags.color2 });
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      frame: frameId,
      cellSize: flags['cell-size'],
      color1: flags.color1,
      color2: flags.color2,
      width: canvas.width,
      height: canvas.height,
    };

    const result = makeResult('generate:checkerboard', {
      canvas: flags.canvas, 'cell-size': flags['cell-size'],
      color1: flags.color1, color2: flags.color2,
      layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated checkerboard on "${r.canvas}" (${r.width}x${r.height})`);
      this.log(`  Cell size: ${r.cellSize}px, Colors: ${r.color1} / ${r.color2}`);
    });
  }
}
