import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readAssetSpec,
  listAssetSpecs,
  parseAssetSpec,
  validateAssetSpec,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class AssetValidate extends BaseCommand {
  static description = 'Validate an asset spec against the project';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Asset name to validate (validates all if omitted)',
    }),
    strict: Flags.boolean({
      description: 'Treat warnings as errors',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AssetValidate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const names = flags.name ? [flags.name] : listAssetSpecs(projectPath);

    if (names.length === 0) {
      this.error('No asset specs found. Run `pxc asset:init` first.');
    }

    const results: Array<{
      asset: string;
      valid: boolean;
      errors: string[];
      warnings: string[];
    }> = [];

    for (const name of names) {
      const raw = readAssetSpec(projectPath, name);

      // Schema validation
      const { spec, errors: schemaErrors } = parseAssetSpec(raw);
      if (!spec) {
        results.push({ asset: name, valid: false, errors: schemaErrors, warnings: [] });
        continue;
      }

      // Project-level validation
      const validation = validateAssetSpec(spec, projectPath);
      const errors = validation.issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => `[${issue.field}] ${issue.message}`);
      const warnings = validation.issues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => `[${issue.field}] ${issue.message}`);

      const valid = flags.strict
        ? errors.length === 0 && warnings.length === 0
        : errors.length === 0;

      results.push({ asset: name, valid, errors, warnings });
    }

    const allValid = results.every((r) => r.valid);
    const resultData = { assets: results, allValid };

    const cmdResult = makeResult(
      'asset:validate',
      { name: flags.name, strict: flags.strict },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      for (const r of data.assets) {
        const icon = r.valid ? 'PASS' : 'FAIL';
        this.log(`[${icon}] ${r.asset}`);
        for (const e of r.errors) {
          this.log(`  ERROR: ${e}`);
        }
        for (const w of r.warnings) {
          this.log(`  WARN:  ${w}`);
        }
      }
      this.log('');
      this.log(data.allValid ? 'All assets valid.' : 'Some assets have issues.');
    });

    if (!allValid) {
      this.exit(1);
    }
  }
}
