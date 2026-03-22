import type { SizeRule } from '../types/project.js';

export interface SizeViolation {
  canvas: string;
  width: number;
  height: number;
  rule: SizeRule;
  message: string;
}

export function validateSizeRules(
  canvasName: string,
  canvasWidth: number,
  canvasHeight: number,
  rules: SizeRule[],
): SizeViolation[] {
  const violations: SizeViolation[] = [];

  for (const rule of rules) {
    // Pattern matching: '*' matches all, exact string matches that canvas
    if (rule.pattern !== '*' && rule.pattern !== canvasName) continue;

    const base = { canvas: canvasName, width: canvasWidth, height: canvasHeight, rule };

    switch (rule.type) {
      case 'exact':
        if (canvasWidth !== rule.width || canvasHeight !== rule.height) {
          violations.push({
            ...base,
            message: `Canvas "${canvasName}" is ${canvasWidth}x${canvasHeight}, expected exactly ${rule.width}x${rule.height}`,
          });
        }
        break;

      case 'min':
        if (canvasWidth < rule.width! || canvasHeight < rule.height!) {
          violations.push({
            ...base,
            message: `Canvas "${canvasName}" is ${canvasWidth}x${canvasHeight}, minimum is ${rule.width}x${rule.height}`,
          });
        }
        break;

      case 'max':
        if (canvasWidth > rule.width! || canvasHeight > rule.height!) {
          violations.push({
            ...base,
            message: `Canvas "${canvasName}" is ${canvasWidth}x${canvasHeight}, maximum is ${rule.width}x${rule.height}`,
          });
        }
        break;

      case 'multiple-of':
        if (
          canvasWidth % rule.multipleOf!.width !== 0 ||
          canvasHeight % rule.multipleOf!.height !== 0
        ) {
          violations.push({
            ...base,
            message: `Canvas "${canvasName}" is ${canvasWidth}x${canvasHeight}, must be multiple of ${rule.multipleOf!.width}x${rule.multipleOf!.height}`,
          });
        }
        break;
    }
  }

  return violations;
}
