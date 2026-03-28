import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, formatOutput, makeResult, hexToRGBA, generateGridDots } from '@pixelcreator/core';

export default class GenerateGridDots extends BaseCommand {
  static override description = 'Generate a grid of dots on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    'spacing-x': Flags.integer({ description: 'Horizontal spacing between dots', default: 4 }),
    'spacing-y': Flags.integer({ description: 'Vertical spacing between dots', default: 4 }),
    'dot-size': Flags.integer({ description: 'Dot size in pixels', default: 1 }),
    color: Flags.string({ description: 'Dot color (hex)', default: '#ffffff' }),
    background: Flags.string({ description: 'Background color (hex, optional)' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateGridDots);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    hexToRGBA(flags.color);
    if (flags.background) hexToRGBA(flags.background);
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    generateGridDots(buffer, {
      spacingX: flags['spacing-x'],
      spacingY: flags['spacing-y'],
      dotSize: flags['dot-size'],
      color: flags.color,
      background: flags.background,
    });
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      frame: frameId,
      spacingX: flags['spacing-x'],
      spacingY: flags['spacing-y'],
      dotSize: flags['dot-size'],
      color: flags.color,
      background: flags.background ?? null,
      width: canvas.width,
      height: canvas.height,
    };

    const result = makeResult('generate:grid-dots', {
      canvas: flags.canvas, 'spacing-x': flags['spacing-x'], 'spacing-y': flags['spacing-y'],
      'dot-size': flags['dot-size'], color: flags.color, background: flags.background,
      layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated grid dots on "${r.canvas}" (${r.width}x${r.height})`);
      this.log(`  Spacing: ${r.spacingX}x${r.spacingY}, Dot size: ${r.dotSize}px, Color: ${r.color}`);
    });
  }
}
