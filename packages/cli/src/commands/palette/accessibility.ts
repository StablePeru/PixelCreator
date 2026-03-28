import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, analyzePaletteAccessibility, formatOutput, makeResult } from '@pixelcreator/core';
import type { VisionDeficiency } from '@pixelcreator/core';

export default class PaletteAccessibility extends BaseCommand {
  static override description = 'Generate accessibility report for a palette';

  static override flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({ char: 'n', description: 'Palette name', required: true }),
    deficiency: Flags.string({
      description: 'Specific vision deficiency to check',
      options: ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteAccessibility);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    const deficiencies = flags.deficiency
      ? [flags.deficiency as VisionDeficiency]
      : undefined;

    const report = analyzePaletteAccessibility(palette, deficiencies);

    const result = makeResult('palette:accessibility', { name: flags.name, deficiency: flags.deficiency ?? null }, { ...report }, startTime);
    formatOutput(format, result, (r) => {
      this.log(`Accessibility report for "${r.paletteName}" (${r.totalColors} colors)`);
      this.log(`  Score: ${r.score}/100`);
      if (r.issues.length > 0) {
        this.log(`  Issues (${r.issues.length}):`);
        for (const issue of r.issues) {
          this.log(`    [${issue.severity}] ${issue.colorA.hex} / ${issue.colorB.hex} — ${issue.deficiency} (dist: ${issue.simulatedDistance})`);
        }
      } else {
        this.log(`  No issues found.`);
      }
    });
  }
}
