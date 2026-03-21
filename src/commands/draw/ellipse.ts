import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { drawEllipse } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawEllipse extends BaseCommand {
  static override description = 'Draw an ellipse on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    cx: Flags.integer({ description: 'Center X coordinate', required: true }),
    cy: Flags.integer({ description: 'Center Y coordinate', required: true }),
    rx: Flags.integer({ description: 'Horizontal radius', required: true }),
    ry: Flags.integer({ description: 'Vertical radius', required: true }),
    color: Flags.string({ description: 'Ellipse color as hex (e.g. #ff0000)', required: true }),
    fill: Flags.boolean({ description: 'Fill the ellipse', default: false }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    thickness: Flags.integer({ description: 'Outline thickness in pixels', default: 1 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawEllipse);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawEllipse(buffer, flags.cx, flags.cy, flags.rx, flags.ry, color, flags.fill, flags.thickness);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const fillLabel = flags.fill ? 'filled' : 'outline';
    const result = makeResult('draw:ellipse', { cx: flags.cx, cy: flags.cy, rx: flags.rx, ry: flags.ry, color: flags.color, fill: flags.fill, canvas: flags.canvas, layer: layerId, frame: frameId }, { cx: flags.cx, cy: flags.cy, rx: flags.rx, ry: flags.ry, color: flags.color, fill: flags.fill }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Ellipse (${fillLabel}) drawn at (${r.cx}, ${r.cy}) radii ${r.rx}x${r.ry} with color ${r.color}`);
    });
  }
}
