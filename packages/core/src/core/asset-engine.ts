import { AssetSpecSchema } from '../types/asset.js';
import type {
  AssetSpec,
  AssetValidationIssue,
  AssetValidationResult,
  AssetBuildResult,
  FrameBoundingBox,
  PivotPoint,
  AnimationSpatialMetrics,
  SpatialConsistencyConfig,
} from '../types/asset.js';
import type { CanvasData } from '../types/canvas.js';
import type { GamedevExportOptions, AnimationExport } from '../types/gamedev.js';
import { readCanvasJSON } from '../io/project-io.js';
import {
  exportToGameEngine,
  exportGodotSpriteFrames,
  exportGodotScene,
  generateExportSpritesheet,
} from './gamedev-engine.js';
import { renderFrames } from './frame-renderer.js';
import { colorHistogram } from './color-analysis-engine.js';
import { PixelBuffer, encodePNG } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';

// --- Spatial Analysis ---

/**
 * Compute the bounding box of non-transparent content in a PixelBuffer.
 * Returns null if the frame is completely empty (all pixels transparent).
 */
export function computeFrameBoundingBox(buffer: PixelBuffer): FrameBoundingBox | null {
  let minX = buffer.width;
  let minY = buffer.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const idx = (y * buffer.width + x) * 4;
      if (buffer.data[idx + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
    width,
    height,
  };
}

/**
 * Validate spatial consistency of frames within each animation.
 * Checks:
 * 1. Empty frames (if requireAllFramesFilled is true)
 * 2. Frame drift (if maxFrameDrift is set) — center-of-bbox displacement between consecutive frames
 */
export function validateSpatialConsistency(
  spec: AssetSpec,
  projectPath: string,
  canvas: CanvasData,
): AssetValidationIssue[] {
  const issues: AssetValidationIssue[] = [];

  const checkEmpty = spec.constraints.requireAllFramesFilled;
  const maxDrift = spec.constraints.maxFrameDrift;

  if (!checkEmpty && maxDrift === undefined) return issues;

  // Render all frames once
  const allFrameIndices = canvas.frames.map((_, i) => i);
  const renderedFrames = renderFrames(projectPath, spec.canvas, canvas, allFrameIndices, 1);

  // Compute bounding boxes for all frames
  const boundingBoxes: Array<FrameBoundingBox | null> = renderedFrames.map(computeFrameBoundingBox);

  for (const anim of spec.animations) {
    const end = Math.min(anim.to, canvas.frames.length - 1);
    let prevBox: FrameBoundingBox | null | undefined;

    for (let i = anim.from; i <= end; i++) {
      const box = boundingBoxes[i];

      // Check empty frame
      if (checkEmpty && box === null) {
        issues.push({
          severity: 'error',
          field: `spatial.${anim.name}`,
          message: `Frame ${i} in animation "${anim.name}" is empty (no opaque pixels)`,
        });
        prevBox = box;
        continue;
      }

      // Check drift between consecutive frames
      if (maxDrift !== undefined && prevBox !== undefined && prevBox !== null && box !== null) {
        const dx = Math.abs(box.centerX - prevBox.centerX);
        const dy = Math.abs(box.centerY - prevBox.centerY);
        const drift = Math.max(dx, dy);

        if (drift > maxDrift) {
          issues.push({
            severity: 'error',
            field: `spatial.${anim.name}`,
            message: `Frame ${i} in animation "${anim.name}" drifts ${drift.toFixed(1)}px from frame ${i - 1} (max: ${maxDrift}px, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`,
          });
        }
      }

      prevBox = box;
    }
  }

  return issues;
}

// --- Cross-Animation Spatial Consistency ---

const SPATIAL_DEFAULTS: Required<SpatialConsistencyConfig> = {
  enabled: true,
  baselineTolerance: 2,
  horizontalTolerance: 2,
  topExtentRatio: 2.0,
  lateralExtentRatio: 2.0,
};

/**
 * Compute aggregate bounding box (union) across all non-empty frames of an animation.
 * Returns null if all frames are empty.
 */
function computeAggregateBbox(
  boundingBoxes: Array<FrameBoundingBox | null>,
  from: number,
  to: number,
): FrameBoundingBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = from; i <= to; i++) {
    const box = boundingBoxes[i];
    if (box === null) continue;
    if (box.minX < minX) minX = box.minX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  if (maxX === -Infinity) return null;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
    width,
    height,
  };
}

