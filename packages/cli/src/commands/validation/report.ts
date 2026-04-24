import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  buildValidationReport,
  formatOutput,
  getProjectPath,
  makeResult,
} from '@pixelcreator/core';

export default class ValidationReportCmd extends BaseCommand {
  static description =
    'Produce a consolidated validation report for a canvas (manual flags + automatic checks)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    'open-only': Flags.boolean({
      description: 'Only include unresolved manual flags',
      default: true,
    }),
    'include-palette': Flags.boolean({
      description: 'Include per-frame palette violations',
      default: false,
    }),
    'include-accessibility': Flags.boolean({
      description: 'Include palette accessibility report',
      default: false,
    }),
    'include-asset': Flags.boolean({
      description: 'Include asset-spec validation results',
      default: false,
    }),
    all: Flags.boolean({
      description: 'Shortcut: enable every automatic check',
      default: false,
    }),
    palette: Flags.string({
      description: 'Override palette used for palette/accessibility checks',
    }),
    asset: Flags.string({
      description: 'Limit asset validation to this asset name',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidationReportCmd);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const includePalette = flags.all || flags['include-palette'];
    const includeAccessibility = flags.all || flags['include-accessibility'];
    const includeAsset = flags.all || flags['include-asset'];

    const report = buildValidationReport(projectPath, flags.canvas, {
      openOnly: flags['open-only'],
      includePalette,
      includeAccessibility,
      includeAsset,
      paletteOverride: flags.palette,
      assetName: flags.asset,
    });

    const result = makeResult(
      'validation:report',
      {
        canvas: flags.canvas,
        openOnly: flags['open-only'],
        includePalette,
        includeAccessibility,
        includeAsset,
      },
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

      if (data.automatic.palette) {
        const total = data.automatic.palette.reduce((sum, i) => sum + i.totalPixelsOutOfPalette, 0);
        this.log(
          `  palette violations: ${total} px across ${data.automatic.palette.length} frame(s)`,
        );
        for (const issue of data.automatic.palette) {
          this.log(`    - frame ${issue.frame}: ${issue.totalPixelsOutOfPalette} px`);
        }
      }

      if (data.automatic.accessibility) {
        const a = data.automatic.accessibility;
        const critical = a.issues.filter((i) => i.severity === 'indistinguishable').length;
        const marginal = a.issues.filter((i) => i.severity === 'marginal').length;
        this.log(
          `  accessibility: score ${a.score}/100 — critical ${critical}, marginal ${marginal}`,
        );
      }

      if (data.automatic.asset) {
        const failing = data.automatic.asset.filter((r) => !r.valid).length;
        this.log(`  asset specs: ${data.automatic.asset.length} checked, ${failing} failing`);
        for (const r of data.automatic.asset) {
          if (r.valid) continue;
          this.log(`    - ${r.asset}: ${r.issues.length} issue(s)`);
          for (const issue of r.issues) {
            this.log(`        [${issue.severity}] ${issue.field}: ${issue.message}`);
          }
        }
      }
    });
  }
}
