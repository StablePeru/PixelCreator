import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ProjectTags extends BaseCommand {
  static description = 'View or manage project tags';

  static flags = {
    ...BaseCommand.baseFlags,
    add: Flags.string({
      description: 'Add a tag (format: "key:value")',
    }),
    remove: Flags.string({
      description: 'Remove a tag (format: "key:value")',
    }),
    'remove-key': Flags.string({
      description: 'Remove an entire tag key',
    }),
    list: Flags.boolean({
      description: 'List all tags',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectTags);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const hasSetter = flags.add !== undefined || flags.remove !== undefined || flags['remove-key'] !== undefined;

    if (!hasSetter) {
      // View mode
      const cmdResult = makeResult(
        'project:tags',
        {},
        { tags: project.tags, changes: [] as string[] },
        startTime,
      );
      formatOutput(format, cmdResult, (data) => {
        const keys = Object.keys(data.tags);
        if (keys.length === 0) {
          this.log('No tags defined.');
          return;
        }
        this.log('Tags:');
        for (const key of keys) {
          this.log(`  ${key}: ${data.tags[key].join(', ')}`);
        }
      });
      return;
    }

    const changes: string[] = [];

    if (flags.add !== undefined) {
      const colonIndex = flags.add.indexOf(':');
      if (colonIndex === -1) {
        this.error('Tag format must be "key:value".');
      }
      const key = flags.add.slice(0, colonIndex);
      const value = flags.add.slice(colonIndex + 1);
      if (!key || !value) {
        this.error('Both key and value must be non-empty.');
      }
      if (!project.tags[key]) {
        project.tags[key] = [];
      }
      if (!project.tags[key].includes(value)) {
        project.tags[key].push(value);
      }
      changes.push(`Added "${value}" to "${key}"`);
    }

    if (flags.remove !== undefined) {
      const colonIndex = flags.remove.indexOf(':');
      if (colonIndex === -1) {
        this.error('Tag format must be "key:value".');
      }
      const key = flags.remove.slice(0, colonIndex);
      const value = flags.remove.slice(colonIndex + 1);
      if (project.tags[key]) {
        const idx = project.tags[key].indexOf(value);
        if (idx >= 0) {
          project.tags[key].splice(idx, 1);
          if (project.tags[key].length === 0) {
            delete project.tags[key];
          }
        }
      }
      changes.push(`Removed "${value}" from "${key}"`);
    }

    if (flags['remove-key'] !== undefined) {
      delete project.tags[flags['remove-key']];
      changes.push(`Removed key "${flags['remove-key']}"`);
    }

    writeProjectJSON(projectPath, project);

    const cmdResult = makeResult(
      'project:tags',
      { add: flags.add, remove: flags.remove, 'remove-key': flags['remove-key'] },
      { tags: project.tags, changes },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log('Tags updated:');
      for (const c of data.changes) {
        this.log(`  ${c}`);
      }
    });
  }
}
