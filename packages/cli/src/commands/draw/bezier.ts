import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, drawBezierQuadratic, drawBezierCubic, hexToRGBA, parsePoint, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawBezier extends BaseCommand {
  static override description = 'Draw a bezier curve (quadratic if 1 control point, cubic if 2)';

  static override flags = {
    ...BaseCommand.baseFlags,
    start: Flags.string({ description: 'Start point "x,y"', required: true }),
    end: Flags.string({ description: 'End point "x,y"', required: true }),
    cp1: Flags.string({ description: 'First control point "x,y"', required: true }),
    cp2: Flags.string({ description: 'Second control point "x,y" (makes it cubic)' }),
    color: Flags.string({ description: 'Curve color as hex', required: true }),
    thickness: Flags.integer({ description: 'Stroke thickness in pixels', default: 1 }),
    segments: Flags.integer({ description: 'Number of line segments to approximate' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawBezier);
    const projectPath = getProjectPath(flags.project);

    const start = parsePoint(flags.start);
    const end = parsePoint(flags.end);
    const cp1 = parsePoint(flags.cp1);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    const isCubic = flags.cp2 !== undefined;
    if (isCubic) {
      const cp2 = parsePoint(flags.cp2!);
      drawBezierCubic(buffer, start, cp1, cp2, end, color, flags.thickness, flags.segments);
    } else {
      drawBezierQuadratic(buffer, start, cp1, end, color, flags.thickness, flags.segments);
    }

    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const type = isCubic ? 'cubic' : 'quadratic';
    const result = makeResult('draw:bezier', { canvas: flags.canvas, start: flags.start, end: flags.end, cp1: flags.cp1, cp2: flags.cp2, color: flags.color, thickness: flags.thickness }, { type, color: flags.color, thickness: flags.thickness }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Bezier ${r.type} curve drawn with color ${r.color}, thickness ${r.thickness}`);
    });
  }
}
