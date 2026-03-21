import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath } from '../../io/project-io.js';
import { discoverPlugins } from '../../core/plugin-loader.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class PluginInfo extends BaseCommand {
  static description = 'Show details about an installed plugin';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Plugin name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PluginInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const plugins = discoverPlugins(projectPath);
    const plugin = plugins.find((p) => p.name === flags.name);

    if (!plugin) {
      this.error(`Plugin "${flags.name}" not found.`);
    }

    const resultData = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      path: plugin.path,
      source: plugin.source,
      commands: plugin.manifest.commands || {},
      hooks: plugin.manifest.hooks || {},
    };

    const cmdResult = makeResult('plugin:info', { name: flags.name }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Plugin: ${data.name}@${data.version}`);
      if (data.description) this.log(`  Description: ${data.description}`);
      this.log(`  Path: ${data.path}`);
      this.log(`  Source: ${data.source}`);
      const cmds = Object.keys(data.commands);
      const hooks = Object.keys(data.hooks);
      this.log(`  Commands (${cmds.length}): ${cmds.join(', ') || '(none)'}`);
      this.log(`  Hooks (${hooks.length}): ${hooks.join(', ') || '(none)'}`);
    });
  }
}
