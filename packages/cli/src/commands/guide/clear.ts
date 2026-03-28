import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, clearGuides, createDefaultGuideConfig, formatOutput, makeResult } from '@pixelcreator/core';

export default class GuideClear extends BaseCommand {
  static override description = 'Remove all guides from a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GuideClear);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const config = canvas.guides ?? createDefaultGuideConfig();
    const count = config.guides.length;
    canvas.guides = clearGuides(config);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('guide:clear', { canvas: flags.canvas }, { cleared: count }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => { this.log(`Cleared ${r.cleared} guides`); });
  }
}
