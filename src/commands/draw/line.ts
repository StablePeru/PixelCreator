import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { drawLine, drawThickLine } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawLine extends BaseCommand {
  static override description = 'Draw a line between two points on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    x1: Flags.integer({ description: 'Start X coordinate', required: true }),
    y1: Flags.integer({ description: 'Start Y coordinate', required: true }),
    x2: Flags.integer({ description: 'End X coordinate', required: true }),
    y2: Flags.integer({ description: 'End Y coordinate', required: true }),
    color: Flags.string({ description: 'Line color as hex (e.g. #ff0000)', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    thickness: Flags.integer({ description: 'Line thickness in pixels', default: 1 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawLine);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    if (flags.thickness > 1) {
      drawThickLine(buffer, flags.x1, flags.y1, flags.x2, flags.y2, color, flags.thickness);
    } else {
      drawLine(buffer, flags.x1, flags.y1, flags.x2, flags.y2, color);
    }
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:line', { x1: flags.x1, y1: flags.y1, x2: flags.x2, y2: flags.y2, color: flags.color, canvas: flags.canvas, layer: layerId, frame: frameId }, { from: { x: flags.x1, y: flags.y1 }, to: { x: flags.x2, y: flags.y2 }, color: flags.color }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Line drawn from (${r.from.x}, ${r.from.y}) to (${r.to.x}, ${r.to.y}) with color ${r.color}`);
    });
  }
}
