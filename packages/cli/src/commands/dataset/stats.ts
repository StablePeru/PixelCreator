import { BaseCommand } from '../base-command.js';
import { getProjectPath, formatOutput, makeResult } from '@pixelcreator/core';

export default class DatasetStats extends BaseCommand {
  static override description = 'Show dataset statistics';

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DatasetStats);
    const projectPath = getProjectPath(flags.project);

    const { getDatasetStats } = await import('@pixelcreator/studio');
    const stats = getDatasetStats(projectPath);

    const format = this.getOutputFormat(flags);
    const result = makeResult('dataset:stats', {}, stats, startTime);
    formatOutput(format, result, (data) => {
      this.log(`Dataset Statistics:`);
      this.log(`  Total: ${data.total}`);
      this.log(`  Likes: ${data.likes} | Dislikes: ${data.dislikes}`);
      this.log(`  Like ratio: ${data.likeRatio}%`);
      if (Object.keys(data.tagCounts).length > 0) {
        this.log(`  Tags:`);
        for (const [tag, count] of Object.entries(data.tagCounts)) {
          this.log(`    ${tag}: ${count}`);
        }
      }
    });
  }
}
