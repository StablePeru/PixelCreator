import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, deleteLayerFrame, deleteLayerDirectory, mergeLayerBuffers, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerMerge extends BaseCommand {
  static description = 'Merge two layers (top into bottom)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    top: Flags.string({
      description: 'Top layer ID (will be removed)',
      required: true,
    }),
    bottom: Flags.string({
      description: 'Bottom layer ID (will receive merged result)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerMerge);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const topLayer = canvas.layers.find((l) => l.id === flags.top);
    const bottomLayer = canvas.layers.find((l) => l.id === flags.bottom);

    if (!topLayer) {
      this.error(`Top layer "${flags.top}" not found in canvas "${flags.canvas}".`);
    }
    if (!bottomLayer) {
      this.error(`Bottom layer "${flags.bottom}" not found in canvas "${flags.canvas}".`);
    }
    if (flags.top === flags.bottom) {
      this.error('Top and bottom layers must be different.');
    }
    if (topLayer.locked) {
      this.error(`Top layer "${flags.top}" is locked.`);
    }
    if (bottomLayer.locked) {
      this.error(`Bottom layer "${flags.bottom}" is locked.`);
    }

    // Merge for each frame
    let framesMerged = 0;
    for (const frame of canvas.frames) {
      const bottomBuffer = readLayerFrame(projectPath, flags.canvas, bottomLayer.id, frame.id);
      const topBuffer = readLayerFrame(projectPath, flags.canvas, topLayer.id, frame.id);
      const merged = mergeLayerBuffers(bottomBuffer, topBuffer, topLayer.opacity);
      writeLayerFrame(projectPath, flags.canvas, bottomLayer.id, frame.id, merged);
      framesMerged++;
    }

    // Delete top layer PNGs and directory
    for (const frame of canvas.frames) {
      deleteLayerFrame(projectPath, flags.canvas, topLayer.id, frame.id);
    }
    deleteLayerDirectory(projectPath, flags.canvas, topLayer.id);

    // Remove top layer from array
    const topIndex = canvas.layers.findIndex((l) => l.id === flags.top);
    canvas.layers.splice(topIndex, 1);

    // Reassign orders
    for (let i = 0; i < canvas.layers.length; i++) {
      canvas.layers[i].order = i;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      topId: topLayer.id,
      bottomId: bottomLayer.id,
      bottomName: bottomLayer.name,
      framesMerged,
      remainingLayers: canvas.layers.length,
    };

    const cmdResult = makeResult(
      'layer:merge',
      { canvas: flags.canvas, top: flags.top, bottom: flags.bottom },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Merged layer "${data.topId}" into "${data.bottomName}" (${data.bottomId})`);
      this.log(`  Frames merged: ${data.framesMerged}`);
      this.log(`  Remaining layers: ${data.remainingLayers}`);
    });
  }
}
