import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { drawRect, drawThickRect } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawRect extends BaseCommand {
  static override description = 'Draw a rectangle on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    x: Flags.integer({ description: 'Top-left X coordinate', required: true }),
    y: Flags.integer({ description: 'Top-left Y coordinate', required: true }),
    width: Flags.integer({ char: 'w', description: 'Rectangle width', required: true }),
    height: Flags.integer({ char: 'h', description: 'Rectangle height', required: true }),
    color: Flags.string({ description: 'Rectangle color as hex (e.g. #ff0000)', required: true }),
    fill: Flags.boolean({ description: 'Fill the rectangle', default: false }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    thickness: Flags.integer({ description: 'Outline thickness in pixels', default: 1 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawRect);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    if (!flags.fill && flags.thickness > 1) {
      drawThickRect(buffer, flags.x, flags.y, flags.width, flags.height, color, false, flags.thickness);
    } else {
      drawRect(buffer, flags.x, flags.y, flags.width, flags.height, color, flags.fill);
    }
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const fillLabel = flags.fill ? 'filled' : 'outline';
    const result = makeResult('draw:rect', { x: flags.x, y: flags.y, width: flags.width, height: flags.height, color: flags.color, fill: flags.fill, canvas: flags.canvas, layer: layerId, frame: frameId }, { x: flags.x, y: flags.y, width: flags.width, height: flags.height, color: flags.color, fill: flags.fill }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Rectangle (${fillLabel}) drawn at (${r.x}, ${r.y}) size ${r.width}x${r.height} with color ${r.color}`);
    });
  }
}
