import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { drawCircle } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawCircle extends BaseCommand {
  static override description = 'Draw a circle on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    cx: Flags.integer({ description: 'Center X coordinate', required: true }),
    cy: Flags.integer({ description: 'Center Y coordinate', required: true }),
    radius: Flags.integer({ char: 'r', description: 'Circle radius', required: true }),
    color: Flags.string({ description: 'Circle color as hex (e.g. #ff0000)', required: true }),
    fill: Flags.boolean({ description: 'Fill the circle', default: false }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawCircle);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawCircle(buffer, flags.cx, flags.cy, flags.radius, color, flags.fill);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const fillLabel = flags.fill ? 'filled' : 'outline';
    const result = makeResult('draw:circle', { cx: flags.cx, cy: flags.cy, radius: flags.radius, color: flags.color, fill: flags.fill, canvas: flags.canvas, layer: layerId, frame: frameId }, { cx: flags.cx, cy: flags.cy, radius: flags.radius, color: flags.color, fill: flags.fill }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Circle (${fillLabel}) drawn at (${r.cx}, ${r.cy}) radius ${r.radius} with color ${r.color}`);
    });
  }
}
