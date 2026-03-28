import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';

export default class EffectOutline extends BaseCommand {
  static description = 'Add an outline effect to a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    color: Flags.string({ description: 'Outline color as hex (e.g. #000000)', default: '#000000' }),
    thickness: Flags.integer({ description: 'Outline thickness in pixels', default: 1 }),
    position: Flags.string({ description: 'Outline position', default: 'outside', options: ['outside', 'inside', 'center'] }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectOutline);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effectId = generateSequentialId('effect', layer.effects.length + 1);
    const effect = {
      id: effectId,
      type: 'outline' as const,
      enabled: true,
      params: {
        color: flags.color,
        thickness: flags.thickness,
        position: flags.position as 'outside' | 'inside' | 'center',
      },
    };

    layer.effects.push(effect);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId, canvas: flags.canvas, layer: flags.layer, params: effect.params };
    const cmdResult = makeResult('effect:outline', { canvas: flags.canvas, layer: flags.layer }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Outline "${data.effectId}" added to layer "${data.layer}" — color ${data.params.color}, thickness ${data.params.thickness}px, position ${data.params.position}`);
    });
  }
}
