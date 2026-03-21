import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  ensureCanvasStructure,
} from '../../io/project-io.js';
import { generateSequentialId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { LayerType } from '../../types/canvas.js';

export default class LayerAdd extends BaseCommand {
  static description = 'Add a new layer to a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Layer name',
      required: true,
    }),
    type: Flags.string({
      description: 'Layer type',
      options: ['normal', 'reference', 'tilemap'],
      default: 'normal',
    }),
    opacity: Flags.integer({
      description: 'Layer opacity (0-255)',
      default: 255,
    }),
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerAdd);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.opacity < 0 || flags.opacity > 255) {
      this.error('Opacity must be between 0 and 255.');
    }

    const nextIndex = canvas.layers.length + 1;
    const layerId = generateSequentialId('layer', nextIndex);
    const layerType = flags.type as LayerType;

    canvas.layers.push({
      id: layerId,
      name: flags.name,
      type: layerType,
      visible: true,
      opacity: flags.opacity,
      blendMode: 'normal',
      locked: false,
      order: canvas.layers.length,
    });

    ensureCanvasStructure(projectPath, flags.canvas, canvas);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      id: layerId,
      name: flags.name,
      type: layerType,
      opacity: flags.opacity,
      order: canvas.layers.length - 1,
      framesCreated: canvas.frames.length,
    };

    const cmdResult = makeResult(
      'layer:add',
      { name: flags.name, type: flags.type, opacity: flags.opacity, canvas: flags.canvas },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.name}" added to canvas "${flags.canvas}"`);
      this.log(`  ID: ${data.id}`);
      this.log(`  Type: ${data.type}`);
      this.log(`  Opacity: ${data.opacity}`);
      this.log(`  Order: ${data.order}`);
      this.log(`  Frame PNGs created: ${data.framesCreated}`);
    });
  }
}