/**
 * Compute spatial metrics for an animation relative to its effective pivot.
 * Returns null if the animation has no non-empty frames or no pivot.
 */
export function computeAnimationSpatialMetrics(
  animationName: string,
  aggregateBbox: FrameBoundingBox,
  pivot: PivotPoint,
): AnimationSpatialMetrics {
  return {
    animationName,
    aggregateBbox,
    baselineOffset: aggregateBbox.maxY - pivot.y,
    topExtent: pivot.y - aggregateBbox.minY,
    leftExtent: pivot.x - aggregateBbox.minX,
    rightExtent: aggregateBbox.maxX - pivot.x,
    centerOffsetX: aggregateBbox.centerX - pivot.x,
  };
}

/**
 * Validate cross-animation spatial consistency.
 * Compares aggregate bounding boxes of all animations relative to their pivots.
 *
 * Requires a pivot to be defined (asset-level or per-animation).
 * Animations without a resolvable pivot are skipped.
 *
 * Checks:
 * 1. Baseline consistency — footline relative to pivot must be stable across animations (error)
 * 2. Horizontal centering — center-of-mass offset from pivot must be stable (error)
 * 3. Top extent ratio — height above pivot should not vary wildly (warning, allows jumps)
 * 4. Lateral extent ratio — width from pivot should not vary wildly (warning, allows attacks)
 */
