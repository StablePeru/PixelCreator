import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { BlendMode } from '@pixelcreator/core';

export default class EffectColorOverlay extends BaseCommand {
  static description = 'Add a color overlay effect to a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    color: Flags.string({ description: 'Overlay color as hex (e.g. #ff0000)', required: true }),
    opacity: Flags.integer({ description: 'Overlay opacity (0-255)', default: 128 }),
    'blend-mode': Flags.string({ description: 'Blend mode for overlay', default: 'normal' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectColorOverlay);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effectId = generateSequentialId('effect', layer.effects.length + 1);
    const effect = {
      id: effectId,
      type: 'color-overlay' as const,
      enabled: true,
      params: {
        color: flags.color,
        opacity: flags.opacity,
        blendMode: flags['blend-mode'] as BlendMode,
      },
    };

    layer.effects.push(effect);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId, canvas: flags.canvas, layer: flags.layer, params: effect.params };
    const cmdResult = makeResult('effect:color-overlay', { canvas: flags.canvas, layer: flags.layer }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Color overlay "${data.effectId}" added to layer "${data.layer}" — color ${data.params.color}, opacity ${data.params.opacity}, blend ${data.params.blendMode}`);
    });
  }
}
