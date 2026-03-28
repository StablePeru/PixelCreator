import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, moveGuide, createDefaultGuideConfig, formatOutput, makeResult } from '@pixelcreator/core';

export default class GuideMove extends BaseCommand {
  static override description = 'Move a guide to a new position';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    id: Flags.string({ description: 'Guide ID', required: true }),
    position: Flags.integer({ description: 'New position in pixels', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GuideMove);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const config = canvas.guides ?? createDefaultGuideConfig();
    if (!config.guides.some(g => g.id === flags.id)) {
      throw new Error(`Guide not found: ${flags.id}`);
    }
    canvas.guides = moveGuide(config, flags.id, flags.position);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('guide:move', { canvas: flags.canvas, id: flags.id, position: flags.position }, { id: flags.id, position: flags.position }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => { this.log(`Guide ${r.id} moved to ${r.position}px`); });
  }
}
