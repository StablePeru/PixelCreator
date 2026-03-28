import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { EffectParams } from '@pixelcreator/core';

export default class EffectAdd extends BaseCommand {
  static description = 'Add a generic effect to a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    type: Flags.string({ description: 'Effect type', required: true, options: ['drop-shadow', 'outer-glow', 'outline', 'color-overlay'] }),
    params: Flags.string({ description: 'Effect parameters as JSON string', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectAdd);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(flags.params);
    } catch {
      throw new Error(`Invalid JSON in --params: ${flags.params}`);
    }

    const effectId = generateSequentialId('effect', layer.effects.length + 1);
    const effect = {
      id: effectId,
      type: flags.type as 'drop-shadow' | 'outer-glow' | 'outline' | 'color-overlay',
      enabled: true,
      params: parsedParams as unknown as EffectParams,
    };

    layer.effects.push(effect);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId, canvas: flags.canvas, layer: flags.layer, type: flags.type, params: parsedParams };
    const cmdResult = makeResult('effect:add', { canvas: flags.canvas, layer: flags.layer, type: flags.type }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Effect "${data.effectId}" (${data.type}) added to layer "${data.layer}"`);
    });
  }
}
