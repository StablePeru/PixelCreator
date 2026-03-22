import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, drawPixel, hexToRGBA, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawPixel extends BaseCommand {
  static override description = 'Draw a single pixel on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    x: Flags.integer({ description: 'X coordinate', required: true }),
    y: Flags.integer({ description: 'Y coordinate', required: true }),
    color: Flags.string({ description: 'Pixel color as hex (e.g. #ff0000)', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawPixel);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawPixel(buffer, flags.x, flags.y, color);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:pixel', { x: flags.x, y: flags.y, color: flags.color, canvas: flags.canvas, layer: layerId, frame: frameId }, { x: flags.x, y: flags.y, color: flags.color }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Pixel set at (${r.x}, ${r.y}) with color ${r.color}`);
    });
  }
}
