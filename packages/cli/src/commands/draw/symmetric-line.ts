import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame,
  hexToRGBA, drawSymmetricLine, formatOutput, makeResult,
} from '@pixelcreator/core';
import type { SymmetryMode } from '@pixelcreator/core';

export default class DrawSymmetricLine extends BaseCommand {
  static override description = 'Draw a line with symmetry reflection';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    x1: Flags.integer({ description: 'Start X coordinate', required: true }),
    y1: Flags.integer({ description: 'Start Y coordinate', required: true }),
    x2: Flags.integer({ description: 'End X coordinate', required: true }),
    y2: Flags.integer({ description: 'End Y coordinate', required: true }),
    color: Flags.string({ description: 'Line color as hex', required: true }),
    symmetry: Flags.string({ description: 'Symmetry mode', options: ['horizontal', 'vertical', 'both', 'radial'], required: true }),
    'axis-x': Flags.integer({ description: 'Vertical axis X position' }),
    'axis-y': Flags.integer({ description: 'Horizontal axis Y position' }),
    'radial-segments': Flags.integer({ description: 'Radial segments', default: 4 }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawSymmetricLine);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawSymmetricLine(buffer, flags.x1, flags.y1, flags.x2, flags.y2, color, {
      mode: flags.symmetry as SymmetryMode,
      axisX: flags['axis-x'],
      axisY: flags['axis-y'],
      radialSegments: flags['radial-segments'],
    }, canvas.width, canvas.height);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:symmetric-line', { x1: flags.x1, y1: flags.y1, x2: flags.x2, y2: flags.y2, color: flags.color, symmetry: flags.symmetry, canvas: flags.canvas }, { from: { x: flags.x1, y: flags.y1 }, to: { x: flags.x2, y: flags.y2 }, color: flags.color, symmetry: flags.symmetry }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Symmetric line from (${r.from.x}, ${r.from.y}) to (${r.to.x}, ${r.to.y}) with ${r.symmetry} symmetry`);
    });
  }
}
