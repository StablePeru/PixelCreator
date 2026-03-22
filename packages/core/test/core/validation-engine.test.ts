import { describe, it, expect } from 'vitest';
import { validateSizeRules } from '../../src/core/validation-engine.js';
import type { SizeRule } from '../../src/types/project.js';

describe('validateSizeRules', () => {
  it('exact rule passes when dimensions match', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'exact', width: 16, height: 16 }];
    const violations = validateSizeRules('sprite', 16, 16, rules);
    expect(violations).toHaveLength(0);
  });

  it('exact rule fails when dimensions differ', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'exact', width: 16, height: 16 }];
    const violations = validateSizeRules('sprite', 32, 16, rules);
    expect(violations).toHaveLength(1);
    expect(violations[0].canvas).toBe('sprite');
  });

  it('min rule passes when dimensions meet minimum', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'min', width: 8, height: 8 }];
    expect(validateSizeRules('sprite', 16, 16, rules)).toHaveLength(0);
    expect(validateSizeRules('sprite', 8, 8, rules)).toHaveLength(0);
  });

  it('min rule fails when dimensions are below', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'min', width: 8, height: 8 }];
    const violations = validateSizeRules('sprite', 4, 16, rules);
    expect(violations).toHaveLength(1);
  });

  it('max rule works', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'max', width: 64, height: 64 }];
    expect(validateSizeRules('sprite', 32, 32, rules)).toHaveLength(0);
    expect(validateSizeRules('sprite', 128, 32, rules)).toHaveLength(1);
  });

  it('multiple-of rule works', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'multiple-of', multipleOf: { width: 8, height: 8 } }];
    expect(validateSizeRules('sprite', 16, 24, rules)).toHaveLength(0);
    expect(validateSizeRules('sprite', 15, 24, rules)).toHaveLength(1);
  });

  it('pattern matching filters canvases', () => {
    const rules: SizeRule[] = [{ pattern: 'hero', type: 'exact', width: 16, height: 16 }];
    // Rule targets 'hero', canvas is 'enemy' → should not apply
    expect(validateSizeRules('enemy', 32, 32, rules)).toHaveLength(0);
    // Rule targets 'hero', canvas is 'hero' → should apply
    expect(validateSizeRules('hero', 32, 32, rules)).toHaveLength(1);
  });

  it('wildcard matches all canvases', () => {
    const rules: SizeRule[] = [{ pattern: '*', type: 'exact', width: 8, height: 8 }];
    expect(validateSizeRules('anything', 16, 16, rules)).toHaveLength(1);
  });
});
