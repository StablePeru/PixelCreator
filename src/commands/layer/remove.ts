import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  deleteLayerFrame,
  deleteLayerDirectory,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerRemove extends BaseCommand {
  static description = 'Remove a layer from a canvas';

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
    force: Flags.boolean({
      description: 'Allow removing the last layer',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerRemove);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layerIndex = canvas.layers.findIndex((l) => l.id === flags.layer);
    if (layerIndex === -1) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    if (canvas.layers.length <= 1 && !flags.force) {
      this.error('Cannot remove the last layer. Use --force to override.');
    }

    const layer = canvas.layers[layerIndex];

    // Delete PNGs for all frames
    let framesDeleted = 0;
    for (const frame of canvas.frames) {
      deleteLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      framesDeleted++;
    }

    // Delete layer directory
    deleteLayerDirectory(projectPath, flags.canvas, layer.id);

    // Remove from array
    canvas.layers.splice(layerIndex, 1);

    // Reassign orders
    for (let i = 0; i < canvas.layers.length; i++) {
      canvas.layers[i].order = i;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      id: layer.id,
      name: layer.name,
      framesDeleted,
      remainingLayers: canvas.layers.length,
    };

    const cmdResult = makeResult(
      'layer:remove',
      { canvas: flags.canvas, layer: flags.layer, force: flags.force },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.name}" (${data.id}) removed from canvas "${flags.canvas}"`);
      this.log(`  Frame PNGs deleted: ${data.framesDeleted}`);
      this.log(`  Remaining layers: ${data.remainingLayers}`);
    });
  }
}
