import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, PixelBuffer, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerFitReference extends BaseCommand {
  static override description = 'Scale a reference layer to fit the canvas dimensions';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
    mode: Flags.string({ description: 'Fit mode', options: ['contain', 'cover', 'stretch'], default: 'contain' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerFitReference);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layer = canvas.layers.find(l => l.id === flags.layer);
    if (!layer) throw new Error(`Layer not found: ${flags.layer}`);
    if (layer.type !== 'reference') throw new Error(`Layer "${flags.layer}" is not a reference layer`);

    for (const frame of canvas.frames) {
      const src = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      const dest = new PixelBuffer(canvas.width, canvas.height);

      let scaleX: number, scaleY: number, offsetX = 0, offsetY = 0;

      if (flags.mode === 'stretch') {
        scaleX = canvas.width / src.width;
        scaleY = canvas.height / src.height;
      } else if (flags.mode === 'cover') {
        const scale = Math.max(canvas.width / src.width, canvas.height / src.height);
        scaleX = scaleY = scale;
        offsetX = Math.floor((canvas.width - src.width * scale) / 2);
        offsetY = Math.floor((canvas.height - src.height * scale) / 2);
      } else {
        const scale = Math.min(canvas.width / src.width, canvas.height / src.height);
        scaleX = scaleY = scale;
        offsetX = Math.floor((canvas.width - src.width * scale) / 2);
        offsetY = Math.floor((canvas.height - src.height * scale) / 2);
      }

      for (let dy = 0; dy < canvas.height; dy++) {
        for (let dx = 0; dx < canvas.width; dx++) {
          const sx = Math.floor((dx - offsetX) / scaleX);
          const sy = Math.floor((dy - offsetY) / scaleY);
          if (sx >= 0 && sx < src.width && sy >= 0 && sy < src.height) {
            dest.setPixel(dx, dy, src.getPixel(sx, sy));
          }
        }
      }

      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, dest);
    }

    const result = makeResult('layer:fit-reference', { canvas: flags.canvas, layer: flags.layer, mode: flags.mode }, { id: layer.id, name: layer.name, mode: flags.mode, width: canvas.width, height: canvas.height }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Reference "${r.name}" fitted to ${r.width}x${r.height} (${r.mode})`);
    });
  }
}
