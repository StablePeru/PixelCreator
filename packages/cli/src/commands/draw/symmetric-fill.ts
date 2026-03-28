import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame,
  hexToRGBA, floodFill, computeSymmetryPoints, formatOutput, makeResult,
} from '@pixelcreator/core';
import type { SymmetryMode } from '@pixelcreator/core';

export default class DrawSymmetricFill extends BaseCommand {
  static override description = 'Flood fill with symmetry reflection';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    x: Flags.integer({ description: 'Start X coordinate', required: true }),
    y: Flags.integer({ description: 'Start Y coordinate', required: true }),
    color: Flags.string({ description: 'Fill color as hex', required: true }),
    symmetry: Flags.string({ description: 'Symmetry mode', options: ['horizontal', 'vertical', 'both', 'radial'], required: true }),
    'axis-x': Flags.integer({ description: 'Vertical axis X position' }),
    'axis-y': Flags.integer({ description: 'Horizontal axis Y position' }),
    'radial-segments': Flags.integer({ description: 'Radial segments', default: 4 }),
    tolerance: Flags.integer({ description: 'Color matching tolerance', default: 0 }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawSymmetricFill);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    const symmetryPoints = computeSymmetryPoints(flags.x, flags.y, {
      mode: flags.symmetry as SymmetryMode,
      axisX: flags['axis-x'],
      axisY: flags['axis-y'],
      radialSegments: flags['radial-segments'],
    }, canvas.width, canvas.height);

    for (const pt of symmetryPoints) {
      floodFill(buffer, pt.x, pt.y, color, flags.tolerance);
    }

    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:symmetric-fill', { x: flags.x, y: flags.y, color: flags.color, symmetry: flags.symmetry, canvas: flags.canvas }, { x: flags.x, y: flags.y, color: flags.color, symmetry: flags.symmetry, fillPoints: symmetryPoints.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Symmetric fill at (${r.x}, ${r.y}) with ${r.symmetry} symmetry (${r.fillPoints} fill points)`);
    });
  }
}
