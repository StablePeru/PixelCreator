import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, PixelBuffer, savePNG, drawLine, formatOutput, makeResult } from '@pixelcreator/core';


export default class CanvasSymmetryGuide extends BaseCommand {
  static override description = 'Generate a PNG with symmetry axis guide lines overlaid';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Output PNG file path', required: true }),
    color: Flags.string({ description: 'Guide line color as hex', default: '#ff00ff80' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasSymmetryGuide);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const sym = canvas.symmetry;
    if (!sym || sym.mode === 'none') {
      throw new Error('Canvas has no symmetry configured. Use `canvas:symmetry --mode <mode>` first.');
    }

    const { hexToRGBA } = await import('@pixelcreator/core');
    const guideColor = hexToRGBA(flags.color);
    const buffer = new PixelBuffer(canvas.width, canvas.height);

    const axisX = sym.axisX ?? Math.floor(canvas.width / 2);
    const axisY = sym.axisY ?? Math.floor(canvas.height / 2);

    if (sym.mode === 'horizontal' || sym.mode === 'both') {
      drawLine(buffer, axisX, 0, axisX, canvas.height - 1, guideColor);
    }

    if (sym.mode === 'vertical' || sym.mode === 'both') {
      drawLine(buffer, 0, axisY, canvas.width - 1, axisY, guideColor);
    }

    if (sym.mode === 'radial') {
      const cx = sym.radialCenterX ?? Math.floor(canvas.width / 2);
      const cy = sym.radialCenterY ?? Math.floor(canvas.height / 2);
      const segments = sym.radialSegments ?? 4;
      const maxR = Math.max(canvas.width, canvas.height);

      for (let i = 0; i < segments; i++) {
        const theta = (2 * Math.PI * i) / segments;
        const ex = Math.round(cx + maxR * Math.cos(theta));
        const ey = Math.round(cy + maxR * Math.sin(theta));
        drawLine(buffer, cx, cy, ex, ey, guideColor);
      }
    }

    savePNG(buffer, flags.dest);

    const result = makeResult('canvas:symmetry-guide', { canvas: flags.canvas, dest: flags.dest }, { canvas: flags.canvas, mode: sym.mode, dest: flags.dest }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Symmetry guide (${r.mode}) exported to ${r.dest}`);
    });
  }
}
