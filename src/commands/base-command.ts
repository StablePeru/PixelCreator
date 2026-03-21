import { Command, Flags } from '@oclif/core';
import type { OutputFormat } from '../types/common.js';

export abstract class BaseCommand extends Command {
  static baseFlags = {
    project: Flags.string({
      char: 'p',
      description: 'Path to .pxc project',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format: text, json, silent',
      options: ['text', 'json', 'silent'],
      default: 'text',
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Verbose logging',
      default: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would happen without executing',
      default: false,
    }),
    'no-color': Flags.boolean({
      description: 'Disable colored output',
      default: false,
    }),
  };

  protected getOutputFormat(flags: { output?: string }): OutputFormat {
    return (flags.output as OutputFormat) || 'text';
  }
}
