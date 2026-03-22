import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, formatOutput, makeResult } from '@pixelcreator/core';

export default class ProjectClean extends BaseCommand {
  static override description = 'Clean temporary project data (snapshots, clipboard, selections)';

  static override flags = {
    ...BaseCommand.baseFlags,
    snapshots: Flags.boolean({ description: 'Remove all snapshots', default: false }),
    clipboard: Flags.boolean({ description: 'Clear clipboard', default: false }),
    selections: Flags.boolean({ description: 'Clear all selections', default: false }),
    all: Flags.boolean({ description: 'Clean everything', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectClean);
    const projectPath = getProjectPath(flags.project);

    const cleanAll = flags.all;
    const cleaned: string[] = [];

    if (cleanAll || flags.snapshots) {
      const dir = path.join(projectPath, 'snapshots');
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        cleaned.push('snapshots');
      }
    }

    if (cleanAll || flags.clipboard) {
      const dir = path.join(projectPath, 'clipboard');
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        cleaned.push('clipboard');
      }
    }

    if (cleanAll || flags.selections) {
      const dir = path.join(projectPath, 'selections');
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        cleaned.push('selections');
      }
    }

    if (cleaned.length === 0 && !cleanAll) {
      throw new Error('Must specify --snapshots, --clipboard, --selections, or --all');
    }

    const result = makeResult('project:clean', { all: flags.all }, { cleaned, itemsCleaned: cleaned.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.itemsCleaned > 0) {
        console.log(`Cleaned: ${r.cleaned.join(', ')}`);
      } else {
        console.log('Nothing to clean');
      }
    });
  }
}
