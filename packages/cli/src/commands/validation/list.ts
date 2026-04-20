import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  formatOutput,
  getProjectPath,
  listFlags,
  makeResult,
  readValidationFlags,
} from '@pixelcreator/core';
import type { FlagCategory, FlagSeverity } from '@pixelcreator/core';

export default class ValidationList extends BaseCommand {
  static description = 'List validation flags on a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    'open-only': Flags.boolean({ description: 'Only list unresolved flags', default: false }),
    severity: Flags.string({
      description: 'Filter by severity',
      options: ['error', 'warning', 'info'],
    }),
    category: Flags.string({
      description: 'Filter by category',
      options: ['pixel', 'color', 'palette', 'animation', 'bounds', 'composition', 'other'],
    }),
    frame: Flags.integer({ description: 'Filter by frame index' }),
    layer: Flags.string({ description: 'Filter by layer ID' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidationList);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const file = readValidationFlags(projectPath, flags.canvas);
    const matched = listFlags(file, {
      openOnly: flags['open-only'],
      severity: flags.severity as FlagSeverity | undefined,
      category: flags.category as FlagCategory | undefined,
      frameIndex: flags.frame,
      layerId: flags.layer,
    });

    const result = makeResult(
      'validation:list',
      {
        canvas: flags.canvas,
        openOnly: flags['open-only'],
        severity: flags.severity,
        category: flags.category,
        frame: flags.frame,
        layer: flags.layer,
      },
      { canvas: flags.canvas, count: matched.length, flags: matched },
      startTime,
    );

    formatOutput(format, result, (data) => {
      if (data.flags.length === 0) {
        this.log(`No flags on "${data.canvas}".`);
        return;
      }
      for (const f of data.flags) {
        const status = f.resolvedAt ? 'RESOLVED' : 'OPEN';
        const scope: string[] = [];
        if (f.frameIndex !== undefined) scope.push(`frame ${f.frameIndex}`);
        if (f.layerId) scope.push(f.layerId);
        if (f.region) scope.push(`${f.region.x},${f.region.y} ${f.region.w}x${f.region.h}`);
        const scopeStr = scope.length ? ` [${scope.join(' / ')}]` : '';
        this.log(
          `${f.id} ${status} ${f.severity.toUpperCase()}/${f.category}${scopeStr}: ${f.note}`,
        );
        if (f.resolution) this.log(`  resolution: ${f.resolution}`);
      }
      this.log(`\nTotal: ${data.flags.length}`);
    });
  }
}
