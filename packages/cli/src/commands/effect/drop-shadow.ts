import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';

export default class EffectDropShadow extends BaseCommand {
  static description = 'Add a drop shadow effect to a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    'offset-x': Flags.integer({ description: 'Shadow X offset in pixels', default: 2 }),
    'offset-y': Flags.integer({ description: 'Shadow Y offset in pixels', default: 2 }),
    color: Flags.string({ description: 'Shadow color as hex (e.g. #000000)', default: '#000000' }),
    blur: Flags.integer({ description: 'Shadow blur radius', default: 0 }),
    opacity: Flags.integer({ description: 'Shadow opacity (0-255)', default: 128 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectDropShadow);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effectId = generateSequentialId('effect', layer.effects.length + 1);
    const effect = {
      id: effectId,
      type: 'drop-shadow' as const,
      enabled: true,
      params: {
        offsetX: flags['offset-x'],
        offsetY: flags['offset-y'],
        color: flags.color,
        blur: flags.blur,
        opacity: flags.opacity,
      },
    };

    layer.effects.push(effect);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId, canvas: flags.canvas, layer: flags.layer, params: effect.params };
    const cmdResult = makeResult('effect:drop-shadow', { canvas: flags.canvas, layer: flags.layer }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Drop shadow "${data.effectId}" added to layer "${data.layer}" — offset (${data.params.offsetX}, ${data.params.offsetY}), color ${data.params.color}, blur ${data.params.blur}, opacity ${data.params.opacity}`);
    });
  }
}
