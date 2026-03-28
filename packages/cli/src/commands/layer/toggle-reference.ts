import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerToggleReference extends BaseCommand {
  static override description = 'Toggle visibility of a reference layer';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerToggleReference);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layer = canvas.layers.find(l => l.id === flags.layer);
    if (!layer) throw new Error(`Layer not found: ${flags.layer}`);
    if (layer.type !== 'reference') throw new Error(`Layer "${flags.layer}" is not a reference layer`);

    layer.visible = !layer.visible;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:toggle-reference', { canvas: flags.canvas, layer: flags.layer }, { id: layer.id, name: layer.name, visible: layer.visible }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Reference "${r.name}" visibility: ${r.visible ? 'on' : 'off'}`);
    });
  }
}
