import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, analyzePaletteAccessibility, formatOutput, makeResult } from '@pixelcreator/core';

export default class ExportAccessibilityReport extends BaseCommand {
  static override description = 'Export palette accessibility report as JSON';

  static override flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    file: Flags.string({
      description: 'Output file path',
      required: true,
    }),
    format: Flags.string({
      description: 'Output file format',
      options: ['json'],
      default: 'json',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportAccessibilityReport);

    const outputFormat = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    const report = analyzePaletteAccessibility(palette);

    const exportData = {
      palette: flags.name,
      colorCount: palette.colors.length,
      colors: palette.colors.map((c) => c.hex),
      score: report.score,
      issues: report.issues,
      issuesByDeficiency: report.issuesByDeficiency,
      totalColors: report.totalColors,
      generatedAt: new Date().toISOString(),
    };

    const destPath = path.resolve(flags.file);
    fs.writeFileSync(destPath, JSON.stringify(exportData, null, 2), 'utf-8');

    const resultData = {
      palette: flags.name,
      file: destPath,
      format: flags.format,
      score: report.score,
      issueCount: report.issues.length,
    };

    const cmdResult = makeResult(
      'export:accessibility-report',
      { name: flags.name, file: flags.file, format: flags.format },
      resultData,
      startTime,
    );

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`Accessibility report exported for palette "${data.palette}"`);
      this.log(`  File: ${data.file}`);
      this.log(`  Format: ${data.format}`);
      this.log(`  Score: ${data.score}/100`);
      this.log(`  Issues: ${data.issueCount}`);
    });
  }
}
