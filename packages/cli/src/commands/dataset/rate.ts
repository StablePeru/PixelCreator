import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, formatOutput, makeResult } from '@pixelcreator/core';

export default class DatasetRate extends BaseCommand {
  static override description = 'Rate a canvas for AI training dataset';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    rating: Flags.string({ description: 'Rating: like or dislike', required: true, options: ['like', 'dislike'] }),
    reason: Flags.string({ description: 'Reason for the rating' }),
    tags: Flags.string({ description: 'Comma-separated tags (composition,colors,animation,style,detail,proportions)' }),
    frame: Flags.integer({ char: 'f', description: 'Frame index', default: 0 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DatasetRate);
    const projectPath = getProjectPath(flags.project);

    const { addRating } = await import('@pixelcreator/studio');
    const tags = flags.tags ? flags.tags.split(',').map((t: string) => t.trim()) : [];
    const entry = addRating(projectPath, flags.canvas, flags.frame, flags.rating as 'like' | 'dislike', flags.reason, tags);

    const format = this.getOutputFormat(flags);
    const result = makeResult('dataset:rate', { canvas: flags.canvas, rating: flags.rating }, entry, startTime);
    formatOutput(format, result, (data) => {
      this.log(`Rated "${flags.canvas}" as ${flags.rating}`);
      if (data.reason) this.log(`  Reason: ${data.reason}`);
      if (data.tags?.length) this.log(`  Tags: ${data.tags.join(', ')}`);
    });
  }
}
