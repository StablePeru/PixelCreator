import type {
  AssetValidationResult,
  ValidationPaletteIssue,
  ValidationReport,
  ValidationSizeIssue,
} from '../types/index.js';
import {
  listAssetSpecs,
  readAssetSpec,
  readCanvasJSON,
  readLayerFrame,
  readPaletteJSON,
  readProjectJSON,
  readValidationFlags,
} from '../io/project-io.js';
import { analyzePaletteAccessibility } from './accessibility-engine.js';
import { parseAssetSpec, validateAssetSpec } from './asset-engine.js';
import { validateBufferAgainstPalette } from './palette-engine.js';
import { listFlags, validateSizeRules } from './validation-engine.js';

export interface BuildValidationReportOptions {
  /** Only include unresolved manual flags. Default true. */
  openOnly?: boolean;
  /** Include palette-violation aggregation. Requires canvas.palette or paletteOverride. */
  includePalette?: boolean;
  /** Include palette accessibility analysis. Requires canvas.palette or paletteOverride. */
  includeAccessibility?: boolean;
  /** Include asset-spec validation results. */
  includeAsset?: boolean;
  /** Validate against this palette instead of canvas.palette. */
  paletteOverride?: string;
  /** Limit asset validation to this name. Defaults to all assets in the project. */
  assetName?: string;
  /** Override timestamp (for deterministic tests). */
  now?: number;
}

export function buildValidationReport(
  projectPath: string,
  canvasName: string,
  options: BuildValidationReportOptions = {},
): ValidationReport {
  const {
    openOnly = true,
    includePalette = false,
    includeAccessibility = false,
    includeAsset = false,
    paletteOverride,
    assetName,
    now,
  } = options;

  const canvas = readCanvasJSON(projectPath, canvasName);
  const project = readProjectJSON(projectPath);

  const flagsFile = readValidationFlags(projectPath, canvasName);
  const manual = listFlags(flagsFile, { openOnly });

  const sizeViolations = validateSizeRules(
    canvasName,
    canvas.width,
    canvas.height,
    project.validation.sizeRules,
  );
  const size: ValidationSizeIssue[] = sizeViolations.map((v) => ({
    canvas: v.canvas,
    width: v.width,
    height: v.height,
    rule: v.rule.type,
    message: v.message,
  }));

  const automatic: ValidationReport['automatic'] = { size };

  if (includePalette) {
    automatic.palette = collectPaletteIssues(projectPath, canvasName, paletteOverride);
  }

  if (includeAccessibility) {
    const paletteName = paletteOverride ?? canvas.palette ?? undefined;
    if (paletteName) {
      const palette = readPaletteJSON(projectPath, paletteName);
      automatic.accessibility = analyzePaletteAccessibility(palette);
    }
  }

  if (includeAsset) {
    automatic.asset = collectAssetResults(projectPath, assetName);
  }

  return {
    canvas: canvasName,
    generatedAt: now ?? Date.now(),
    manual,
    automatic,
  };
}

function collectPaletteIssues(
  projectPath: string,
  canvasName: string,
  paletteOverride: string | undefined,
): ValidationPaletteIssue[] {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const paletteName = paletteOverride ?? canvas.palette ?? undefined;
  if (!paletteName) return [];

  const palette = readPaletteJSON(projectPath, paletteName);
  const perFrame = new Map<number, { x: number; y: number; color: string }[]>();

  for (const layer of canvas.layers) {
    for (const frame of canvas.frames) {
      const buffer = readLayerFrame(projectPath, canvasName, layer.id, frame.id);
      const violations = validateBufferAgainstPalette(buffer, palette, layer.id, frame.id);
      if (violations.length === 0) continue;
      const bucket = perFrame.get(frame.index) ?? [];
      for (const v of violations) {
        bucket.push({ x: v.x, y: v.y, color: v.color });
      }
      perFrame.set(frame.index, bucket);
    }
  }

  return [...perFrame.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([frameIndex, offenders]) => ({
      canvas: canvasName,
      frame: frameIndex,
      offenders,
      totalPixelsOutOfPalette: offenders.length,
    }));
}

function collectAssetResults(
  projectPath: string,
  assetName: string | undefined,
): AssetValidationResult[] {
  const names = assetName ? [assetName] : listAssetSpecs(projectPath);
  const results: AssetValidationResult[] = [];

  for (const name of names) {
    let raw: unknown;
    try {
      raw = readAssetSpec(projectPath, name);
    } catch (err) {
      results.push({
        valid: false,
        asset: name,
        issues: [
          {
            severity: 'error',
            field: 'spec',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
      });
      continue;
    }

    const { spec, errors: schemaErrors } = parseAssetSpec(raw);
    if (!spec) {
      results.push({
        valid: false,
        asset: name,
        issues: schemaErrors.map((message) => ({
          severity: 'error' as const,
          field: 'schema',
          message,
        })),
      });
      continue;
    }

    results.push(validateAssetSpec(spec, projectPath));
  }

  return results;
}
