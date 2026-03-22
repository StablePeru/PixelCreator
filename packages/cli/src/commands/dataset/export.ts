import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, formatOutput, makeResult } from '@pixelcreator/core';

export default class DatasetExport extends BaseCommand {
  static override description = 'Export dataset as JSONL for AI training';

  static override flags = {
    ...BaseCommand.baseFlags,
    dest: Flags.string({ description: 'Destination file path', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DatasetExport);
    const projectPath = getProjectPath(flags.project);

    const { exportDatasetJsonl, readDatasetIndex } = await import('@pixelcreator/studio');
    const jsonl = exportDatasetJsonl(projectPath);
    const index = readDatasetIndex(projectPath);

    fs.writeFileSync(flags.dest, jsonl);

    const format = this.getOutputFormat(flags);
    const result = makeResult('dataset:export', { dest: flags.dest }, { entries: index.entries.length, dest: flags.dest }, startTime);
    formatOutput(format, result, (data) => {
      this.log(`Exported ${data.entries} entries to ${data.dest}`);
    });
  }
}
