import type { RecipeData, RecipeStep } from '../types/recipe.js';

export function validateRecipe(recipe: RecipeData, knownCommands: string[]): string[] {
  const errors: string[] = [];

  if (!recipe.name || recipe.name.trim() === '') {
    errors.push('Recipe name is required');
  }

  if (!Array.isArray(recipe.steps)) {
    errors.push('Recipe steps must be an array');
    return errors;
  }

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    if (!step.command) {
      errors.push(`Step ${i + 1}: command is required`);
      continue;
    }
    if (knownCommands.length > 0 && !knownCommands.includes(step.command)) {
      errors.push(`Step ${i + 1}: unknown command "${step.command}"`);
    }
  }

  // Check that all referenced variables are defined
  const definedVars = new Set(Object.keys(recipe.variables));
  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    for (const [key, value] of Object.entries(step.args)) {
      if (typeof value === 'string') {
        const matches = value.match(/\{\{(\w+)\}\}/g);
        if (matches) {
          for (const match of matches) {
            const varName = match.slice(2, -2);
            if (!definedVars.has(varName)) {
              errors.push(`Step ${i + 1}: undefined variable "{{${varName}}}" in arg "${key}"`);
            }
          }
        }
      }
    }
  }

  return errors;
}

export function resolveRecipeVariables(
  steps: RecipeStep[],
  variables: Record<string, string>,
  overrides: Record<string, string>,
): RecipeStep[] {
  const merged = { ...variables, ...overrides };

  return steps.map((step) => {
    const resolvedArgs: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(step.args)) {
      if (typeof value === 'string') {
        resolvedArgs[key] = value.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
          return merged[varName] ?? `{{${varName}}}`;
        });
      } else {
        resolvedArgs[key] = value;
      }
    }
    return { ...step, args: resolvedArgs };
  });
}

export function buildCommandArgs(step: RecipeStep): string[] {
  const args: string[] = [step.command];
  for (const [key, value] of Object.entries(step.args)) {
    if (typeof value === 'boolean') {
      if (value) {
        args.push(`--${key}`);
      }
    } else {
      args.push(`--${key}`, String(value));
    }
  }
  return args;
}
