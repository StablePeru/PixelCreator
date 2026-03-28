import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, createGuide, createDefaultGuideConfig, formatOutput, makeResult } from '@pixelcreator/core';
import type { GuideOrientation } from '@pixelcreator/core';

export default class GuideAdd extends BaseCommand {
  static override description = 'Add a guide line to a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    orientation: Flags.string({ description: 'Guide orientation', options: ['horizontal', 'vertical'], required: true }),
    position: Flags.integer({ description: 'Guide position in pixels', required: true }),
    color: Flags.string({ description: 'Guide color as hex', default: '#00ccff' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GuideAdd);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const config = canvas.guides ?? createDefaultGuideConfig();
    const updated = createGuide(config, flags.orientation as GuideOrientation, flags.position, flags.color);
    canvas.guides = updated;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const newGuide = updated.guides[updated.guides.length - 1];
    const result = makeResult('guide:add', { canvas: flags.canvas, orientation: flags.orientation, position: flags.position }, { id: newGuide.id, orientation: newGuide.orientation, position: newGuide.position, color: newGuide.color }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Guide added: ${r.id} (${r.orientation} at ${r.position}px)`);
    });
  }
}
