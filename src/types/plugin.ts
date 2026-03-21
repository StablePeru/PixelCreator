export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  pixelcreator: {
    minVersion: string;
  };
  commands?: Record<string, { description: string }>;
  hooks?: Record<string, string>;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  path: string;
  source: 'project' | 'user';
  manifest: PluginManifest;
}

export type HookName = 'pre:command' | 'post:command' | 'on:error';

export interface HookContext {
  command: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
  projectPath?: string;
}

export type HookFn = (context: HookContext) => Promise<void>;
