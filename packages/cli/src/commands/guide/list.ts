import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, createDefaultGuideConfig, formatOutput, makeResult } from '@pixelcreator/core';

export default class GuideList extends BaseCommand {
  static override description = 'List all guides on a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GuideList);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const config = canvas.guides ?? createDefaultGuideConfig();

    const result = makeResult('guide:list', { canvas: flags.canvas }, { guides: config.guides, total: config.guides.length, snapEnabled: config.snapEnabled, snapThreshold: config.snapThreshold }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Guides (${r.total}): snap ${r.snapEnabled ? 'on' : 'off'} (threshold: ${r.snapThreshold}px)`);
      for (const g of r.guides) {
        this.log(`  ${g.id} — ${g.orientation} at ${g.position}px${g.locked ? ' [locked]' : ''}`);
      }
    });
  }
}
