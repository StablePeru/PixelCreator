import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, readSelection, deleteSelection } from '../../io/project-io.js';
import { moveSelection, getSelectionPixelCount } from '../../core/selection-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectMove extends BaseCommand {
  static override description = 'Move selected pixels by an offset';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dx: Flags.integer({ description: 'Horizontal offset (positive = right)', required: true }),
    dy: Flags.integer({ description: 'Vertical offset (positive = down)', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectMove);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const mask = readSelection(projectPath, flags.canvas);
    if (!mask) throw new Error(`No active selection on canvas ${flags.canvas}`);

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    const pixelCount = getSelectionPixelCount(mask);
    const moved = moveSelection(buffer, mask, flags.dx, flags.dy);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, moved);
    deleteSelection(projectPath, flags.canvas);

    const result = makeResult('select:move', { canvas: flags.canvas, dx: flags.dx, dy: flags.dy, layer: layerId, frame: frameId }, { dx: flags.dx, dy: flags.dy, pixelCount }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Moved ${r.pixelCount} pixels by (${r.dx}, ${r.dy})`);
    });
  }
}
