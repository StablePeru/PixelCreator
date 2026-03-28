import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, formatOutput, makeResult, hexToRGBA, generateStripes } from '@pixelcreator/core';

export default class GenerateStripes extends BaseCommand {
  static override description = 'Generate a stripe pattern on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    direction: Flags.string({
      description: 'Stripe direction',
      options: ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up'],
      default: 'horizontal',
    }),
    widths: Flags.string({ description: 'Comma-separated stripe widths in pixels', default: '2,2' }),
    colors: Flags.string({ description: 'Comma-separated hex colors for stripes', default: '#ffffff,#000000' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateStripes);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const widths = flags.widths.split(',').map((w) => parseInt(w.trim(), 10));
    const colors = flags.colors.split(',').map((c) => hexToRGBA(c.trim()));
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    generateStripes(buffer, {
      direction: flags.direction as 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up',
      widths,
      colors: flags.colors.split(',').map((c: string) => c.trim()),
    });
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      frame: frameId,
      direction: flags.direction,
      widths,
      colorCount: colors.length,
      width: canvas.width,
      height: canvas.height,
    };

    const result = makeResult('generate:stripes', {
      canvas: flags.canvas, direction: flags.direction,
      widths: flags.widths, colors: flags.colors,
      layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated ${r.direction} stripes on "${r.canvas}" (${r.width}x${r.height})`);
      this.log(`  Widths: [${r.widths.join(', ')}], Colors: ${r.colorCount}`);
    });
  }
}
