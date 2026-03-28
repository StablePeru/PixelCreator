import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, formatOutput, makeResult, hexToRGBA, generateBrick } from '@pixelcreator/core';

export default class GenerateBrick extends BaseCommand {
  static override description = 'Generate a brick pattern on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    'brick-width': Flags.integer({ description: 'Brick width in pixels', default: 8 }),
    'brick-height': Flags.integer({ description: 'Brick height in pixels', default: 4 }),
    'mortar-size': Flags.integer({ description: 'Mortar line thickness in pixels', default: 1 }),
    'brick-color': Flags.string({ description: 'Brick color (hex)', default: '#cc6633' }),
    'mortar-color': Flags.string({ description: 'Mortar color (hex)', default: '#888888' }),
    offset: Flags.string({ description: 'Row offset ratio (0.0-1.0)', default: '0.5' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateBrick);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const brickColor = hexToRGBA(flags['brick-color']);
    const mortarColor = hexToRGBA(flags['mortar-color']);
    const offset = parseFloat(flags.offset);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    generateBrick(buffer, {
      brickWidth: flags['brick-width'],
      brickHeight: flags['brick-height'],
      mortarSize: flags['mortar-size'],
      brickColor: flags['brick-color'],
      mortarColor: flags['mortar-color'],
      offset,
    });
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      frame: frameId,
      brickWidth: flags['brick-width'],
      brickHeight: flags['brick-height'],
      mortarSize: flags['mortar-size'],
      brickColor: flags['brick-color'],
      mortarColor: flags['mortar-color'],
      offset,
      width: canvas.width,
      height: canvas.height,
    };

    const result = makeResult('generate:brick', {
      canvas: flags.canvas, 'brick-width': flags['brick-width'], 'brick-height': flags['brick-height'],
      'mortar-size': flags['mortar-size'], 'brick-color': flags['brick-color'],
      'mortar-color': flags['mortar-color'], offset, layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated brick pattern on "${r.canvas}" (${r.width}x${r.height})`);
      this.log(`  Brick: ${r.brickWidth}x${r.brickHeight}px, Mortar: ${r.mortarSize}px, Offset: ${r.offset}`);
    });
  }
}
