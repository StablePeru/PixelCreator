import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
} from '../../io/project-io.js';
import { generateSequentialId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerDuplicate extends BaseCommand {
  static description = 'Duplicate a layer in a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Layer ID to duplicate',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Name for the new layer',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerDuplicate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const sourceLayer = canvas.layers.find((l) => l.id === flags.layer);
    if (!sourceLayer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    const nextIndex = canvas.layers.length + 1;
    const newId = generateSequentialId('layer', nextIndex);
    const newName = flags.name ?? `${sourceLayer.name} copy`;

    // Clone layer info
    canvas.layers.push({
      id: newId,
      name: newName,
      type: sourceLayer.type,
      visible: sourceLayer.visible,
      opacity: sourceLayer.opacity,
      blendMode: sourceLayer.blendMode,
      locked: false,
      order: canvas.layers.length,
    });

    // Copy PNGs for all frames
    let framesCopied = 0;
    for (const frame of canvas.frames) {
      const buffer = readLayerFrame(projectPath, flags.canvas, sourceLayer.id, frame.id);
      writeLayerFrame(projectPath, flags.canvas, newId, frame.id, buffer);
      framesCopied++;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      sourceId: sourceLayer.id,
      newId,
      newName,
      framesCopied,
    };

    const cmdResult = makeResult(
      'layer:duplicate',
      { canvas: flags.canvas, layer: flags.layer, name: flags.name },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.sourceId}" duplicated as "${data.newName}" (${data.newId})`);
      this.log(`  Frames copied: ${data.framesCopied}`);
    });
  }
}
