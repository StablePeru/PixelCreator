import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, writeRecipeJSON, formatOutput, makeResult } from '@pixelcreator/core';
import type { RecipeData } from '@pixelcreator/core';

export default class RecipeCreate extends BaseCommand {
  static description = 'Create a new recipe';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Recipe name',
      required: true,
    }),
    description: Flags.string({
      description: 'Recipe description',
      default: '',
    }),
    'from-file': Flags.string({
      description: 'JSON file with recipe steps',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(RecipeCreate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.recipes && project.recipes.includes(flags.name)) {
      this.error(`Recipe "${flags.name}" already exists.`);
    }

    const now = new Date().toISOString();
    let steps: RecipeData['steps'] = [];
    let source = 'empty';

    if (flags['from-file']) {
      const filePath = path.resolve(flags['from-file']);
      if (!fs.existsSync(filePath)) {
        this.error(`File not found: ${filePath}`);
      }
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(content)) {
        steps = content;
      } else if (content.steps && Array.isArray(content.steps)) {
        steps = content.steps;
      } else {
        this.error('File must contain a JSON array of steps or an object with a "steps" array.');
      }
      source = filePath;
    }

    const recipe: RecipeData = {
      name: flags.name,
      description: flags.description ?? '',
      steps,
      variables: {},
      tags: {},
      created: now,
      modified: now,
    };

    writeRecipeJSON(projectPath, recipe);
    if (!project.recipes) project.recipes = [];
    project.recipes.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      steps: steps.length,
      source,
    };

    const cmdResult = makeResult('recipe:create', {
      name: flags.name, description: flags.description, 'from-file': flags['from-file'],
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Recipe "${data.name}" created (${data.steps} steps, source: ${data.source})`);
    });
  }
}
