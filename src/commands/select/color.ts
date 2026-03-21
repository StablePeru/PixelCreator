import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, readSelection, writeSelection } from '../../io/project-io.js';
import { createColorSelection, mergeSelections, getSelectionPixelCount } from '../../core/selection-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectColor extends BaseCommand {
  static override description = 'Select pixels by color match (magic wand)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    x: Flags.integer({ description: 'Start X coordinate (for contiguous mode)' }),
    y: Flags.integer({ description: 'Start Y coordinate (for contiguous mode)' }),
    color: Flags.string({ description: 'Target color hex (if omitted, samples from x,y)' }),
    tolerance: Flags.integer({ description: 'Color matching tolerance', default: 0 }),
    contiguous: Flags.boolean({ description: 'Only select contiguous pixels', default: true, allowNo: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    add: Flags.boolean({ description: 'Add to existing selection instead of replacing', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectColor);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    let targetColor;
    if (flags.color) {
      targetColor = hexToRGBA(flags.color);
    } else if (flags.x !== undefined && flags.y !== undefined) {
      targetColor = buffer.getPixel(flags.x, flags.y);
    } else {
      throw new Error('Must provide --color or --x/--y to sample from');
    }

    let mask = createColorSelection(
      buffer,
      targetColor,
      flags.tolerance,
      flags.contiguous,
      flags.x,
      flags.y,
    );

    if (flags.add) {
      const existing = readSelection(projectPath, flags.canvas);
      if (existing) {
        mask = mergeSelections(existing, mask);
      }
    }

    writeSelection(projectPath, flags.canvas, mask);

    const count = getSelectionPixelCount(mask);
    const result = makeResult('select:color', { canvas: flags.canvas, color: flags.color, tolerance: flags.tolerance, contiguous: flags.contiguous }, { pixelCount: count, tolerance: flags.tolerance, contiguous: flags.contiguous }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Selected ${r.pixelCount} pixels by color (tolerance: ${r.tolerance}, ${r.contiguous ? 'contiguous' : 'global'})`);
    });
  }
}
