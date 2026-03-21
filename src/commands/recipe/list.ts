import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  readRecipeJSON,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class RecipeList extends BaseCommand {
  static description = 'List all recipes in the project';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(RecipeList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const recipes = (project.recipes ?? []).map((name) => {
      const data = readRecipeJSON(projectPath, name);
      return {
        name: data.name,
        description: data.description,
        steps: data.steps.length,
      };
    });

    const resultData = { recipes };
    const cmdResult = makeResult('recipe:list', {}, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      if (data.recipes.length === 0) {
        this.log('No recipes found.');
        return;
      }
      this.log(`Recipes (${data.recipes.length}):`);
      for (const r of data.recipes) {
        const desc = r.description ? ` — ${r.description}` : '';
        this.log(`  ${r.name} (${r.steps} steps)${desc}`);
      }
    });
  }
}
