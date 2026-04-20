import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  addFlag,
  formatOutput,
  getProjectPath,
  makeResult,
  readCanvasJSON,
  readValidationFlags,
  writeValidationFlags,
} from '@pixelcreator/core';
import type { FlagCategory, FlagSeverity } from '@pixelcreator/core';

const SEVERITIES: readonly FlagSeverity[] = ['error', 'warning', 'info'];
const CATEGORIES: readonly FlagCategory[] = [
  'pixel',
  'color',
  'palette',
  'animation',
  'bounds',
  'composition',
  'other',
];

function parseRegion(raw: string): { x: number; y: number; w: number; h: number } {
  const parts = raw.split(',').map((p) => p.trim());
  if (parts.length !== 4) {
    throw new Error(`Invalid --region "${raw}" (expected "x,y,w,h")`);
  }
  const [x, y, w, h] = parts.map((p) => Number(p));
  if ([x, y, w, h].some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid --region "${raw}" (non-numeric)`);
  }
  return { x, y, w, h };
}

export default class ValidationFlag extends BaseCommand {
  static description =
    'Create a validation flag on a canvas (optionally scoped to a frame, layer, or region)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    severity: Flags.string({
      description: 'Flag severity',
      options: [...SEVERITIES],
      default: 'warning',
    }),
    category: Flags.string({
      description: 'Flag category',
      options: [...CATEGORIES],
      default: 'other',
    }),
    note: Flags.string({ char: 'n', description: 'Human-readable note', required: true }),
    tag: Flags.string({ description: 'Tag to attach (repeatable)', multiple: true, default: [] }),
    frame: Flags.integer({ description: 'Frame index the flag applies to' }),
    layer: Flags.string({ description: 'Layer ID the flag applies to' }),
    region: Flags.string({ description: 'Pixel region "x,y,w,h"' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidationFlag);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    readCanvasJSON(projectPath, flags.canvas);

    const region = flags.region ? parseRegion(flags.region) : undefined;
    const file = readValidationFlags(projectPath, flags.canvas);
    const nextFile = addFlag(file, {
      canvas: flags.canvas,
      severity: flags.severity as FlagSeverity,
      category: flags.category as FlagCategory,
      note: flags.note,
      tags: flags.tag,
      frameIndex: flags.frame,
      layerId: flags.layer,
      region,
    });
    const created = nextFile.flags[nextFile.flags.length - 1];

    if (!flags['dry-run']) {
      writeValidationFlags(projectPath, flags.canvas, nextFile);
    }

    const result = makeResult(
      'validation:flag',
      {
        canvas: flags.canvas,
        severity: flags.severity,
        category: flags.category,
      },
      { flag: created, dryRun: flags['dry-run'] },
      startTime,
    );

    formatOutput(format, result, (data) => {
      const prefix = data.dryRun ? '[dry-run] Would create' : 'Created';
      this.log(
        `${prefix} ${data.flag.id} (${data.flag.severity}/${data.flag.category}) on "${data.flag.canvas}"`,
      );
      this.log(`  note: ${data.flag.note}`);
      if (data.flag.frameIndex !== undefined) this.log(`  frame: ${data.flag.frameIndex}`);
      if (data.flag.layerId) this.log(`  layer: ${data.flag.layerId}`);
      if (data.flag.region) {
        const r = data.flag.region;
        this.log(`  region: ${r.x},${r.y} ${r.w}x${r.h}`);
      }
    });
  }
}
