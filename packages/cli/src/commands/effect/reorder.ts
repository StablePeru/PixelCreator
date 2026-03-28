import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class EffectReorder extends BaseCommand {
  static description = 'Reorder effects on a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    order: Flags.string({ description: 'Comma-separated effect IDs in desired order', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectReorder);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const orderIds = flags.order.split(',').map((id) => id.trim());
    const effectMap = new Map(layer.effects.map((e) => [e.id, e]));

    for (const id of orderIds) {
      if (!effectMap.has(id)) {
        throw new Error(`Effect "${id}" not found on layer "${flags.layer}"`);
      }
    }

    if (orderIds.length !== layer.effects.length) {
      throw new Error(`Expected ${layer.effects.length} effect IDs but received ${orderIds.length}`);
    }

    layer.effects = orderIds.map((id) => effectMap.get(id)!);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = { canvas: flags.canvas, layer: flags.layer, order: orderIds };
    const cmdResult = makeResult('effect:reorder', { canvas: flags.canvas, layer: flags.layer, order: flags.order }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Effects on layer "${data.layer}" reordered: ${data.order.join(', ')}`);
    });
  }
}
