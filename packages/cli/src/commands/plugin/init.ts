import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { createPluginScaffold, formatOutput, makeResult } from '@pixelcreator/core';

export default class PluginInit extends BaseCommand {
  static description = 'Scaffold a new plugin project';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Plugin name',
      required: true,
    }),
    dest: Flags.string({
      char: 'd',
      description: 'Directory to create the scaffold in',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PluginInit);

    const format = this.getOutputFormat(flags);

    createPluginScaffold(flags.name, flags.dest);

    const resultData = { name: flags.name, dest: flags.dest };
    const cmdResult = makeResult('plugin:init', resultData, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Plugin "${data.name}" scaffolded at ${data.dest}`);
    });
  }
}
