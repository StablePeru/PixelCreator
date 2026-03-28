import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readAssetSpec,
  parseAssetSpec,
  buildAsset,
  writeExportFiles,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class AssetBuild extends BaseCommand {
  static description = 'Build a game-ready asset: validate, render, compose, and export';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Asset name to build',
      required: true,
    }),
    dest: Flags.string({
      description: 'Output directory (default: exports/<asset-name>/)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AssetBuild);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    // Read and parse spec
    const raw = readAssetSpec(projectPath, flags.name);
    const { spec, errors: schemaErrors } = parseAssetSpec(raw);
    if (!spec) {
      this.error(`Invalid asset spec "${flags.name}":\n  ${schemaErrors.join('\n  ')}`);
    }

    // Determine output dir
    const destDir = flags.dest
      ? path.resolve(flags.dest)
      : path.join(projectPath, 'exports', spec.name);

    // Build
    const result = buildAsset(spec, projectPath, destDir);

    if (!result.validation.valid) {
      const errors = result.validation.issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => `[${issue.field}] ${issue.message}`);
      this.error(`Asset "${flags.name}" validation failed:\n  ${errors.join('\n  ')}`);
    }

    // Write files to disk
    const written = writeExportFiles(destDir, result.files);

    const resultData = {
      asset: spec.name,
      canvas: spec.canvas,
      engine: spec.export.engine,
      scale: spec.export.scale,
      dest: destDir,
      files: written,
      fileCount: written.length,
      warnings: result.validation.issues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => issue.message),
    };

    const cmdResult = makeResult(
      'asset:build',
      { name: flags.name, dest: flags.dest },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Asset "${data.asset}" built successfully`);
      this.log(`  Canvas: ${data.canvas}`);
      this.log(`  Engine: ${data.engine} (scale ${data.scale}x)`);
      this.log(`  Output: ${data.dest}`);
      this.log(`  Files:`);
      for (const f of data.files) {
        this.log(`    ${f}`);
      }
      if (data.warnings.length > 0) {
        this.log('');
        this.log('  Warnings:');
        for (const w of data.warnings) {
          this.log(`    ${w}`);
        }
      }
    });
  }
}