export function validateCrossAnimationConsistency(
  spec: AssetSpec,
  projectPath: string,
  canvas: CanvasData,
): AssetValidationIssue[] {
  const issues: AssetValidationIssue[] = [];

  // Resolve config
  const config = { ...SPATIAL_DEFAULTS, ...spec.constraints.spatialConsistency };
  if (!config.enabled) return issues;

  // Need at least 2 animations to compare
  if (spec.animations.length < 2) return issues;

  // Need a pivot defined somewhere
  const hasPivot = spec.pivot || spec.animations.some((a) => a.pivot);
  if (!hasPivot) return issues;

  // Render all frames and compute per-frame bboxes
  const allFrameIndices = canvas.frames.map((_, i) => i);
  const renderedFrames = renderFrames(projectPath, spec.canvas, canvas, allFrameIndices, 1);
  const boundingBoxes = renderedFrames.map(computeFrameBoundingBox);

  // Compute per-animation metrics
  const allMetrics: AnimationSpatialMetrics[] = [];

  for (const anim of spec.animations) {
    const end = Math.min(anim.to, canvas.frames.length - 1);
    const aggBbox = computeAggregateBbox(boundingBoxes, anim.from, end);
    if (aggBbox === null) continue; // all frames empty — caught elsewhere

    const pivot = resolveAnimationPivot(spec, anim.name);
    if (!pivot) continue; // no pivot for this animation — skip

    allMetrics.push(computeAnimationSpatialMetrics(anim.name, aggBbox, pivot));
  }

  // Need at least 2 animations with metrics to compare
  if (allMetrics.length < 2) return issues;

  // Extract ranges
  const baselines = allMetrics.map((m) => m.baselineOffset);
  const centerOffsets = allMetrics.map((m) => m.centerOffsetX);
  const topExtents = allMetrics.map((m) => m.topExtent);
  const lateralExtents = allMetrics.map((m) => Math.max(m.leftExtent, m.rightExtent));

  const baselineRange = Math.max(...baselines) - Math.min(...baselines);
  const centerRange = Math.max(...centerOffsets) - Math.min(...centerOffsets);

  // 1. Baseline consistency (error)
  if (baselineRange > config.baselineTolerance) {
    const worst = allMetrics.reduce((a, b) =>
      Math.abs(b.baselineOffset - baselines[0]) > Math.abs(a.baselineOffset - baselines[0]) ? b : a,
    );
    const reference = allMetrics[0];
    issues.push({
      severity: 'error',
      field: 'crossAnimation.baseline',
      message: `Baseline inconsistency: "${worst.animationName}" has baselineOffset=${worst.baselineOffset}px vs "${reference.animationName}" baselineOffset=${reference.baselineOffset}px (diff=${baselineRange}px, tolerance=${config.baselineTolerance}px)`,
    });
  }

  // 2. Horizontal centering (error)
  if (centerRange > config.horizontalTolerance) {
    const worst = allMetrics.reduce((a, b) =>
      Math.abs(b.centerOffsetX - centerOffsets[0]) > Math.abs(a.centerOffsetX - centerOffsets[0])
        ? b
        : a,
    );
    const reference = allMetrics[0];
    issues.push({
      severity: 'error',
      field: 'crossAnimation.horizontal',
      message: `Horizontal shift: "${worst.animationName}" has centerOffsetX=${worst.centerOffsetX.toFixed(1)}px vs "${reference.animationName}" centerOffsetX=${reference.centerOffsetX.toFixed(1)}px (diff=${centerRange.toFixed(1)}px, tolerance=${config.horizontalTolerance}px)`,
    });
  }

  // 3. Top extent ratio (warning) — allows jumps/crouches
  const minTop = Math.min(...topExtents);
  const maxTop = Math.max(...topExtents);
  if (minTop > 0 && maxTop / minTop > config.topExtentRatio) {
    const tallest = allMetrics.reduce((a, b) => (b.topExtent > a.topExtent ? b : a));
    const shortest = allMetrics.reduce((a, b) => (b.topExtent < a.topExtent ? b : a));
    issues.push({
      severity: 'warning',
      field: 'crossAnimation.topExtent',
      message: `Top extent varies ${(maxTop / minTop).toFixed(1)}x: "${tallest.animationName}" topExtent=${tallest.topExtent}px vs "${shortest.animationName}" topExtent=${shortest.topExtent}px (ratio limit=${config.topExtentRatio}x)`,
    });
  }

  // 4. Lateral extent ratio (warning) — allows attack swings
  const minLateral = Math.min(...lateralExtents);
  const maxLateral = Math.max(...lateralExtents);
  if (minLateral > 0 && maxLateral / minLateral > config.lateralExtentRatio) {
    const widest = allMetrics.reduce((a, b) =>
      Math.max(b.leftExtent, b.rightExtent) > Math.max(a.leftExtent, a.rightExtent) ? b : a,
    );
    const narrowest = allMetrics.reduce((a, b) =>
      Math.max(b.leftExtent, b.rightExtent) < Math.max(a.leftExtent, a.rightExtent) ? b : a,
    );
    issues.push({
      severity: 'warning',
      field: 'crossAnimation.lateralExtent',
      message: `Lateral extent varies ${(maxLateral / minLateral).toFixed(1)}x: "${widest.animationName}" maxLateral=${Math.max(widest.leftExtent, widest.rightExtent)}px vs "${narrowest.animationName}" maxLateral=${Math.max(narrowest.leftExtent, narrowest.rightExtent)}px (ratio limit=${config.lateralExtentRatio}x)`,
    });
  }

  return issues;
}

// --- Pivot Resolution & Validation ---

/**
 * Resolve the effective pivot for an animation.
 * Animation-level pivot overrides asset-level pivot.
 * Returns undefined if neither is set.
 */
export function resolveAnimationPivot(
  spec: AssetSpec,
  animationName: string,
): PivotPoint | undefined {
  const anim = spec.animations.find((a) => a.name === animationName);
  return anim?.pivot ?? spec.pivot;
}

/**
 * Validate pivot points declared in the spec.
 * Checks:
 * 1. Bounds: pivot must be within frame dimensions
 * 2. Content coverage: warns if pivot falls outside the content bbox of any frame
 */
