import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  formatOutput,
  getProjectPath,
  listFlags,
  makeResult,
  readCanvasJSON,
  readProjectJSON,
  readValidationFlags,
  validateSizeRules,
} from '@pixelcreator/core';
import type { ValidationReport, ValidationSizeIssue } from '@pixelcreator/core';

export default class ValidationReportCmd extends BaseCommand {
  static description =
    'Produce a consolidated validation report for a canvas (manual flags + automatic size checks)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    'open-only': Flags.boolean({
      description: 'Only include unresolved manual flags',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidationReportCmd);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const project = readProjectJSON(projectPath);

    const flagsFile = readValidationFlags(projectPath, flags.canvas);
    const manual = listFlags(flagsFile, { openOnly: flags['open-only'] });

    const sizeViolations = validateSizeRules(
      flags.canvas,
      canvas.width,
      canvas.height,
      project.validation.sizeRules,
    );
    const size: ValidationSizeIssue[] = sizeViolations.map((v) => ({
      canvas: v.canvas,
      width: v.width,
      height: v.height,
      rule: v.rule.type,
      message: v.message,
    }));

    const report: ValidationReport = {
      canvas: flags.canvas,
      generatedAt: Date.now(),
      manual,
      automatic: { size },
    };

    const result = makeResult(
      'validation:report',
      { canvas: flags.canvas, openOnly: flags['open-only'] },
      report,
      startTime,
    );

    formatOutput(format, result, (data) => {
      this.log(`Validation report — ${data.canvas}`);
      this.log(`  manual flags: ${data.manual.length}`);
      for (const f of data.manual) {
        const status = f.resolvedAt ? 'RESOLVED' : 'OPEN';
        this.log(`    ${f.id} ${status} ${f.severity.toUpperCase()}/${f.category}: ${f.note}`);
      }
      const sizeIssues = data.automatic.size ?? [];
      this.log(`  size rule violations: ${sizeIssues.length}`);
      for (const s of sizeIssues) {
        this.log(`    - ${s.message}`);
      }
    });
  }
}
