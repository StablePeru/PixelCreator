import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, drawRadialGradient, hexToRGBA, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawRadialGradient extends BaseCommand {
  static override description = 'Draw a radial gradient on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    cx: Flags.integer({ description: 'Center X coordinate', required: true }),
    cy: Flags.integer({ description: 'Center Y coordinate', required: true }),
    radius: Flags.integer({ description: 'Gradient radius', required: true }),
    from: Flags.string({ description: 'Center color as hex', required: true }),
    to: Flags.string({ description: 'Edge color as hex', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawRadialGradient);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const colorStart = hexToRGBA(flags.from);
    const colorEnd = hexToRGBA(flags.to);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawRadialGradient(buffer, flags.cx, flags.cy, flags.radius, colorStart, colorEnd);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:radial-gradient', { canvas: flags.canvas, cx: flags.cx, cy: flags.cy, radius: flags.radius, from: flags.from, to: flags.to }, { cx: flags.cx, cy: flags.cy, radius: flags.radius, from: flags.from, to: flags.to }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Radial gradient at (${r.cx}, ${r.cy}) radius ${r.radius} from ${r.from} to ${r.to}`);
    });
  }
}
