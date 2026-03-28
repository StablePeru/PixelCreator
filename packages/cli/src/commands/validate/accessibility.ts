import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, analyzePaletteAccessibility, formatOutput, makeResult } from '@pixelcreator/core';

export default class ValidateAccessibility extends BaseCommand {
  static override description = 'Validate color accessibility of a palette';

  static override flags = {
    ...BaseCommand.baseFlags,
    palette: Flags.string({
      description: 'Palette name to validate',
      required: true,
    }),
    strict: Flags.boolean({
      description: 'Strict mode: fail on marginal issues too',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidateAccessibility);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.palette);

    const report = analyzePaletteAccessibility(palette);

    const criticalIssues = report.issues.filter((i) => i.severity === 'indistinguishable');
    const marginalIssues = report.issues.filter((i) => i.severity === 'marginal');
    const failingIssues = flags.strict
      ? [...criticalIssues, ...marginalIssues]
      : criticalIssues;

    const passed = failingIssues.length === 0;

    const resultData = {
      palette: flags.palette,
      strict: flags.strict,
      passed,
      score: report.score,
      criticalCount: criticalIssues.length,
      marginalCount: marginalIssues.length,
      failingIssues,
    };

    const cmdResult = makeResult(
      'validate:accessibility',
      { palette: flags.palette, strict: flags.strict },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Accessibility validation: palette "${data.palette}" ${data.strict ? '(strict)' : '(standard)'}`);
      this.log(`  Score: ${data.score}/100`);
      this.log(`  Critical issues: ${data.criticalCount}`);
      this.log(`  Marginal issues: ${data.marginalCount}`);
      this.log(`  Result: ${data.passed ? 'PASS' : 'FAIL'}`);

      if (data.failingIssues.length > 0) {
        this.log(`\n  Failing issues:`);
        for (const issue of data.failingIssues) {
          this.log(`    [${issue.severity}] ${issue.colorA.hex} / ${issue.colorB.hex} — ${issue.deficiency}`);
        }
      }
    });

    if (!passed) {
      this.error(`Accessibility validation failed with ${failingIssues.length} issue(s).`);
    }
  }
}
