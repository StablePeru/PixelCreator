import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { drawPolyline } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { parsePoints } from '../../utils/point-parser.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawPolyline extends BaseCommand {
  static override description = 'Draw an open polyline on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    points: Flags.string({ description: 'Space-separated x,y pairs (min 2): "0,0 10,0 10,10"', required: true }),
    color: Flags.string({ description: 'Line color as hex', required: true }),
    thickness: Flags.integer({ description: 'Line thickness in pixels', default: 1 }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawPolyline);
    const projectPath = getProjectPath(flags.project);

    const pts = parsePoints(flags.points);
    if (pts.length < 2) throw new Error('Polyline requires at least 2 points');

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawPolyline(buffer, pts, color, flags.thickness);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:polyline', { canvas: flags.canvas, points: flags.points, color: flags.color, thickness: flags.thickness }, { pointCount: pts.length, thickness: flags.thickness, color: flags.color }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Polyline (${r.pointCount} points, thickness ${r.thickness}) drawn with color ${r.color}`);
    });
  }
}
