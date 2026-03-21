import type { HookName, HookFn, HookContext } from '../types/plugin.js';

export class HookManager {
  private static instance: HookManager | null = null;
  private hooks = new Map<HookName, HookFn[]>();

  static getInstance(): HookManager {
    if (!HookManager.instance) {
      HookManager.instance = new HookManager();
    }
    return HookManager.instance;
  }

  static reset(): void {
    HookManager.instance = null;
  }

  register(hookName: HookName, fn: HookFn): void {
    const existing = this.hooks.get(hookName) || [];
    existing.push(fn);
    this.hooks.set(hookName, existing);
  }

  async execute(hookName: HookName, context: HookContext): Promise<void> {
    const fns = this.hooks.get(hookName) || [];
    for (const fn of fns) {
      try {
        await fn(context);
      } catch (err) {
        // Hook errors are logged but don't break the command
        console.error(`Hook error (${hookName}): ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }

  getRegisteredHooks(): Map<HookName, number> {
    const result = new Map<HookName, number>();
    for (const [name, fns] of this.hooks) {
      result.set(name, fns.length);
    }
    return result;
  }

  clear(): void {
    this.hooks.clear();
  }
}
