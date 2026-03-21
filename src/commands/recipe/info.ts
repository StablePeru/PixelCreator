import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readRecipeJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class RecipeInfo extends BaseCommand {
  static description = 'Show recipe details';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Recipe name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(RecipeInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const recipe = readRecipeJSON(projectPath, flags.name);

    const resultData = {
      name: recipe.name,
      description: recipe.description,
      variables: recipe.variables,
      steps: recipe.steps.map((s, i) => ({
        index: i + 1,
        command: s.command,
        description: s.description ?? '',
        args: s.args,
        continueOnError: s.continueOnError ?? false,
      })),
    };

    const cmdResult = makeResult('recipe:info', { name: flags.name }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Recipe: ${data.name}`);
      if (data.description) this.log(`  Description: ${data.description}`);
      if (Object.keys(data.variables).length > 0) {
        this.log(`  Variables:`);
        for (const [k, v] of Object.entries(data.variables)) {
          this.log(`    {{${k}}} = ${v}`);
        }
      }
      this.log(`  Steps (${data.steps.length}):`);
      for (const s of data.steps) {
        const desc = s.description ? ` — ${s.description}` : '';
        this.log(`    ${s.index}. ${s.command}${desc}`);
      }
    });
  }
}
