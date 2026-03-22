import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readRecipeJSON, resolveRecipeVariables, buildCommandArgs, formatOutput, makeResult } from '@pixelcreator/core';

export default class RecipeRun extends BaseCommand {
  static description = 'Run a recipe';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Recipe name',
      required: true,
    }),
    var: Flags.string({
      description: 'Variable override (key=value)',
      multiple: true,
    }),
    'dry-run': Flags.boolean({
      description: 'Show commands without executing',
      default: false,
    }),
    'stop-on-error': Flags.boolean({
      description: 'Stop on first error',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(RecipeRun);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const recipe = readRecipeJSON(projectPath, flags.name);

    // Parse --var flags
    const overrides: Record<string, string> = {};
    if (flags.var) {
      for (const v of flags.var) {
        const eqIdx = v.indexOf('=');
        if (eqIdx === -1) {
          this.error(`Invalid variable format: "${v}". Expected key=value.`);
        }
        overrides[v.slice(0, eqIdx)] = v.slice(eqIdx + 1);
      }
    }

    const resolvedSteps = resolveRecipeVariables(recipe.steps, recipe.variables, overrides);
    const __filename = fileURLToPath(import.meta.url);
    const binPath = path.resolve(path.dirname(__filename), '..', '..', '..', 'bin', 'run.js');
    const results: Array<{ step: number; command: string; success: boolean; output?: string; error?: string }> = [];
    let stepsFailed = 0;

    for (let i = 0; i < resolvedSteps.length; i++) {
      const step = resolvedSteps[i];
      const args = buildCommandArgs(step);
      const cmdStr = `node "${binPath}" ${args.map((a) => a.includes(' ') ? `"${a}"` : a).join(' ')} --project "${projectPath}"`;

      if (flags['dry-run']) {
        results.push({ step: i + 1, command: args.join(' '), success: true, output: '(dry-run)' });
        continue;
      }

      try {
        const output = execSync(cmdStr, {
          cwd: path.dirname(projectPath),
          encoding: 'utf-8',
          timeout: 30000,
        });
        results.push({ step: i + 1, command: args.join(' '), success: true, output: output.trim() });
      } catch (error: unknown) {
        stepsFailed++;
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push({ step: i + 1, command: args.join(' '), success: false, error: errMsg });

        const continueOnError = recipe.steps[i].continueOnError ?? false;
        if (flags['stop-on-error'] && !continueOnError) {
          break;
        }
      }
    }

    const resultData = {
      recipe: flags.name,
      stepsExecuted: results.length,
      stepsFailed,
      dryRun: flags['dry-run'],
      results,
    };

    const cmdResult = makeResult('recipe:run', {
      name: flags.name, var: flags.var, 'dry-run': flags['dry-run'], 'stop-on-error': flags['stop-on-error'],
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Recipe "${data.recipe}" — ${data.stepsExecuted} steps executed, ${data.stepsFailed} failed${data.dryRun ? ' (dry-run)' : ''}`);
      for (const r of data.results) {
        const status = r.success ? '✓' : '✗';
        this.log(`  ${status} Step ${r.step}: ${r.command}`);
        if (r.error) this.log(`    Error: ${r.error.split('\n')[0]}`);
      }
    });
  }
}
