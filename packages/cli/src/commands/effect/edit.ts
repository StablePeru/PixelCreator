import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class EffectEdit extends BaseCommand {
  static description = 'Edit parameters of an existing effect';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    effect: Flags.string({ char: 'e', description: 'Effect ID to edit', required: true }),
    params: Flags.string({ description: 'New parameters as JSON string (merged with existing)', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectEdit);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effect = layer.effects.find((e) => e.id === flags.effect);
    if (!effect) throw new Error(`Effect "${flags.effect}" not found on layer "${flags.layer}"`);

    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(flags.params);
    } catch {
      throw new Error(`Invalid JSON in --params: ${flags.params}`);
    }

    effect.params = { ...effect.params, ...parsedParams };
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId: flags.effect, canvas: flags.canvas, layer: flags.layer, params: effect.params };
    const cmdResult = makeResult('effect:edit', { canvas: flags.canvas, layer: flags.layer, effect: flags.effect }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Effect "${data.effectId}" updated on layer "${data.layer}" — params: ${JSON.stringify(data.params)}`);
    });
  }
}
