import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, floodFill, hexToRGBA, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawFill extends BaseCommand {
  static override description = 'Flood fill an area on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    x: Flags.integer({ description: 'Start X coordinate', required: true }),
    y: Flags.integer({ description: 'Start Y coordinate', required: true }),
    color: Flags.string({ description: 'Fill color as hex (e.g. #ff0000)', required: true }),
    tolerance: Flags.integer({ description: 'Color matching tolerance', default: 0 }),
    contiguous: Flags.boolean({ description: 'Only fill contiguous pixels', default: true, allowNo: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawFill);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    floodFill(buffer, flags.x, flags.y, color, flags.tolerance, flags.contiguous);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const mode = flags.contiguous ? 'contiguous' : 'global';
    const result = makeResult('draw:fill', { x: flags.x, y: flags.y, color: flags.color, tolerance: flags.tolerance, contiguous: flags.contiguous, canvas: flags.canvas, layer: layerId, frame: frameId }, { x: flags.x, y: flags.y, color: flags.color, mode }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Flood fill (${r.mode}) from (${r.x}, ${r.y}) with color ${r.color}`);
    });
  }
}
