import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, createDefaultGuideConfig, formatOutput, makeResult } from '@pixelcreator/core';

export default class GuideSnap extends BaseCommand {
  static override description = 'Toggle guide snapping or set snap threshold';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    enabled: Flags.boolean({ description: 'Enable snapping', allowNo: true }),
    threshold: Flags.integer({ description: 'Snap threshold in pixels (1-32)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GuideSnap);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const config = canvas.guides ?? createDefaultGuideConfig();

    if (flags.enabled !== undefined) config.snapEnabled = flags.enabled;
    if (flags.threshold !== undefined) config.snapThreshold = Math.max(1, Math.min(32, flags.threshold));
    canvas.guides = config;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('guide:snap', { canvas: flags.canvas }, { snapEnabled: config.snapEnabled, snapThreshold: config.snapThreshold }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Snap: ${r.snapEnabled ? 'on' : 'off'} (threshold: ${r.snapThreshold}px)`);
    });
  }
}
