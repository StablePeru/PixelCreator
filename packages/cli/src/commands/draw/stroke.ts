import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readProjectJSON, readCanvasJSON, readLayerFrame, writeLayerFrame,
  hexToRGBA, createDefaultPresets, applySymmetricStroke, formatOutput, makeResult,
} from '@pixelcreator/core';
import { parsePoints } from '@pixelcreator/core';
import type { SymmetryConfig, SymmetryMode } from '@pixelcreator/core';

export default class DrawStroke extends BaseCommand {
  static override description = 'Draw a brush stroke along a series of points';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    points: Flags.string({ description: 'Points as "x1,y1 x2,y2 ..."', required: true }),
    color: Flags.string({ description: 'Stroke color as hex', required: true }),
    brush: Flags.string({ description: 'Brush preset ID (default: brush-001)', default: 'brush-001' }),
    symmetry: Flags.string({ description: 'Symmetry mode', options: ['none', 'horizontal', 'vertical', 'both', 'radial'], default: 'none' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawStroke);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const project = readProjectJSON(projectPath);
    const defaults = createDefaultPresets();
    const custom = project.settings?.brushPresets ?? [];
    const preset = [...defaults, ...custom].find(p => p.id === flags.brush);
    if (!preset) throw new Error(`Brush preset not found: ${flags.brush}`);

    const color = hexToRGBA(flags.color);
    const pts = parsePoints(flags.points);
    const symmetry: SymmetryConfig = canvas.symmetry && flags.symmetry === 'none'
      ? canvas.symmetry
      : { mode: flags.symmetry as SymmetryMode };

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    applySymmetricStroke(buffer, pts, color, preset, symmetry);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:stroke', { canvas: flags.canvas, brush: flags.brush, color: flags.color, symmetry: symmetry.mode, pointCount: pts.length }, { brush: preset.name, pointCount: pts.length, symmetry: symmetry.mode }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Stroke drawn with brush "${r.brush}" (${r.pointCount} points, symmetry: ${r.symmetry})`);
    });
  }
}
