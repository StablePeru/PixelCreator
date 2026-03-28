import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame,
  hexToRGBA, drawSymmetricPixel, formatOutput, makeResult,
} from '@pixelcreator/core';
import type { SymmetryMode } from '@pixelcreator/core';

export default class DrawSymmetricPixel extends BaseCommand {
  static override description = 'Draw a pixel with symmetry reflection';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    x: Flags.integer({ description: 'X coordinate', required: true }),
    y: Flags.integer({ description: 'Y coordinate', required: true }),
    color: Flags.string({ description: 'Pixel color as hex', required: true }),
    symmetry: Flags.string({ description: 'Symmetry mode', options: ['horizontal', 'vertical', 'both', 'radial'], required: true }),
    'axis-x': Flags.integer({ description: 'Vertical axis X position (defaults to canvas center)' }),
    'axis-y': Flags.integer({ description: 'Horizontal axis Y position (defaults to canvas center)' }),
    'radial-segments': Flags.integer({ description: 'Radial segments (4, 6, 8, 12)', default: 4 }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawSymmetricPixel);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawSymmetricPixel(buffer, flags.x, flags.y, color, {
      mode: flags.symmetry as SymmetryMode,
      axisX: flags['axis-x'],
      axisY: flags['axis-y'],
      radialSegments: flags['radial-segments'],
    }, canvas.width, canvas.height);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:symmetric-pixel', { x: flags.x, y: flags.y, color: flags.color, symmetry: flags.symmetry, canvas: flags.canvas }, { x: flags.x, y: flags.y, color: flags.color, symmetry: flags.symmetry }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Symmetric pixel at (${r.x}, ${r.y}) with ${r.symmetry} symmetry, color ${r.color}`);
    });
  }
}