export function validatePivot(
  spec: AssetSpec,
  projectPath: string,
  canvas: CanvasData,
): AssetValidationIssue[] {
  const issues: AssetValidationIssue[] = [];
  const { width, height } = spec.frameSize;

  // Collect all pivots to validate bounds
  const pivotsToCheck: Array<{ pivot: PivotPoint; field: string }> = [];

  if (spec.pivot) {
    pivotsToCheck.push({ pivot: spec.pivot, field: 'pivot' });
  }
  for (const anim of spec.animations) {
    if (anim.pivot) {
      pivotsToCheck.push({ pivot: anim.pivot, field: `animations.${anim.name}.pivot` });
    }
  }

  // No pivots declared — nothing to validate
  if (pivotsToCheck.length === 0) return issues;

  // 1. Bounds check (error)
  for (const { pivot, field } of pivotsToCheck) {
    if (pivot.x >= width || pivot.y >= height) {
      issues.push({
        severity: 'error',
        field,
        message: `Pivot (${pivot.x}, ${pivot.y}) is outside frame bounds ${width}x${height}`,
      });
    }
  }

  // If any pivot is out of bounds, skip content coverage (frames won't be meaningful)
  if (issues.some((i) => i.severity === 'error')) return issues;

  // 2. Content coverage check (warning) — pivot outside content bbox
  const allFrameIndices = canvas.frames.map((_, i) => i);
  const renderedFrames = renderFrames(projectPath, spec.canvas, canvas, allFrameIndices, 1);
  const boundingBoxes = renderedFrames.map(computeFrameBoundingBox);

  for (const anim of spec.animations) {
    const effectivePivot = resolveAnimationPivot(spec, anim.name);
    if (!effectivePivot) continue;

    const end = Math.min(anim.to, canvas.frames.length - 1);
    for (let i = anim.from; i <= end; i++) {
      const box = boundingBoxes[i];
      if (box === null) continue; // empty frame is caught by spatial validation

      const insideX = effectivePivot.x >= box.minX && effectivePivot.x <= box.maxX;
      const insideY = effectivePivot.y >= box.minY && effectivePivot.y <= box.maxY;

      if (!insideX || !insideY) {
        issues.push({
          severity: 'warning',
          field: `pivot.${anim.name}`,
          message: `Pivot (${effectivePivot.x}, ${effectivePivot.y}) is outside content bbox of frame ${i} in "${anim.name}" (bbox: ${box.minX},${box.minY}→${box.maxX},${box.maxY})`,
        });
      }
    }
  }

  return issues;
}

// --- Schema Validation ---

export function parseAssetSpec(raw: unknown): { spec: AssetSpec | null; errors: string[] } {
  const result = AssetSpecSchema.safeParse(raw);
  if (result.success) {
    return { spec: result.data, errors: [] };
  }
  const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  return { spec: null, errors };
}

// --- Pixel-Level Color Counting ---

/**
 * Count unique non-transparent colors across all frames of a canvas.
 * Colors are identified by their full RGBA hex value (alpha=0 pixels are ignored).
 * Returns a Map of hex → RGBA for all unique colors found.
 */
export function countAssetColors(
  projectPath: string,
  canvasName: string,
  canvas: CanvasData,
): Map<string, RGBA> {
  const allColors = new Map<string, RGBA>();
  const frameIndices = canvas.frames.map((_, i) => i);

  if (frameIndices.length === 0) {
    return allColors;
  }

  const renderedFrames = renderFrames(projectPath, canvasName, canvas, frameIndices, 1);

  for (const buffer of renderedFrames) {
    const histogram = colorHistogram(buffer);
    for (const [hex, entry] of histogram) {
      if (!allColors.has(hex)) {
        allColors.set(hex, entry.color);
      }
    }
  }

  return allColors;
}

// --- Project-Level Validation ---

