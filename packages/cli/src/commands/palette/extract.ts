import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readCanvasJSON, readPaletteJSON, writePaletteJSON, readLayerFrame, extractUniqueColors, flattenLayers, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer, PaletteData, PaletteColor } from '@pixelcreator/core';

export default class PaletteExtract extends BaseCommand {
  static description = 'Extract unique colors from a canvas into a palette';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    palette: Flags.string({
      description: 'Target palette name',
      required: true,
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Specific layer ID',
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Specific frame ID',
    }),
    merge: Flags.boolean({
      description: 'Merge into existing palette',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteExtract);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    // Determine which frames/layers to scan
    const framesToScan = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : canvas.frames;
    const layersToScan = flags.layer
      ? canvas.layers.filter((l) => l.id === flags.layer)
      : canvas.layers;

    if (flags.frame && framesToScan.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }
    if (flags.layer && layersToScan.length === 0) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    // Collect unique colors from all relevant buffers
    const allColors = new Set<string>();
    for (const frame of framesToScan) {
      if (flags.layer) {
        const buffer = readLayerFrame(projectPath, flags.canvas, flags.layer, frame.id);
        for (const hex of extractUniqueColors(buffer, false)) {
          allColors.add(hex);
        }
      } else {
        // Flatten all layers for this frame
        const layersWithBuffers: LayerWithBuffer[] = layersToScan.map((layerInfo) => ({
          info: layerInfo,
          buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frame.id),
        }));
        const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
        for (const hex of extractUniqueColors(flattened, false)) {
          allColors.add(hex);
        }
      }
    }

    const extractedColors = [...allColors].sort();
    let created = false;
    let merged = false;

    const paletteExists = project.palettes.includes(flags.palette);

    if (paletteExists && !flags.merge) {
      this.error(`Palette "${flags.palette}" already exists. Use --merge to add new colors.`);
    }

    let palette: PaletteData;

    if (paletteExists) {
      palette = readPaletteJSON(projectPath, flags.palette);
      merged = true;

      const existingHexes = new Set(palette.colors.map((c) => c.hex));
      for (const hex of extractedColors) {
        if (!existingHexes.has(hex)) {
          palette.colors.push({
            index: palette.colors.length,
            hex,
            name: null,
            group: null,
          });
        }
      }
    } else {
      created = true;

      const colors: PaletteColor[] = extractedColors.map((hex, index) => ({
        index,
        hex,
        name: null,
        group: null,
      }));

      palette = {
        name: flags.palette,
        description: `Extracted from canvas "${flags.canvas}"`,
        colors,
        constraints: { maxColors: 256, locked: false, allowAlpha: true },
        ramps: [],
      };

      project.palettes.push(flags.palette);
      writeProjectJSON(projectPath, project);
    }

    writePaletteJSON(projectPath, palette);

    const resultData = {
      canvas: flags.canvas,
      palette: flags.palette,
      colorsExtracted: extractedColors.length,
      totalColors: palette.colors.length,
      created,
      merged,
      colors: extractedColors,
    };

    const cmdResult = makeResult(
      'palette:extract',
      { canvas: flags.canvas, palette: flags.palette, layer: flags.layer, frame: flags.frame, merge: flags.merge },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.created) {
        this.log(`Palette "${data.palette}" created with ${data.colorsExtracted} colors from "${data.canvas}"`);
      } else {
        this.log(`Merged ${data.colorsExtracted} colors into palette "${data.palette}" (total: ${data.totalColors})`);
      }
      for (const hex of data.colors) {
        this.log(`  ${hex}`);
      }
    });
  }
}
