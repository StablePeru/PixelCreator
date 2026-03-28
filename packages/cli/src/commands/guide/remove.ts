import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, removeGuide, createDefaultGuideConfig, formatOutput, makeResult } from '@pixelcreator/core';

export default class GuideRemove extends BaseCommand {
  static override description = 'Remove a guide line from a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    id: Flags.string({ description: 'Guide ID to remove', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GuideRemove);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const config = canvas.guides ?? createDefaultGuideConfig();
    if (!config.guides.some(g => g.id === flags.id)) {
      throw new Error(`Guide not found: ${flags.id}`);
    }
    canvas.guides = removeGuide(config, flags.id);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('guide:remove', { canvas: flags.canvas, id: flags.id }, { id: flags.id }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => { this.log(`Guide removed: ${r.id}`); });
  }
}
