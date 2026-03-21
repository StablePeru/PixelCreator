import * as path from 'node:path';
import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { initProjectStructure } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { ProjectData } from '../../types/project.js';

type Preset = 'minimal' | 'game-2d' | 'platformer' | 'rpg' | 'ui-kit';

export default class ProjectInit extends BaseCommand {
  static description = 'Initialize a new .pxc pixel art project';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Project name',
      required: true,
    }),
    path: Flags.string({
      description: 'Directory where the project will be created',
      default: process.cwd(),
    }),
    preset: Flags.string({
      description: 'Project preset template',
      options: ['minimal', 'game-2d', 'platformer', 'rpg', 'ui-kit'],
      default: 'minimal',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectInit);

    const format = this.getOutputFormat(flags);
    const projectDir = path.resolve(flags.path, `${flags.name}.pxc`);

    if (fs.existsSync(projectDir)) {
      this.error(`Project already exists at: ${projectDir}`);
    }

    fs.mkdirSync(projectDir, { recursive: true });

    const project = initProjectStructure(projectDir, flags.name);
    const preset = flags.preset as Preset;

    if (preset !== 'minimal') {
      applyPreset(project, preset);
    }

    const resultData = {
      name: project.name,
      path: projectDir,
      preset,
      version: project.version,
      created: project.created,
    };

    const cmdResult = makeResult('project:init', { name: flags.name, path: flags.path, preset }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Project "${data.name}" created at ${data.path}`);
      this.log(`  Preset: ${data.preset}`);
      this.log(`  Version: ${data.version}`);
    });
  }
}

function applyPreset(project: ProjectData, preset: Preset): void {
  switch (preset) {
    case 'game-2d':
      project.settings.defaultTileSize = { width: 16, height: 16 };
      break;
    case 'platformer':
      project.settings.defaultTileSize = { width: 16, height: 32 };
      break;
    case 'rpg':
      project.settings.defaultTileSize = { width: 16, height: 16 };
      break;
    case 'ui-kit':
      project.settings.defaultTileSize = { width: 24, height: 24 };
      project.settings.pixelPerfect = false;
      break;
  }
}
