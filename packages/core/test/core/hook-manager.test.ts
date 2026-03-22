import { describe, it, expect, beforeEach } from 'vitest';
import { HookManager } from '../../src/core/hook-manager.js';

describe('HookManager', () => {
  beforeEach(() => {
    HookManager.reset();
  });

  it('is a singleton', () => {
    const a = HookManager.getInstance();
    const b = HookManager.getInstance();
    expect(a).toBe(b);
  });

  it('registers and executes hooks', async () => {
    const hm = HookManager.getInstance();
    let called = false;
    hm.register('pre:command', async () => { called = true; });
    await hm.execute('pre:command', { command: 'test' });
    expect(called).toBe(true);
  });

  it('executes multiple hooks in order', async () => {
    const hm = HookManager.getInstance();
    const order: number[] = [];
    hm.register('post:command', async () => { order.push(1); });
    hm.register('post:command', async () => { order.push(2); });
    await hm.execute('post:command', { command: 'test' });
    expect(order).toEqual([1, 2]);
  });

  it('passes context to hooks', async () => {
    const hm = HookManager.getInstance();
    let receivedCmd = '';
    hm.register('pre:command', async (ctx) => { receivedCmd = ctx.command; });
    await hm.execute('pre:command', { command: 'draw:pixel' });
    expect(receivedCmd).toBe('draw:pixel');
  });

  it('hook errors do not break execution', async () => {
    const hm = HookManager.getInstance();
    let secondCalled = false;
    hm.register('pre:command', async () => { throw new Error('fail'); });
    hm.register('pre:command', async () => { secondCalled = true; });
    await hm.execute('pre:command', { command: 'test' });
    expect(secondCalled).toBe(true);
  });

  it('getRegisteredHooks returns counts', () => {
    const hm = HookManager.getInstance();
    hm.register('pre:command', async () => {});
    hm.register('pre:command', async () => {});
    hm.register('post:command', async () => {});
    const hooks = hm.getRegisteredHooks();
    expect(hooks.get('pre:command')).toBe(2);
    expect(hooks.get('post:command')).toBe(1);
  });

  it('clear removes all hooks', () => {
    const hm = HookManager.getInstance();
    hm.register('pre:command', async () => {});
    hm.clear();
    expect(hm.getRegisteredHooks().size).toBe(0);
  });

  it('executing unregistered hook does nothing', async () => {
    const hm = HookManager.getInstance();
    await hm.execute('on:error', { command: 'test' });
    // Should not throw
  });
});
