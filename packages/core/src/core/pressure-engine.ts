import type { PressureCurve, PressureSensitivityConfig } from '../types/brush.js';
import type { Point } from '../types/common.js';

export function applyPressureCurve(raw: number, curve: PressureCurve): number {
  const clamped = Math.max(0, Math.min(1, raw));
  switch (curve) {
    case 'linear':
      return clamped;
    case 'soft':
      return Math.sqrt(clamped);
    case 'hard':
      return clamped * clamped;
    default:
      return clamped;
  }
}

export function pressureToSize(
  pressure: number,
  baseSize: number,
  config: PressureSensitivityConfig,
): number {
  if (!config.enabled) return baseSize;
  const adjusted = applyPressureCurve(pressure, config.curve);
  const minSz = baseSize * config.minSize;
  return Math.round(minSz + (baseSize - minSz) * adjusted);
}

export function pressureToOpacity(
  pressure: number,
  baseOpacity: number,
  config: PressureSensitivityConfig,
): number {
  if (!config.enabled) return baseOpacity;
  const adjusted = applyPressureCurve(pressure, config.curve);
  const minOp = baseOpacity * config.minOpacity;
  return Math.round(minOp + (baseOpacity - minOp) * adjusted);
}

export function interpolateStrokePressure(
  points: Point[],
  pressure: number[],
  spacing: number,
): { points: Point[]; pressure: number[] } {
  if (points.length <= 1) return { points: [...points], pressure: [...pressure] };

  const safeSpacing = Math.max(1, spacing);
  const outPoints: Point[] = [points[0]];
  const outPressure: number[] = [pressure[0] ?? 1];

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen === 0) continue;

    const steps = Math.max(1, Math.floor(segLen / safeSpacing));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      outPoints.push({
        x: Math.round(points[i - 1].x + dx * t),
        y: Math.round(points[i - 1].y + dy * t),
      });
      const p0 = pressure[i - 1] ?? 1;
      const p1 = pressure[i] ?? 1;
      outPressure.push(p0 + (p1 - p0) * t);
    }
  }

  return { points: outPoints, pressure: outPressure };
}
