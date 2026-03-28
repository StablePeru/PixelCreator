import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, loadPNG, writeLayerFrame, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerAddReference extends BaseCommand {
  static override description = 'Add a reference layer from a PNG image file';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    file: Flags.string({ description: 'Path to PNG image file', required: true }),
    name: Flags.string({ description: 'Reference layer name', default: 'Reference' }),
    opacity: Flags.integer({ description: 'Layer opacity (0-255)', default: 128 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerAddReference);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const buffer = loadPNG(flags.file);

    const layerId = generateSequentialId('layer', canvas.layers.length + 1);
    canvas.layers.push({
      id: layerId,
      name: flags.name,
      type: 'reference',
      visible: true,
      opacity: flags.opacity,
      blendMode: 'normal',
      locked: true,
      order: canvas.layers.length,
      referenceSource: flags.file,
    });

    // Write reference buffer for each frame
    for (const frame of canvas.frames) {
      writeLayerFrame(projectPath, flags.canvas, layerId, frame.id, buffer);
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:add-reference', { canvas: flags.canvas, file: flags.file, name: flags.name }, { id: layerId, name: flags.name, width: buffer.width, height: buffer.height, opacity: flags.opacity }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Reference layer "${r.name}" (${r.id}) added — ${r.width}x${r.height}px, opacity ${r.opacity}`);
    });
  }
}
