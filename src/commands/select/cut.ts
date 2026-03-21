import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, readSelection, writeClipboard } from '../../io/project-io.js';
import { extractSelection, clearSelection, getSelectionBounds } from '../../core/selection-engine.js';
import type { ClipboardData } from '../../types/selection.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectCut extends BaseCommand {
  static override description = 'Cut selected pixels to clipboard (removes from layer)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectCut);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const mask = readSelection(projectPath, flags.canvas);
    if (!mask) throw new Error(`No active selection on canvas ${flags.canvas}`);

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    const extracted = extractSelection(buffer, mask);
    const bounds = getSelectionBounds(mask);

    const clipData: ClipboardData = {
      width: buffer.width,
      height: buffer.height,
      source: flags.canvas,
      offsetX: bounds ? bounds.x : 0,
      offsetY: bounds ? bounds.y : 0,
      created: new Date().toISOString(),
    };

    writeClipboard(projectPath, clipData, extracted);
    clearSelection(buffer, mask);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('select:cut', { canvas: flags.canvas, layer: layerId, frame: frameId }, { bounds, source: flags.canvas }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.bounds) {
        console.log(`Cut selection (${r.bounds.x}, ${r.bounds.y}) ${r.bounds.width}x${r.bounds.height} from ${r.source}`);
      } else {
        console.log(`Cut selection from ${r.source}`);
      }
    });
  }
}
