import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  readCanvasJSON,
} from '../../io/project-io.js';
import { validateSizeRules } from '../../core/validation-engine.js';
import type { SizeViolation } from '../../core/validation-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

interface CanvasSizeResult {
  canvas: string;
  violations: SizeViolation[];
  passed: boolean;
}

export default class ValidateSize extends BaseCommand {
  static description = 'Validate canvas sizes against project size rules';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name to validate',
    }),
    all: Flags.boolean({
      description: 'Validate all canvases in the project',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidateSize);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!flags.canvas && !flags.all) {
      this.error('Specify --canvas or --all to select canvases to validate.');
    }

    const rules = project.validation.sizeRules;

    if (rules.length === 0) {
      const resultData = {
        results: [] as CanvasSizeResult[],
        totalViolations: 0,
        warning: 'No size rules defined.',
      };
      const cmdResult = makeResult('validate:size', { canvas: flags.canvas, all: flags.all }, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log('No size rules defined. Use project:validation --add-rule to add rules.');
      });
      return;
    }

    const canvasNames = flags.all ? project.canvases : [flags.canvas!];
    const results: CanvasSizeResult[] = [];

    for (const canvasName of canvasNames) {
      const canvas = readCanvasJSON(projectPath, canvasName);
      const violations = validateSizeRules(canvasName, canvas.width, canvas.height, rules);
      results.push({
        canvas: canvasName,
        violations,
        passed: violations.length === 0,
      });
    }

    const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);

    const cmdResult = makeResult(
      'validate:size',
      { canvas: flags.canvas, all: flags.all },
      { results, totalViolations },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      for (const r of data.results) {
        if (r.passed) {
          this.log(`${r.canvas}: PASS`);
        } else {
          this.log(`${r.canvas}: FAIL: ${r.violations.length} violation(s)`);
          for (const v of r.violations) {
            this.log(`  - ${v.message}`);
          }
        }
      }

      if (data.totalViolations > 0) {
        this.log(`\nTotal violations: ${data.totalViolations}`);
      } else {
        this.log('\nAll canvases pass size validation.');
      }
    });
  }
}
