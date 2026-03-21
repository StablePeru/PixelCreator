import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  writeProjectJSON,
  deleteRecipeFile,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class RecipeDelete extends BaseCommand {
  static description = 'Delete a recipe';

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
    const { flags } = await this.parse(RecipeDelete);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.recipes || !project.recipes.includes(flags.name)) {
      this.error(`Recipe "${flags.name}" not found.`);
    }

    deleteRecipeFile(projectPath, flags.name);
    project.recipes = project.recipes.filter((r) => r !== flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = { name: flags.name, deleted: true };
    const cmdResult = makeResult('recipe:delete', { name: flags.name }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Recipe "${data.name}" deleted.`);
    });
  }
}
