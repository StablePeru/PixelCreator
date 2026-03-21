export interface RecipeStep {
  command: string;
  args: Record<string, string | number | boolean>;
  description?: string;
  continueOnError?: boolean;
}

export interface RecipeData {
  name: string;
  description: string;
  steps: RecipeStep[];
  variables: Record<string, string>;
  tags: Record<string, string[]>;
  created: string;
  modified: string;
}
