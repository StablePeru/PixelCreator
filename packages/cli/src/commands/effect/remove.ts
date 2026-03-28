import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class EffectRemove extends BaseCommand {
  static description = 'Remove an effect from a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    effect: Flags.string({ char: 'e', description: 'Effect ID to remove', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectRemove);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effectIndex = layer.effects.findIndex((e) => e.id === flags.effect);
    if (effectIndex === -1) throw new Error(`Effect "${flags.effect}" not found on layer "${flags.layer}"`);

    const removed = layer.effects.splice(effectIndex, 1)[0];
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { effectId: flags.effect, canvas: flags.canvas, layer: flags.layer, type: removed.type };
    const cmdResult = makeResult('effect:remove', { canvas: flags.canvas, layer: flags.layer, effect: flags.effect }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Effect "${data.effectId}" (${data.type}) removed from layer "${data.layer}"`);
    });
  }
}
