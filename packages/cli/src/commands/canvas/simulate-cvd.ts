import { Flags } from '@oclif/core';
import * as path from 'node:path';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, simulateBufferColorBlindness, savePNG, formatOutput, makeResult } from '@pixelcreator/core';
import type { VisionDeficiency, LayerWithBuffer } from '@pixelcreator/core';

const VALID_DEFICIENCIES: VisionDeficiency[] = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

export default class CanvasSimulateCvd extends BaseCommand {
  static override description = 'Simulate color vision deficiency on a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    deficiency: Flags.string({
      char: 'd',
      description: 'Vision deficiency type: protanopia, deuteranopia, tritanopia, achromatopsia',
      required: true,
      options: VALID_DEFICIENCIES as string[],
    }),
    export: Flags.string({
      description: 'Output PNG file path',
    }),
    frame: Flags.integer({
      description: 'Frame index to simulate (0-based)',
      default: 0,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasSimulateCvd);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.frame < 0 || flags.frame >= canvas.frames.length) {
      this.error(`Frame index ${flags.frame} out of range (0-${canvas.frames.length - 1}).`);
    }

    const frameId = canvas.frames[flags.frame].id;

    // Flatten all layers for the given frame
    const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
      info: layerInfo,
      buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
    }));

    const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

    // Simulate color vision deficiency
    const deficiency = flags.deficiency as VisionDeficiency;
    const simulated = simulateBufferColorBlindness(flattened, deficiency);

    let exportPath: string | null = null;
    if (flags.export) {
      exportPath = path.resolve(flags.export);
      savePNG(simulated, exportPath);
    }

    const resultData = {
      canvas: flags.canvas,
      frame: flags.frame,
      frameId,
      deficiency,
      width: simulated.width,
      height: simulated.height,
      exported: exportPath,
    };

    const cmdResult = makeResult(
      'canvas:simulate-cvd',
      { canvas: flags.canvas, deficiency: flags.deficiency, frame: flags.frame, export: flags.export ?? null },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Simulated ${data.deficiency} on canvas "${data.canvas}" frame ${data.frame}`);
      this.log(`  Size: ${data.width}x${data.height}`);
      if (data.exported) {
        this.log(`  Exported to: ${data.exported}`);
      }
    });
  }
}
