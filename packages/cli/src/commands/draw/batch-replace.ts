import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, replaceColor, hexToRGBA, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawBatchReplace extends BaseCommand {
  static override description = 'Find and replace a color across all layers and frames of a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    from: Flags.string({ description: 'Color to find (hex)', required: true }),
    to: Flags.string({ description: 'Replacement color (hex)', required: true }),
    tolerance: Flags.integer({ description: 'Color matching tolerance', default: 0 }),
    'all-frames': Flags.boolean({ description: 'Apply to all frames', default: true, allowNo: true }),
    'all-layers': Flags.boolean({ description: 'Apply to all layers', default: true, allowNo: true }),
    layer: Flags.string({ char: 'l', description: 'Single layer ID (when not --all-layers)' }),
    frame: Flags.string({ char: 'f', description: 'Single frame ID (when not --all-frames)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawBatchReplace);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const fromColor = hexToRGBA(flags.from);
    const toColor = hexToRGBA(flags.to);

    const layers = flags['all-layers']
      ? canvas.layers.filter((l) => !l.isGroup)
      : [canvas.layers.find((l) => l.id === (flags.layer || canvas.layers[0]?.id))!];

    const frames = flags['all-frames']
      ? canvas.frames
      : [canvas.frames.find((f) => f.id === (flags.frame || canvas.frames[0]?.id))!];

    let totalReplaced = 0;
    let buffersProcessed = 0;

    for (const layer of layers) {
      if (!layer) continue;
      for (const frame of frames) {
        if (!frame) continue;
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const count = replaceColor(buffer, fromColor, toColor, flags.tolerance);
        if (count > 0) {
          writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, buffer);
          totalReplaced += count;
        }
        buffersProcessed++;
      }
    }

    const result = makeResult('draw:batch-replace', { canvas: flags.canvas, from: flags.from, to: flags.to, tolerance: flags.tolerance }, { from: flags.from, to: flags.to, totalReplaced, buffersProcessed }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Replaced ${r.totalReplaced} pixels (${r.from} → ${r.to}) across ${r.buffersProcessed} buffers`);
    });
  }
}
