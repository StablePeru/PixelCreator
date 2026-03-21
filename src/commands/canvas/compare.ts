import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { compareBuffers } from '../../core/color-analysis-engine.js';
import { savePNG } from '../../io/png-codec.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasCompare extends BaseCommand {
  static description = 'Compare two canvases and report pixel differences';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    with: Flags.string({
      description: 'Other canvas name to compare against',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Target specific frame ID',
    }),
    dest: Flags.string({
      char: 'd',
      description: 'Save diff image to this PNG path',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasCompare);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const canvasA = readCanvasJSON(projectPath, flags.canvas);
    const canvasB = readCanvasJSON(projectPath, flags.with);

    const frameIdA = flags.frame ?? canvasA.frames[0].id;
    const frameA = canvasA.frames.find((f) => f.id === frameIdA);
    if (!frameA) {
      this.error(`Frame "${frameIdA}" not found in canvas "${flags.canvas}".`);
    }

    const frameIdB = flags.frame ?? canvasB.frames[0].id;
    const frameB = canvasB.frames.find((f) => f.id === frameIdB);
    if (!frameB) {
      this.error(`Frame "${frameIdB}" not found in canvas "${flags.with}".`);
    }

    // Flatten both canvases
    const layersA: LayerWithBuffer[] = canvasA.layers.map((layerInfo) => ({
      info: layerInfo,
      buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameA.id),
    }));
    const bufferA = flattenLayers(layersA, canvasA.width, canvasA.height);

    const layersB: LayerWithBuffer[] = canvasB.layers.map((layerInfo) => ({
      info: layerInfo,
      buffer: readLayerFrame(projectPath, flags.with, layerInfo.id, frameB.id),
    }));
    const bufferB = flattenLayers(layersB, canvasB.width, canvasB.height);

    const comparison = compareBuffers(bufferA, bufferB);

    if (flags.dest) {
      savePNG(comparison.diffBuffer, flags.dest);
    }

    const resultData = {
      identical: comparison.identical,
      diffCount: comparison.diffCount,
      diffPercentage: comparison.diffPercentage,
    };

    const cmdResult = makeResult(
      'canvas:compare',
      { canvas: flags.canvas, with: flags.with, frame: flags.frame, dest: flags.dest },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Comparison: "${flags.canvas}" vs "${flags.with}"`);
      if (data.identical) {
        console.log('  Result: IDENTICAL');
      } else {
        console.log(`  Differing pixels: ${data.diffCount} (${data.diffPercentage}%)`);
      }
      if (flags.dest) {
        console.log(`  Diff image saved to: ${flags.dest}`);
      }
    });
  }
}
