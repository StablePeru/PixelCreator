import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readCanvasJSON, readLayerFrame, writePaletteJSON, flattenLayers, generatePalette, rgbaToHex, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer, PaletteData, PaletteColor } from '@pixelcreator/core';

export default class PaletteGenerate extends BaseCommand {
  static description = 'Generate a palette from a canvas using color analysis';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    'max-colors': Flags.integer({
      description: 'Maximum number of colors in the palette',
      default: 16,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteGenerate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (project.palettes.includes(flags.name)) {
      this.error(`Palette "${flags.name}" already exists.`);
    }

    const frameId = flags.frame ?? canvas.frames[0].id;
    const frame = canvas.frames.find((f) => f.id === frameId);
    if (!frame) {
      this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
    }

    // Flatten all layers for this frame
    const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
      info: layerInfo,
      buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frame.id),
    }));
    const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

    const paletteColors = generatePalette(flattened, flags['max-colors']);

    const colors: PaletteColor[] = paletteColors.map((rgba, index) => ({
      index,
      hex: rgbaToHex(rgba),
      name: null,
      group: null,
    }));

    const palette: PaletteData = {
      name: flags.name,
      description: `Generated from canvas "${flags.canvas}"`,
      colors,
      constraints: { maxColors: flags['max-colors'], locked: false, allowAlpha: true },
      ramps: [],
    };

    writePaletteJSON(projectPath, palette);
    project.palettes.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      colorCount: colors.length,
    };

    const cmdResult = makeResult(
      'palette:generate',
      { canvas: flags.canvas, name: flags.name, 'max-colors': flags['max-colors'], frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Palette "${data.name}" generated with ${data.colorCount} colors`);
      for (const c of colors) {
        console.log(`  [${c.index}] ${c.hex}`);
      }
    });
  }
}
