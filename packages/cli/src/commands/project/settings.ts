import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readPaletteJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class ProjectSettings extends BaseCommand {
  static description = 'View or update project settings';

  static flags = {
    ...BaseCommand.baseFlags,
    'default-tile-width': Flags.integer({
      description: 'Default tile width',
    }),
    'default-tile-height': Flags.integer({
      description: 'Default tile height',
    }),
    'default-palette': Flags.string({
      description: 'Default palette name (use "none" to clear)',
    }),
    'pixel-perfect': Flags.boolean({
      description: 'Enable pixel-perfect mode',
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectSettings);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const hasSetter =
      flags['default-tile-width'] !== undefined ||
      flags['default-tile-height'] !== undefined ||
      flags['default-palette'] !== undefined ||
      flags['pixel-perfect'] !== undefined;

    if (!hasSetter) {
      const resultData = {
        settings: project.settings,
        changes: [] as string[],
      };

      const cmdResult = makeResult('project:settings', {}, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log('Project Settings:');
        this.log(`  Default tile size: ${data.settings.defaultTileSize.width}x${data.settings.defaultTileSize.height}`);
        this.log(`  Default palette: ${data.settings.defaultPalette ?? 'none'}`);
        this.log(`  Pixel perfect: ${data.settings.pixelPerfect}`);
      });
      return;
    }

    const changes: string[] = [];

    if (flags['default-tile-width'] !== undefined) {
      if (flags['default-tile-width'] < 1) {
        this.error('Default tile width must be at least 1.');
      }
      project.settings.defaultTileSize.width = flags['default-tile-width'];
      changes.push(`Default tile width set to ${flags['default-tile-width']}`);
    }

    if (flags['default-tile-height'] !== undefined) {
      if (flags['default-tile-height'] < 1) {
        this.error('Default tile height must be at least 1.');
      }
      project.settings.defaultTileSize.height = flags['default-tile-height'];
      changes.push(`Default tile height set to ${flags['default-tile-height']}`);
    }

    if (flags['default-palette'] !== undefined) {
      if (flags['default-palette'] === 'none') {
        project.settings.defaultPalette = null;
        changes.push('Default palette cleared');
      } else {
        readPaletteJSON(projectPath, flags['default-palette']);
        project.settings.defaultPalette = flags['default-palette'];
        changes.push(`Default palette set to "${flags['default-palette']}"`);
      }
    }

    if (flags['pixel-perfect'] !== undefined) {
      project.settings.pixelPerfect = flags['pixel-perfect'];
      changes.push(`Pixel perfect set to ${flags['pixel-perfect']}`);
    }

    writeProjectJSON(projectPath, project);

    const resultData = {
      settings: project.settings,
      changes,
    };

    const cmdResult = makeResult(
      'project:settings',
      {
        'default-tile-width': flags['default-tile-width'],
        'default-tile-height': flags['default-tile-height'],
        'default-palette': flags['default-palette'],
        'pixel-perfect': flags['pixel-perfect'],
      },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log('Project settings updated:');
      for (const c of data.changes) {
        this.log(`  ${c}`);
      }
    });
  }
}
