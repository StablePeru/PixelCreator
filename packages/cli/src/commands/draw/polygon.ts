import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, drawPolygon, hexToRGBA, parsePoints, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawPolygon extends BaseCommand {
  static override description = 'Draw a closed polygon on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    points: Flags.string({ description: 'Space-separated x,y pairs (min 3): "0,0 10,0 10,10"', required: true }),
    color: Flags.string({ description: 'Polygon color as hex', required: true }),
    fill: Flags.boolean({ description: 'Fill the polygon', default: false }),
    thickness: Flags.integer({ description: 'Outline thickness in pixels', default: 1 }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawPolygon);
    const projectPath = getProjectPath(flags.project);

    const pts = parsePoints(flags.points);
    if (pts.length < 3) throw new Error('Polygon requires at least 3 points');

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawPolygon(buffer, pts, color, flags.fill, flags.thickness);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const fillLabel = flags.fill ? 'filled' : 'outline';
    const result = makeResult('draw:polygon', { canvas: flags.canvas, points: flags.points, color: flags.color, fill: flags.fill, thickness: flags.thickness }, { pointCount: pts.length, fill: flags.fill, thickness: flags.thickness, color: flags.color }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Polygon (${fillLabel}, ${r.pointCount} points) drawn with color ${r.color}`);
    });
  }
}
