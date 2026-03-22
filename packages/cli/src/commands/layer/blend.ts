import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';
import type { BlendMode } from '@pixelcreator/core';

const VALID_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'addition', 'subtract',
];

export default class LayerBlend extends BaseCommand {
  static description = 'Set the blend mode for a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    layer: Flags.string({
      description: 'Layer ID',
      required: true,
    }),
    mode: Flags.string({
      char: 'm',
      description: 'Blend mode (normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, addition, subtract)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerBlend);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    if (!VALID_MODES.includes(flags.mode as BlendMode)) {
      this.error(`Invalid blend mode "${flags.mode}". Valid modes: ${VALID_MODES.join(', ')}`);
    }

    const previousMode = layer.blendMode;
    layer.blendMode = flags.mode as BlendMode;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      layer: layer.id,
      previousMode,
      newMode: layer.blendMode,
    };

    const cmdResult = makeResult('layer:blend', { canvas: flags.canvas, layer: flags.layer, mode: flags.mode }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" blend mode changed from "${data.previousMode}" to "${data.newMode}"`);
    });
  }
}
