import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { generateOutline } from '../../core/drawing-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawOutline extends BaseCommand {
  static override description = 'Generate outline around non-transparent content';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    color: Flags.string({ description: 'Outline color as hex', default: '#000000' }),
    thickness: Flags.integer({ description: 'Outline thickness in pixels', default: 1 }),
    corners: Flags.boolean({ description: 'Include diagonal neighbors', default: true, allowNo: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawOutline);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const color = hexToRGBA(flags.color);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    const outlineBuffer = generateOutline(buffer, color, flags.thickness, flags.corners);

    // Composite outline onto the original buffer
    let outlinePixels = 0;
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const px = outlineBuffer.getPixel(x, y);
        if (px.a !== 0) {
          buffer.setPixel(x, y, px);
          outlinePixels++;
        }
      }
    }

    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      color: flags.color,
      thickness: flags.thickness,
      outlinePixels,
    };

    const result = makeResult('draw:outline', {
      canvas: flags.canvas, color: flags.color, thickness: flags.thickness,
      corners: flags.corners, layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Outline generated with color ${r.color}, thickness ${r.thickness}`);
      this.log(`  Outline pixels: ${r.outlinePixels}`);
    });
  }
}
