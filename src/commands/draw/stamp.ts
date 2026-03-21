import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { drawStamp } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawStamp extends BaseCommand {
  static override description = 'Stamp a brush shape onto a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    x: Flags.integer({ description: 'Center X coordinate', required: true }),
    y: Flags.integer({ description: 'Center Y coordinate', required: true }),
    color: Flags.string({ description: 'Stamp color as hex', required: true }),
    size: Flags.integer({ description: 'Stamp diameter/side length', required: true }),
    shape: Flags.string({ description: 'Stamp shape: circle or square', default: 'circle', options: ['circle', 'square'] }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawStamp);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawStamp(buffer, flags.x, flags.y, color, flags.size, flags.shape as 'circle' | 'square');
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:stamp', { canvas: flags.canvas, x: flags.x, y: flags.y, color: flags.color, size: flags.size, shape: flags.shape }, { x: flags.x, y: flags.y, color: flags.color, size: flags.size, shape: flags.shape }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Stamp (${r.shape}, size ${r.size}) at (${r.x}, ${r.y}) with color ${r.color}`);
    });
  }
}
