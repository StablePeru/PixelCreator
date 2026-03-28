import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerSetReferenceOpacity extends BaseCommand {
  static override description = 'Set opacity of a reference layer';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    opacity: Flags.integer({ description: 'Opacity (0-255)', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerSetReferenceOpacity);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layer = canvas.layers.find(l => l.id === flags.layer);
    if (!layer) throw new Error(`Layer not found: ${flags.layer}`);
    if (layer.type !== 'reference') throw new Error(`Layer "${flags.layer}" is not a reference layer`);

    layer.opacity = Math.max(0, Math.min(255, flags.opacity));
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:set-reference-opacity', { canvas: flags.canvas, layer: flags.layer, opacity: flags.opacity }, { id: layer.id, name: layer.name, opacity: layer.opacity }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Reference "${r.name}" opacity set to ${r.opacity}`);
    });
  }
}
