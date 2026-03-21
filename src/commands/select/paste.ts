import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, readClipboard } from '../../io/project-io.js';
import { pasteBuffer } from '../../core/selection-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectPaste extends BaseCommand {
  static override description = 'Paste clipboard contents onto a canvas layer';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    x: Flags.integer({ description: 'Paste offset X (default: 0)' }),
    y: Flags.integer({ description: 'Paste offset Y (default: 0)' }),
    'in-place': Flags.boolean({ description: 'Paste at original source coordinates', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectPaste);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const clipboard = readClipboard(projectPath);
    if (!clipboard) throw new Error('Clipboard is empty');

    let offsetX: number;
    let offsetY: number;

    if (flags['in-place']) {
      offsetX = 0;
      offsetY = 0;
    } else if (flags.x !== undefined || flags.y !== undefined) {
      offsetX = flags.x ?? 0;
      offsetY = flags.y ?? 0;
    } else {
      offsetX = 0;
      offsetY = 0;
    }

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    pasteBuffer(buffer, clipboard.buffer, offsetX, offsetY);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('select:paste', { canvas: flags.canvas, layer: layerId, frame: frameId, x: offsetX, y: offsetY }, { offsetX, offsetY, source: clipboard.data.source, width: clipboard.data.width, height: clipboard.data.height }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Pasted from ${r.source} at (${r.offsetX}, ${r.offsetY})`);
    });
  }
}
