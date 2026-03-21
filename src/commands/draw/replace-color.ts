import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { replaceColor } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawReplaceColor extends BaseCommand {
  static override description = 'Replace one color with another across a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    from: Flags.string({ description: 'Source color as hex (e.g. #ff0000)', required: true }),
    to: Flags.string({ description: 'Target color as hex (e.g. #00ff00)', required: true }),
    tolerance: Flags.integer({ description: 'Color matching tolerance', default: 0 }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawReplaceColor);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const fromColor = hexToRGBA(flags.from);
    const toColor = hexToRGBA(flags.to);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    const count = replaceColor(buffer, fromColor, toColor, flags.tolerance);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:replace-color', { from: flags.from, to: flags.to, tolerance: flags.tolerance, canvas: flags.canvas, layer: layerId, frame: frameId }, { from: flags.from, to: flags.to, pixelsReplaced: count }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Replaced ${r.pixelsReplaced} pixel(s) from ${r.from} to ${r.to}`);
    });
  }
}
