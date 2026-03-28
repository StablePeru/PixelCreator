import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, formatOutput, makeResult } from '@pixelcreator/core';

export default class DatasetList extends BaseCommand {
  static override description = 'List dataset feedback entries';

  static override flags = {
    ...BaseCommand.baseFlags,
    rating: Flags.string({ description: 'Filter by rating', options: ['like', 'dislike'] }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DatasetList);
    const projectPath = getProjectPath(flags.project);

    const { readDatasetIndex } = await import('@pixelcreator/studio');
    const index = readDatasetIndex(projectPath);
    let entries = index.entries;
    if (flags.rating) entries = entries.filter((e: Record<string, unknown>) => e.rating === flags.rating);

    const format = this.getOutputFormat(flags);
    const result = makeResult('dataset:list', { rating: flags.rating }, { count: entries.length, entries }, startTime);
    formatOutput(format, result, (data) => {
      this.log(`Dataset: ${data.count} entries`);
      for (const e of data.entries) {
        const emoji = e.rating === 'like' ? '\u{1F44D}' : '\u{1F44E}';
        this.log(`  ${emoji} ${e.canvasName} - ${e.reason || '(no reason)'} [${e.tags.join(', ')}]`);
      }
    });
  }
}
