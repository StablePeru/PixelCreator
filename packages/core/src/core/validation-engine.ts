import type { SizeRule } from '../types/project.js';
import type {
  FlagCategory,
  FlagRegion,
  FlagSeverity,
  ValidationFlag,
  ValidationFlagsFile,
} from '../types/validation.js';
import { generateSequentialId } from '../utils/id-generator.js';

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

// ---------------------------------------------------------------------------
// Validation flags — human-marked review notes the agent can read via CLI.
// ---------------------------------------------------------------------------

export interface AddFlagInput {
  canvas: string;
  severity: FlagSeverity;
  category: FlagCategory;
  note: string;
  tags?: string[];
  frameIndex?: number;
  layerId?: string;
  region?: FlagRegion;
  now?: number;
}

export function emptyFlagsFile(canvas: string): ValidationFlagsFile {
  return { version: 1, canvas, flags: [] };
}

function nextFlagId(existing: readonly ValidationFlag[]): string {
  let max = 0;
  for (const f of existing) {
    const m = /^flag-(\d+)$/.exec(f.id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return generateSequentialId('flag', max + 1);
}

export function addFlag(file: ValidationFlagsFile, input: AddFlagInput): ValidationFlagsFile {
  if (input.canvas !== file.canvas) {
    throw new Error(
      `Flag canvas "${input.canvas}" does not match flags file canvas "${file.canvas}"`,
    );
  }
  if (!input.note || !input.note.trim()) {
    throw new Error('Flag note is required');
  }
  if (input.region) {
    const { w, h } = input.region;
    if (w <= 0 || h <= 0) {
      throw new Error(`Flag region must have positive width/height (got ${w}x${h})`);
    }
  }

  const flag: ValidationFlag = {
    id: nextFlagId(file.flags),
    canvas: input.canvas,
    severity: input.severity,
    category: input.category,
    note: input.note.trim(),
    tags: [...(input.tags ?? [])],
    createdAt: input.now ?? Date.now(),
    ...(input.frameIndex !== undefined ? { frameIndex: input.frameIndex } : {}),
    ...(input.layerId ? { layerId: input.layerId } : {}),
    ...(input.region ? { region: { ...input.region } } : {}),
  };

  return { ...file, flags: [...file.flags, flag] };
}

export function resolveFlag(
  file: ValidationFlagsFile,
  flagId: string,
  resolution: string,
  now: number = Date.now(),
): ValidationFlagsFile {
  const idx = file.flags.findIndex((f) => f.id === flagId);
  if (idx === -1) throw new Error(`Flag not found: ${flagId}`);
  if (file.flags[idx].resolvedAt !== undefined) {
    throw new Error(`Flag already resolved: ${flagId}`);
  }
  const updated: ValidationFlag = {
    ...file.flags[idx],
    resolvedAt: now,
    resolution: resolution.trim(),
  };
  const flags = file.flags.map((f, i) => (i === idx ? updated : f));
  return { ...file, flags };
}

export function removeFlag(file: ValidationFlagsFile, flagId: string): ValidationFlagsFile {
  const flags = file.flags.filter((f) => f.id !== flagId);
  if (flags.length === file.flags.length) {
    throw new Error(`Flag not found: ${flagId}`);
  }
  return { ...file, flags };
}

export interface ListFlagsFilter {
  openOnly?: boolean;
  severity?: FlagSeverity;
  category?: FlagCategory;
  frameIndex?: number;
  layerId?: string;
}

export function listFlags(
  file: ValidationFlagsFile,
  filter: ListFlagsFilter = {},
): ValidationFlag[] {
  return file.flags.filter((f) => {
    if (filter.openOnly && f.resolvedAt !== undefined) return false;
    if (filter.severity && f.severity !== filter.severity) return false;
    if (filter.category && f.category !== filter.category) return false;
    if (filter.frameIndex !== undefined && f.frameIndex !== filter.frameIndex) return false;
    if (filter.layerId && f.layerId !== filter.layerId) return false;
    return true;
  });
}
