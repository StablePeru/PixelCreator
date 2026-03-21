import { describe, it, expect } from 'vitest';
import { validateRecipe, resolveRecipeVariables, buildCommandArgs } from '../../src/core/recipe-engine.js';
import type { RecipeData, RecipeStep } from '../../src/types/recipe.js';

function makeRecipe(overrides: Partial<RecipeData> = {}): RecipeData {
  return {
    name: 'test-recipe',
    description: 'A test recipe',
    steps: [],
    variables: {},
    tags: {},
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    ...overrides,
  };
}

describe('recipe-engine', () => {
  describe('validateRecipe', () => {
    it('returns no errors for valid recipe', () => {
      const recipe = makeRecipe({
        steps: [{ command: 'draw:pixel', args: { x: 0, y: 0, color: '#ff0000' } }],
      });
      const errors = validateRecipe(recipe, ['draw:pixel']);
      expect(errors).toEqual([]);
    });

    it('returns error for empty name', () => {
      const recipe = makeRecipe({ name: '' });
      const errors = validateRecipe(recipe, []);
      expect(errors).toContain('Recipe name is required');
    });

    it('returns error for missing step command', () => {
      const recipe = makeRecipe({
        steps: [{ command: '', args: {} }],
      });
      const errors = validateRecipe(recipe, []);
      expect(errors.some((e) => e.includes('command is required'))).toBe(true);
    });

    it('returns error for unknown command', () => {
      const recipe = makeRecipe({
        steps: [{ command: 'unknown:cmd', args: {} }],
      });
      const errors = validateRecipe(recipe, ['draw:pixel']);
      expect(errors.some((e) => e.includes('unknown command'))).toBe(true);
    });

    it('skips command validation when knownCommands is empty', () => {
      const recipe = makeRecipe({
        steps: [{ command: 'any:cmd', args: {} }],
      });
      const errors = validateRecipe(recipe, []);
      expect(errors).toEqual([]);
    });

    it('returns error for undefined variable', () => {
      const recipe = makeRecipe({
        steps: [{ command: 'draw:pixel', args: { color: '{{myColor}}' } }],
        variables: {},
      });
      const errors = validateRecipe(recipe, []);
      expect(errors.some((e) => e.includes('undefined variable'))).toBe(true);
    });

    it('passes when variable is defined', () => {
      const recipe = makeRecipe({
        steps: [{ command: 'draw:pixel', args: { color: '{{myColor}}' } }],
        variables: { myColor: '#ff0000' },
      });
      const errors = validateRecipe(recipe, []);
      expect(errors).toEqual([]);
    });

    it('checks multiple variables in one arg', () => {
      const recipe = makeRecipe({
        steps: [{ command: 'draw:rect', args: { x: '{{startX}}', y: '{{startY}}' } }],
        variables: { startX: '0' },
      });
      const errors = validateRecipe(recipe, []);
      expect(errors.some((e) => e.includes('startY'))).toBe(true);
    });
  });

  describe('resolveRecipeVariables', () => {
    it('replaces variables with defaults', () => {
      const steps: RecipeStep[] = [
        { command: 'draw:pixel', args: { color: '{{color}}', x: 0 } },
      ];
      const result = resolveRecipeVariables(steps, { color: '#ff0000' }, {});
      expect(result[0].args.color).toBe('#ff0000');
      expect(result[0].args.x).toBe(0);
    });

    it('overrides take precedence over defaults', () => {
      const steps: RecipeStep[] = [
        { command: 'draw:pixel', args: { color: '{{color}}' } },
      ];
      const result = resolveRecipeVariables(steps, { color: '#ff0000' }, { color: '#00ff00' });
      expect(result[0].args.color).toBe('#00ff00');
    });

    it('leaves non-string values unchanged', () => {
      const steps: RecipeStep[] = [
        { command: 'draw:rect', args: { x: 5, fill: true } },
      ];
      const result = resolveRecipeVariables(steps, {}, {});
      expect(result[0].args.x).toBe(5);
      expect(result[0].args.fill).toBe(true);
    });

    it('leaves unresolved variables as-is', () => {
      const steps: RecipeStep[] = [
        { command: 'draw:pixel', args: { color: '{{unknown}}' } },
      ];
      const result = resolveRecipeVariables(steps, {}, {});
      expect(result[0].args.color).toBe('{{unknown}}');
    });
  });

  describe('buildCommandArgs', () => {
    it('builds args from step', () => {
      const step: RecipeStep = {
        command: 'draw:pixel',
        args: { x: 0, y: 1, color: '#ff0000' },
      };
      const args = buildCommandArgs(step);
      expect(args[0]).toBe('draw:pixel');
      expect(args).toContain('--x');
      expect(args).toContain('0');
      expect(args).toContain('--color');
      expect(args).toContain('#ff0000');
    });

    it('handles boolean true as flag', () => {
      const step: RecipeStep = {
        command: 'draw:rect',
        args: { fill: true, x: 0 },
      };
      const args = buildCommandArgs(step);
      expect(args).toContain('--fill');
      expect(args).not.toContain('true');
    });

    it('omits boolean false', () => {
      const step: RecipeStep = {
        command: 'draw:rect',
        args: { fill: false },
      };
      const args = buildCommandArgs(step);
      expect(args).not.toContain('--fill');
    });
  });
});
