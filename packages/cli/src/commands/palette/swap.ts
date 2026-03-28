import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readPaletteJSON,
  readLayerFrame,
  writeLayerFrame,
  applyPaletteSwap,
  hexToRGBA,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class PaletteSwap extends BaseCommand {
  static description =
    'Apply palette swap to a canvas, replacing colors from one palette with another';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      description: 'Canvas name',
      required: true,
    }),
    from: Flags.string({
      description: 'Source palette name',
      required: true,
    }),
    to: Flags.string({
      description: 'Target palette name',
      required: true,
    }),
    layer: Flags.string({
      description: 'Specific layer ID (all layers if omitted)',
    }),
    frame: Flags.string({
      description: 'Specific frame ID (all frames if omitted)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteSwap);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const fromPalette = readPaletteJSON(projectPath, flags.from);
    const toPalette = readPaletteJSON(projectPath, flags.to);

    // Convert palette colors to RGBA arrays
    const fromColors = fromPalette.colors.map((c) => hexToRGBA(c.hex));
    const toColors = toPalette.colors.map((c) => hexToRGBA(c.hex));

    // Determine which layers to process
    const layers = flags.layer
      ? canvas.layers.filter((l) => l.id === flags.layer)
      : canvas.layers.filter((l) => l.type === 'normal');

    if (flags.layer && layers.length === 0) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    // Determine which frames to process
    const frames = flags.frame ? canvas.frames.filter((f) => f.id === flags.frame) : canvas.frames;

    if (flags.frame && frames.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let swappedCount = 0;

    for (const layer of layers) {
      for (const frame of frames) {
        try {
          const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
          const swapped = applyPaletteSwap(buffer, fromColors, toColors);
          writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, swapped);
          swappedCount++;
        } catch {
          // Skip frames that don't exist for this layer (sparse frames)
          continue;
        }
      }
    }

    const resultData = {
      canvas: flags.canvas,
      fromPalette: flags.from,
      toPalette: flags.to,
      layersProcessed: layers.length,
      framesProcessed: frames.length,
      swappedCount,
    };

    const cmdResult = makeResult(
      'palette:swap',
      {
        canvas: flags.canvas,
        from: flags.from,
        to: flags.to,
        layer: flags.layer,
        frame: flags.frame,
      },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette swap applied to canvas "${data.canvas}"`);
      this.log(`  From: "${data.fromPalette}" → To: "${data.toPalette}"`);
      this.log(`  Layers processed: ${data.layersProcessed}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
      this.log(`  Buffers swapped: ${data.swappedCount}`);
    });
  }
}