export function validateAssetSpec(spec: AssetSpec, projectPath: string): AssetValidationResult {
  const issues: AssetValidationIssue[] = [];

  // 1. Check canvas exists
  let canvas: CanvasData | null = null;
  try {
    canvas = readCanvasJSON(projectPath, spec.canvas);
  } catch {
    issues.push({
      severity: 'error',
      field: 'canvas',
      message: `Canvas "${spec.canvas}" not found in project`,
    });
    return { valid: false, asset: spec.name, issues };
  }

  // 2. Validate frame size matches canvas
  if (canvas.width !== spec.frameSize.width || canvas.height !== spec.frameSize.height) {
    issues.push({
      severity: 'error',
      field: 'frameSize',
      message: `frameSize ${spec.frameSize.width}x${spec.frameSize.height} does not match canvas ${canvas.width}x${canvas.height}`,
    });
  }

  // 3. Validate frameSizeMultipleOf constraint
  if (spec.constraints.frameSizeMultipleOf) {
    const m = spec.constraints.frameSizeMultipleOf;
    if (spec.frameSize.width % m !== 0 || spec.frameSize.height % m !== 0) {
      issues.push({
        severity: 'error',
        field: 'constraints.frameSizeMultipleOf',
        message: `Frame size ${spec.frameSize.width}x${spec.frameSize.height} is not a multiple of ${m}`,
      });
    }
  }

  // 4. Validate animations
  const totalFrames = canvas.frames.length;

  if (totalFrames === 0) {
    issues.push({
      severity: 'error',
      field: 'canvas',
      message: `Canvas "${spec.canvas}" has no frames`,
    });
    return { valid: issues.every((i) => i.severity !== 'error'), asset: spec.name, issues };
  }

  for (const anim of spec.animations) {
    // from/to range check
    if (anim.from > anim.to) {
      issues.push({
        severity: 'error',
        field: `animations.${anim.name}`,
        message: `Animation "${anim.name}" has from (${anim.from}) > to (${anim.to})`,
      });
    }

    if (anim.to >= totalFrames) {
      issues.push({
        severity: 'error',
        field: `animations.${anim.name}`,
        message: `Animation "${anim.name}" references frame ${anim.to} but canvas only has ${totalFrames} frames (0-${totalFrames - 1})`,
      });
    }
  }

  // 5. Check animation overlap
  const frameCoverage = new Array<string | null>(totalFrames).fill(null);
  for (const anim of spec.animations) {
    const end = Math.min(anim.to, totalFrames - 1);
    for (let i = anim.from; i <= end; i++) {
      if (frameCoverage[i] !== null) {
        issues.push({
          severity: 'error',
          field: `animations.${anim.name}`,
          message: `Frame ${i} is claimed by both "${frameCoverage[i]}" and "${anim.name}"`,
        });
      } else {
        frameCoverage[i] = anim.name;
      }
    }
  }

  // 6. Check for uncovered frames (warning, not error)
  const uncovered = frameCoverage
    .map((name, idx) => (name === null ? idx : -1))
    .filter((idx) => idx >= 0);
  if (uncovered.length > 0) {
    issues.push({
      severity: 'warning',
      field: 'animations',
      message: `Frames not assigned to any animation: ${uncovered.join(', ')}`,
    });
  }

  // 7. maxColors constraint — real pixel-level enforcement
  if (spec.constraints.maxColors) {
    const uniqueColors = countAssetColors(projectPath, spec.canvas, canvas);
    const colorCount = uniqueColors.size;
    const limit = spec.constraints.maxColors;

    if (colorCount > limit) {
      issues.push({
        severity: 'error',
        field: 'constraints.maxColors',
        message: `Asset uses ${colorCount} unique colors but maxColors is ${limit} (excess: ${colorCount - limit})`,
      });
    }
  }

  // 8. Spatial consistency — empty frames + frame drift
  const spatialIssues = validateSpatialConsistency(spec, projectPath, canvas);
  issues.push(...spatialIssues);

  // 9. Pivot validation — bounds + content coverage
  const pivotIssues = validatePivot(spec, projectPath, canvas);
  issues.push(...pivotIssues);

  // 10. Cross-animation spatial consistency — baseline, centering, extents
  const crossAnimIssues = validateCrossAnimationConsistency(spec, projectPath, canvas);
  issues.push(...crossAnimIssues);

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { valid: !hasErrors, asset: spec.name, issues };
}

// --- Pivot Export Injection ---

/**
 * Post-process engine export files to include pivot metadata.
 * Modifies JSON-based export files in-place.
 *
 * Unity: normalizes pivot to [0,1] range (Y-up convention: y = 1 - py/height)
 * Godot: adds offset property in pixel coordinates to .tscn
 * Generic: adds pivot map keyed by animation name
 */
