import { describe, it, expect, vi } from 'vitest';
import { formatOutput, makeResult, makeErrorResult } from '../../src/utils/output-formatter.js';

describe('makeResult', () => {
  it('creates a success result', () => {
    const start = Date.now();
    const result = makeResult('test:cmd', { foo: 'bar' }, { data: 1 }, start);
    expect(result.success).toBe(true);
    expect(result.command).toBe('test:cmd');
    expect(result.args).toEqual({ foo: 'bar' });
    expect(result.result).toEqual({ data: 1 });
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('makeErrorResult', () => {
  it('creates an error result', () => {
    const start = Date.now();
    const result = makeErrorResult('test:cmd', {}, 'something failed', start);
    expect(result.success).toBe(false);
    expect(result.result.error).toBe('something failed');
  });
});

describe('formatOutput', () => {
  it('outputs JSON for json format', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = makeResult('test', {}, { val: 42 }, Date.now());
    formatOutput('json', result, () => {});
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.result.val).toBe(42);
    spy.mockRestore();
  });

  it('calls textFn for text format', () => {
    const fn = vi.fn();
    const result = makeResult('test', {}, { val: 42 }, Date.now());
    formatOutput('text', result, fn);
    expect(fn).toHaveBeenCalledWith({ val: 42 });
  });

  it('does nothing for silent format', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fn = vi.fn();
    const result = makeResult('test', {}, { val: 42 }, Date.now());
    formatOutput('silent', result, fn);
    expect(spy).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
