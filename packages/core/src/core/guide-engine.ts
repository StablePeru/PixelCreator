import type { GuideConfig, GuideInfo, GuideOrientation } from '../types/guide.js';
import { generateSequentialId } from '../utils/id-generator.js';
import { z } from 'zod';

export function createDefaultGuideConfig(): GuideConfig {
  return {
    guides: [],
    snapEnabled: true,
    snapThreshold: 4,
    visible: true,
  };
}

export function createGuide(
  config: GuideConfig,
  orientation: GuideOrientation,
  position: number,
  color?: string,
): GuideConfig {
  const id = generateSequentialId('guide', config.guides.length + 1);
  const guide: GuideInfo = {
    id,
    orientation,
    position,
    color: color ?? '#00ccff',
    locked: false,
  };
  return {
    ...config,
    guides: [...config.guides, guide],
  };
}

export function removeGuide(config: GuideConfig, guideId: string): GuideConfig {
  return {
    ...config,
    guides: config.guides.filter(g => g.id !== guideId),
  };
}

export function moveGuide(config: GuideConfig, guideId: string, newPosition: number): GuideConfig {
  return {
    ...config,
    guides: config.guides.map(g =>
      g.id === guideId ? { ...g, position: newPosition } : g,
    ),
  };
}

export function toggleGuideLock(config: GuideConfig, guideId: string): GuideConfig {
  return {
    ...config,
    guides: config.guides.map(g =>
      g.id === guideId ? { ...g, locked: !g.locked } : g,
    ),
  };
}

export function clearGuides(config: GuideConfig): GuideConfig {
  return {
    ...config,
    guides: [],
  };
}

export interface SnapResult {
  snapped: boolean;
  x: number;
  y: number;
  guideIds: string[];
}

export function snapToGuide(
  guides: GuideInfo[],
  x: number,
  y: number,
  threshold: number,
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  let didSnap = false;
  const matchedIds: string[] = [];

  let bestDistX = threshold + 1;
  let bestDistY = threshold + 1;

  for (const guide of guides) {
    if (guide.orientation === 'vertical') {
      const dist = Math.abs(x - guide.position);
      if (dist <= threshold && dist < bestDistX) {
        bestDistX = dist;
        snappedX = guide.position;
        didSnap = true;
        // Replace previous vertical match
        const prevVertIdx = matchedIds.findIndex(id => {
          const g = guides.find(g2 => g2.id === id);
          return g?.orientation === 'vertical';
        });
        if (prevVertIdx >= 0) matchedIds.splice(prevVertIdx, 1);
        matchedIds.push(guide.id);
      }
    } else {
      const dist = Math.abs(y - guide.position);
      if (dist <= threshold && dist < bestDistY) {
        bestDistY = dist;
        snappedY = guide.position;
        didSnap = true;
        const prevHorizIdx = matchedIds.findIndex(id => {
          const g = guides.find(g2 => g2.id === id);
          return g?.orientation === 'horizontal';
        });
        if (prevHorizIdx >= 0) matchedIds.splice(prevHorizIdx, 1);
        matchedIds.push(guide.id);
      }
    }
  }

  return {
    snapped: didSnap,
    x: snappedX,
    y: snappedY,
    guideIds: matchedIds,
  };
}

// --- Validation ---

export const guideConfigSchema = z.object({
  guides: z.array(z.object({
    id: z.string().min(1),
    orientation: z.enum(['horizontal', 'vertical']),
    position: z.number().int(),
    color: z.string().optional(),
    locked: z.boolean().optional(),
  })),
  snapEnabled: z.boolean(),
  snapThreshold: z.number().int().min(1).max(32),
  visible: z.boolean(),
});

export function validateGuideConfig(config: unknown): { valid: boolean; errors?: string[] } {
  const result = guideConfigSchema.safeParse(config);
  if (result.success) return { valid: true };
  return { valid: false, errors: result.error.issues.map(i => i.message) };
}
