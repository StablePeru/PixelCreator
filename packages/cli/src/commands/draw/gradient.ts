import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, drawGradient, hexToRGBA, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawGradient extends BaseCommand {
  static override description = 'Draw a linear gradient on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    x1: Flags.integer({ description: 'Gradient start X', required: true }),
    y1: Flags.integer({ description: 'Gradient start Y', required: true }),
    x2: Flags.integer({ description: 'Gradient end X', required: true }),
    y2: Flags.integer({ description: 'Gradient end Y', required: true }),
    from: Flags.string({ description: 'Start color as hex', required: true }),
    to: Flags.string({ description: 'End color as hex', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawGradient);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const colorStart = hexToRGBA(flags.from);
    const colorEnd = hexToRGBA(flags.to);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawGradient(buffer, flags.x1, flags.y1, flags.x2, flags.y2, colorStart, colorEnd);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      from: flags.from,
      to: flags.to,
      direction: { x1: flags.x1, y1: flags.y1, x2: flags.x2, y2: flags.y2 },
    };

    const result = makeResult('draw:gradient', {
      canvas: flags.canvas, x1: flags.x1, y1: flags.y1, x2: flags.x2, y2: flags.y2,
      from: flags.from, to: flags.to, layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Gradient drawn from ${r.from} to ${r.to}`);
      this.log(`  Direction: (${r.direction.x1},${r.direction.y1}) -> (${r.direction.x2},${r.direction.y2})`);
    });
  }
}
