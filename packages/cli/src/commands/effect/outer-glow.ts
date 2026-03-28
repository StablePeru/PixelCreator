import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';

export default class EffectOuterGlow extends BaseCommand {
  static description = 'Add an outer glow effect to a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    color: Flags.string({ description: 'Glow color as hex (e.g. #ffffff)', default: '#ffffff' }),
    radius: Flags.integer({ description: 'Glow radius in pixels', default: 2 }),
    intensity: Flags.integer({ description: 'Glow intensity (0-255)', default: 200 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectOuterGlow);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effectId = generateSequentialId('effect', layer.effects.length + 1);
    const effect = {
      id: effectId,
      type: 'outer-glow' as const,
      enabled: true,
      params: {
        color: flags.color,
        radius: flags.radius,
        intensity: flags.intensity,
      },
    };

    layer.effects.push(effect);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId, canvas: flags.canvas, layer: flags.layer, params: effect.params };
    const cmdResult = makeResult('effect:outer-glow', { canvas: flags.canvas, layer: flags.layer }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Outer glow "${data.effectId}" added to layer "${data.layer}" — color ${data.params.color}, radius ${data.params.radius}, intensity ${data.params.intensity}`);
    });
  }
}
