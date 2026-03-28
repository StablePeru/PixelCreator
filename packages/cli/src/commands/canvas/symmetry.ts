import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';
import type { SymmetryMode } from '@pixelcreator/core';

export default class CanvasSymmetry extends BaseCommand {
  static override description = 'Get or set symmetry configuration for a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    mode: Flags.string({ description: 'Symmetry mode', options: ['none', 'horizontal', 'vertical', 'both', 'radial'] }),
    'axis-x': Flags.integer({ description: 'Vertical axis X position' }),
    'axis-y': Flags.integer({ description: 'Horizontal axis Y position' }),
    'radial-segments': Flags.integer({ description: 'Radial segments (4, 6, 8, 12)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasSymmetry);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.mode) {
      canvas.symmetry = {
        mode: flags.mode as SymmetryMode,
        axisX: flags['axis-x'] ?? Math.floor(canvas.width / 2),
        axisY: flags['axis-y'] ?? Math.floor(canvas.height / 2),
        radialSegments: flags['radial-segments'] ?? 4,
        radialCenterX: Math.floor(canvas.width / 2),
        radialCenterY: Math.floor(canvas.height / 2),
      };
      writeCanvasJSON(projectPath, flags.canvas, canvas);
    }

    const sym = canvas.symmetry ?? { mode: 'none' as SymmetryMode };

    const result = makeResult('canvas:symmetry', { canvas: flags.canvas, mode: flags.mode }, { canvas: flags.canvas, symmetry: sym }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.symmetry.mode === 'none') {
        this.log(`Canvas "${r.canvas}": symmetry disabled`);
      } else {
        this.log(`Canvas "${r.canvas}": ${r.symmetry.mode} symmetry`);
        if (r.symmetry.axisX !== undefined) this.log(`  Axis X: ${r.symmetry.axisX}`);
        if (r.symmetry.axisY !== undefined) this.log(`  Axis Y: ${r.symmetry.axisY}`);
        if (r.symmetry.mode === 'radial') this.log(`  Segments: ${r.symmetry.radialSegments}`);
      }
    });
  }
}
