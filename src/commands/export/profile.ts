import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportProfile extends BaseCommand {
  static description = 'Manage export profiles';

  static flags = {
    ...BaseCommand.baseFlags,
    create: Flags.string({
      description: 'Create a new export profile with this name',
    }),
    delete: Flags.string({
      description: 'Delete an export profile by name',
    }),
    list: Flags.boolean({
      description: 'List all export profiles',
      default: false,
    }),
    show: Flags.string({
      description: 'Show details of an export profile',
    }),
    target: Flags.string({
      description: 'Export target: png, gif, apng, spritesheet',
      options: ['png', 'gif', 'apng', 'spritesheet'],
    }),
    dest: Flags.string({
      description: 'Destination file path',
    }),
    scale: Flags.integer({
      description: 'Scale factor',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportProfile);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const actions = [flags.create, flags.delete, flags.list, flags.show].filter(Boolean);
    if (actions.length === 0) {
      this.error('One action required: --create, --delete, --list, or --show.');
    }
    if (actions.length > 1) {
      this.error('Only one action allowed: --create, --delete, --list, or --show.');
    }

    if (flags.list) {
      const profiles = Object.entries(project.exportProfiles).map(([name, p]) => ({
        name,
        target: p.target,
        dest: p.dest,
        scale: p.scale,
      }));

      const resultData = { profiles, count: profiles.length };
      const cmdResult = makeResult('export:profile', { list: true }, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log(`Export profiles: ${data.count}`);
        for (const p of data.profiles) {
          this.log(`  ${p.name}: ${p.target} → ${p.dest} (scale ${p.scale}x)`);
        }
      });
      return;
    }

    if (flags.show) {
      const profile = project.exportProfiles[flags.show];
      if (!profile) {
        this.error(`Export profile "${flags.show}" not found.`);
      }

      const resultData = { name: flags.show, ...profile };
      const cmdResult = makeResult('export:profile', { show: flags.show }, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log(`Profile "${data.name}":`);
        this.log(`  Target: ${data.target}`);
        this.log(`  Dest: ${data.dest}`);
        this.log(`  Scale: ${data.scale}x`);
      });
      return;
    }

    if (flags.delete) {
      if (!project.exportProfiles[flags.delete]) {
        this.error(`Export profile "${flags.delete}" not found.`);
      }

      delete project.exportProfiles[flags.delete];
      writeProjectJSON(projectPath, project);

      const resultData = { name: flags.delete, deleted: true };
      const cmdResult = makeResult('export:profile', { delete: flags.delete }, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log(`Export profile "${data.name}" deleted.`);
      });
      return;
    }

    if (flags.create) {
      if (project.exportProfiles[flags.create]) {
        this.error(`Export profile "${flags.create}" already exists.`);
      }

      if (!flags.target) {
        this.error('--target is required when creating a profile.');
      }

      if (!flags.dest) {
        this.error('--dest is required when creating a profile.');
      }

      if (flags.scale < 1) {
        this.error('Scale must be at least 1.');
      }

      project.exportProfiles[flags.create] = {
        target: flags.target,
        dest: flags.dest,
        scale: flags.scale,
      };

      writeProjectJSON(projectPath, project);

      const resultData = {
        name: flags.create,
        target: flags.target,
        dest: flags.dest,
        scale: flags.scale,
      };

      const cmdResult = makeResult(
        'export:profile',
        { create: flags.create, target: flags.target, dest: flags.dest, scale: flags.scale },
        resultData,
        startTime,
      );

      formatOutput(format, cmdResult, (data) => {
        this.log(`Export profile "${data.name}" created`);
        this.log(`  Target: ${data.target}`);
        this.log(`  Dest: ${data.dest}`);
        this.log(`  Scale: ${data.scale}x`);
      });
    }
  }
}
