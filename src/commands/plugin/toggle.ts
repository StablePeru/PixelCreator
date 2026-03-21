import * as path from 'node:path';
import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath } from '../../io/project-io.js';
import { getPluginsDir } from '../../core/plugin-loader.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class PluginToggle extends BaseCommand {
  static description = 'Enable or disable an installed plugin';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Plugin name',
      required: true,
    }),
    enable: Flags.boolean({
      description: 'Enable the plugin (use --no-enable to disable)',
      default: true,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PluginToggle);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const pluginDir = path.join(getPluginsDir(projectPath), flags.name);

    if (!fs.existsSync(pluginDir)) {
      this.error(`Plugin "${flags.name}" not found.`);
    }

    const markerPath = path.join(pluginDir, '.disabled');

    if (flags.enable) {
      if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
    } else {
      fs.writeFileSync(markerPath, '', 'utf8');
    }

    const resultData = { name: flags.name, enabled: flags.enable };
    const cmdResult = makeResult('plugin:toggle', { name: flags.name, enable: flags.enable }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Plugin "${data.name}" ${data.enabled ? 'enabled' : 'disabled'}.`);
    });
  }
}