function injectPivotIntoExportFiles(
  spec: AssetSpec,
  files: Array<{ name: string; content: string | Buffer }>,
): void {
  const { width, height } = spec.frameSize;

  for (const file of files) {
    if (typeof file.content !== 'string') continue;

    // Unity sprite JSON — patch pivot per sprite
    if (file.name.endsWith('_sprite.json')) {
      try {
        const data = JSON.parse(file.content);
        if (data.sprites && Array.isArray(data.sprites)) {
          for (const sprite of data.sprites) {
            // Find which animation this sprite belongs to
            const anim = spec.animations.find((a) => {
              const animSprites = data.animations?.find(
                (an: { name: string; sprites: string[] }) => an.name === a.name,
              );
              return animSprites?.sprites?.includes(sprite.name);
            });
            const pivot = anim?.pivot ?? spec.pivot;
            if (pivot) {
              sprite.pivot = {
                x: pivot.x / width,
                y: 1 - pivot.y / height,
              };
            }
          }
        }
        file.content = JSON.stringify(data, null, 2);
      } catch {
        // Non-JSON or malformed — skip silently
      }
    }

    // Godot .tscn — add offset to AnimatedSprite2D node
    if (file.name.endsWith('.tscn') && spec.pivot) {
      const offsetX = spec.pivot.x - Math.floor(width / 2);
      const offsetY = spec.pivot.y - Math.floor(height / 2);
      if (offsetX !== 0 || offsetY !== 0) {
        // Match both old format (animation = "name") and new StringName format (animation = &"name")
        file.content = file.content.replace(
          /animation = &?"([^"]+)"/,
          `offset = Vector2(${offsetX}, ${offsetY})\nanimation = &"$1"`,
        );
      }
    }

    // Generic metadata JSON — add pivot section
    if (file.name.endsWith('_metadata.json')) {
      try {
        const data = JSON.parse(file.content);
        const pivotMap: Record<string, { x: number; y: number }> = {};
        if (spec.pivot) {
          pivotMap['_default'] = { ...spec.pivot };
        }
        for (const anim of spec.animations) {
          const effective = anim.pivot ?? spec.pivot;
          if (effective) {
            pivotMap[anim.name] = { ...effective };
          }
        }
        if (Object.keys(pivotMap).length > 0) {
          data.pivot = pivotMap;
        }
        file.content = JSON.stringify(data, null, 2);
      } catch {
        // Non-JSON — skip silently
      }
    }
  }
}

// --- Direction Transform ---

/**
 * Transform a frame sequence according to the animation direction.
 * - forward: original order
 * - reverse: reversed order
 * - pingpong: forward + mirrored tail without duplicating endpoints
 *   e.g. 4 frames [0,1,2,3] → [0,1,2,3,2,1] (6 frames)
 *   2 frames [0,1] → [0,1] (no mirror needed)
 *   1 frame [0] → [0]
 */
export function applyDirectionToFrames<T>(frames: T[], direction: string): T[] {
  if (direction === 'reverse') {
    return [...frames].reverse();
  }
  if (direction === 'pingpong' && frames.length > 2) {
    const mirror = frames.slice(1, -1).reverse();
    return [...frames, ...mirror];
  }
  return frames;
}

/**
 * Compute the expected frame count after direction transformation.
 */
export function expectedFrameCountForDirection(baseFrameCount: number, direction: string): number {
  if (direction === 'pingpong' && baseFrameCount > 2) {
    return 2 * baseFrameCount - 2;
  }
  return baseFrameCount;
}

// --- Godot Spec-First Build ---

/**
 * Build Godot export files directly from the asset spec.
 * The spec is the single source of truth for animation names, fps, loop,
 * direction, frame ranges, and pivot. No intermediate generation + override.
 */
