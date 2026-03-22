import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, deleteLayerFrame, deleteLayerDirectory, flattenLayers, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class LayerMergeVisible extends BaseCommand {
  static description = 'Merge all visible layers into one';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    name: Flags.string({
      description: 'Name for the merged layer',
      default: 'merged',
    }),
    keep: Flags.boolean({
      description: 'Keep original layers (add merged on top)',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerMergeVisible);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const visibleLayers = canvas.layers
      .filter((l) => l.visible)
      .sort((a, b) => a.order - b.order);

    if (visibleLayers.length === 0) {
      this.error('No visible layers to merge.');
    }

    // Generate new layer ID
    const existingIds = canvas.layers.map((l) => {
      const match = l.id.match(/^layer-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNum = Math.max(0, ...existingIds) + 1;
    const newLayerId = `layer-${String(nextNum).padStart(3, '0')}`;

    // Flatten for each frame
    for (const frame of canvas.frames) {
      const layersWithBuffers: LayerWithBuffer[] = visibleLayers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frame.id),
      }));

      const merged = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
      writeLayerFrame(projectPath, flags.canvas, newLayerId, frame.id, merged);
    }

    const mergedLayerCount = visibleLayers.length;

    if (!flags.keep) {
      // Remove visible layers
      for (const layer of visibleLayers) {
        for (const frame of canvas.frames) {
          deleteLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        }
        deleteLayerDirectory(projectPath, flags.canvas, layer.id);
      }

      // Remove from array
      canvas.layers = canvas.layers.filter((l) => !l.visible);
    }

    // Add new merged layer
    const newOrder = canvas.layers.length;
    canvas.layers.push({
      id: newLayerId,
      name: flags.name,
      type: 'normal',
      visible: true,
      locked: false,
      opacity: 255,
      blendMode: 'normal',
      order: newOrder,
    });

    // Reassign orders
    for (let i = 0; i < canvas.layers.length; i++) {
      canvas.layers[i].order = i;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      mergedLayerCount,
      newLayerId,
      newLayerName: flags.name,
      kept: flags.keep,
    };

    const cmdResult = makeResult(
      'layer:merge-visible',
      { canvas: flags.canvas, name: flags.name, keep: flags.keep },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Merged ${data.mergedLayerCount} visible layers into "${data.newLayerName}" (${data.newLayerId})`);
      if (data.kept) {
        this.log('  Original layers kept');
      } else {
        this.log('  Original visible layers removed');
      }
    });
  }
}
