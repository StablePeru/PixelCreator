import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerReorder extends BaseCommand {
  static description = 'Reorder a layer within a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Layer ID',
      required: true,
    }),
    position: Flags.integer({
      description: 'Target position (0-based)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerReorder);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layerIndex = canvas.layers.findIndex((l) => l.id === flags.layer);
    if (layerIndex === -1) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    if (flags.position < 0 || flags.position >= canvas.layers.length) {
      this.error(`Position must be between 0 and ${canvas.layers.length - 1}.`);
    }

    const layer = canvas.layers[layerIndex];
    const oldOrder = layer.order;

    // Remove and re-insert at target position
    canvas.layers.splice(layerIndex, 1);
    canvas.layers.splice(flags.position, 0, layer);

    // Reassign sequential orders
    for (let i = 0; i < canvas.layers.length; i++) {
      canvas.layers[i].order = i;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      id: layer.id,
      name: layer.name,
      oldOrder,
      newOrder: layer.order,
      layerOrder: canvas.layers.map((l) => ({ id: l.id, name: l.name, order: l.order })),
    };

    const cmdResult = makeResult(
      'layer:reorder',
      { canvas: flags.canvas, layer: flags.layer, position: flags.position },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.name}" moved from order ${data.oldOrder} to ${data.newOrder}`);
      this.log('  Layer order:');
      for (const l of data.layerOrder) {
        this.log(`    ${l.order}: ${l.name} (${l.id})`);
      }
    });
  }
}