function buildGodotFilesFromSpec(
  spec: AssetSpec,
  projectPath: string,
): Array<{ name: string; content: string | Buffer }> {
  const scale = spec.export.scale;
  const fw = spec.frameSize.width * scale;
  const fh = spec.frameSize.height * scale;
  const sheetFilename = `${spec.canvas}_sheet.png`;
  const tresName = `${spec.canvas}.tres`;

  // 1. Generate spritesheet PNG (only dependency on canvas pixel data)
  const { buffer } = generateExportSpritesheet(projectPath, spec.canvas, scale);
  const files: Array<{ name: string; content: string | Buffer }> = [
    { name: sheetFilename, content: Buffer.from(encodePNG(buffer)) },
  ];

  // 2. Build AnimationExport[] directly from spec (no canvas tags involved)
  const animations: AnimationExport[] = spec.animations.map((anim) => {
    const frameCount = anim.to - anim.from + 1;
    const baseFrames = Array.from({ length: frameCount }, (_, i) => ({
      name: `frame_${anim.from + i}`,
      x: (anim.from + i) * fw,
      y: 0,
      width: fw,
      height: fh,
      duration: 1000 / anim.fps,
    }));
    const frames = applyDirectionToFrames(baseFrames, anim.direction);
    return {
      name: anim.name,
      frames,
      direction: anim.direction,
      loop: anim.loop,
      fps: anim.fps,
    };
  });

  // 3. Generate .tres directly from spec-driven animations
  files.push({
    name: tresName,
    content: exportGodotSpriteFrames(sheetFilename, animations),
  });

  // 4. Generate .tscn with pivot offset built-in (no regex post-processing)
  const firstAnim = spec.animations.length > 0 ? spec.animations[0].name : undefined;
  let pivotOffset: { x: number; y: number } | undefined;
  if (spec.pivot) {
    const ox = spec.pivot.x - Math.floor(fw / 2);
    const oy = spec.pivot.y - Math.floor(fh / 2);
    pivotOffset = { x: ox, y: oy };
  }
  files.push({
    name: `${spec.canvas}.tscn`,
    content: exportGodotScene(spec.canvas, sheetFilename, tresName, firstAnim, pivotOffset),
  });

  return files;
}

// --- Build Pipeline ---

export function buildAsset(
  spec: AssetSpec,
  projectPath: string,
  outputDir: string,
): AssetBuildResult {
  // Step 1: Validate
  const validation = validateAssetSpec(spec, projectPath);
  if (!validation.valid) {
    return { asset: spec.name, files: [], validation };
  }

  let files: Array<{ name: string; content: string | Buffer }>;

  if (spec.export.engine === 'godot') {
    // Godot: spec-first path — spec is the single source of truth
    files = buildGodotFilesFromSpec(spec, projectPath);
  } else {
    // Unity/Generic: existing gamedev-engine path + pivot injection
    const options: GamedevExportOptions = {
      engine: spec.export.engine,
      canvas: spec.canvas,
      includeAnimations: true,
      includeTileset: false,
      scale: spec.export.scale,
      outputDir,
    };
    files = exportToGameEngine(projectPath, options).files;

    if (spec.pivot || spec.animations.some((a) => a.pivot)) {
      injectPivotIntoExportFiles(spec, files);
    }
  }

  // Add asset spec to output for reproducibility
  files.push({
    name: `${spec.name}.asset.json`,
    content: JSON.stringify(spec, null, 2),
  });

  return { asset: spec.name, files, validation };
}

// --- Scaffold ---

export function scaffoldAssetSpec(name: string, canvas: CanvasData): AssetSpec {
  // Build animation list from existing tags, or a single "idle" default
  const animations =
    canvas.animationTags.length > 0
      ? canvas.animationTags.map((tag) => ({
          name: tag.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
          from: tag.from,
          to: tag.to,
          fps: Math.round(1000 / (canvas.frames[tag.from]?.duration || 100)),
          direction: tag.direction,
          loop: tag.repeat === 0,
        }))
      : [
          {
            name: 'idle',
            from: 0,
            to: Math.max(0, canvas.frames.length - 1),
            fps: 10,
            direction: 'forward' as const,
            loop: true,
          },
        ];

  return {
    name,
    type: 'character-spritesheet',
    canvas: canvas.name,
    frameSize: { width: canvas.width, height: canvas.height },
    pivot: { x: Math.floor(canvas.width / 2), y: canvas.height - 1 },
    animations,
    export: {
      engine: 'generic',
      scale: 1,
      layout: 'horizontal',
      padding: 0,
    },
    constraints: {
      requireAllFramesFilled: true,
    },
  };
}
