import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerClip extends BaseCommand {
  static override description = 'Enable or disable clipping mask on a layer';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    clip: Flags.boolean({ description: 'Enable clipping', default: true, allowNo: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerClip);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found`);

    layer.clipping = flags.clip;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:clip', { canvas: flags.canvas, layer: flags.layer, clip: flags.clip }, { layerId: flags.layer, clipping: flags.clip }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Layer ${r.layerId} clipping ${r.clipping ? 'enabled' : 'disabled'}`);
    });
  }
}
