import { Hono } from 'hono';
import {
  addFlag,
  emptyFlagsFile,
  listFlags,
  readCanvasJSON,
  readProjectJSON,
  readValidationFlags,
  removeFlag,
  resolveFlag,
  validateSizeRules,
  writeValidationFlags,
} from '@pixelcreator/core';
import type {
  FlagCategory,
  FlagSeverity,
  ValidationReport,
  ValidationSizeIssue,
} from '@pixelcreator/core';

export const validationRoutes = new Hono<{ Variables: { projectPath: string } }>();

const SEVERITIES: readonly FlagSeverity[] = ['error', 'warning', 'info'];
const CATEGORIES: readonly FlagCategory[] = [
  'pixel',
  'color',
  'palette',
  'animation',
  'bounds',
  'composition',
  'other',
];

function isSeverity(value: unknown): value is FlagSeverity {
  return typeof value === 'string' && SEVERITIES.includes(value as FlagSeverity);
}
function isCategory(value: unknown): value is FlagCategory {
  return typeof value === 'string' && CATEGORIES.includes(value as FlagCategory);
}

validationRoutes.get('/validation', (c) => {
  const projectPath = c.get('projectPath');
  const canvas = c.req.query('canvas');
  if (!canvas) return c.json({ error: 'canvas query parameter required' }, 400);

  try {
    readCanvasJSON(projectPath, canvas);
  } catch {
    return c.json({ error: `Canvas not found: ${canvas}` }, 404);
  }

  const file = readValidationFlags(projectPath, canvas);
  const openOnly = c.req.query('openOnly') === 'true';
  const severity = c.req.query('severity');
  const category = c.req.query('category');

  const flags = listFlags(file, {
    openOnly,
    severity: isSeverity(severity) ? severity : undefined,
    category: isCategory(category) ? category : undefined,
  });
  return c.json({ canvas, count: flags.length, flags });
});

validationRoutes.post('/validation', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json().catch(() => ({}));
  const { canvas, severity, category, note, tags, frameIndex, layerId, region } = body as {
    canvas?: string;
    severity?: string;
    category?: string;
    note?: string;
    tags?: unknown;
    frameIndex?: number;
    layerId?: string;
    region?: { x: number; y: number; w: number; h: number };
  };

  if (!canvas) return c.json({ error: 'canvas required' }, 400);
  if (!isSeverity(severity)) return c.json({ error: 'invalid severity' }, 400);
  if (!isCategory(category)) return c.json({ error: 'invalid category' }, 400);
  if (!note) return c.json({ error: 'note required' }, 400);

  try {
    readCanvasJSON(projectPath, canvas);
  } catch {
    return c.json({ error: `Canvas not found: ${canvas}` }, 404);
  }

  const tagList = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
  const file = readValidationFlags(projectPath, canvas);

  try {
    const nextFile = addFlag(file, {
      canvas,
      severity,
      category,
      note,
      tags: tagList,
      frameIndex,
      layerId,
      region,
    });
    writeValidationFlags(projectPath, canvas, nextFile);
    const flag = nextFile.flags[nextFile.flags.length - 1];
    return c.json(flag, 201);
  } catch (err) {
    return c.json({ error: String(err instanceof Error ? err.message : err) }, 400);
  }
});

validationRoutes.patch('/validation/:canvas/:id/resolve', async (c) => {
  const projectPath = c.get('projectPath');
  const canvas = c.req.param('canvas');
  const id = c.req.param('id');
  const { resolution } = (await c.req.json().catch(() => ({}))) as { resolution?: string };
  if (!resolution) return c.json({ error: 'resolution required' }, 400);

  const file = readValidationFlags(projectPath, canvas);
  try {
    const nextFile = resolveFlag(file, id, resolution);
    writeValidationFlags(projectPath, canvas, nextFile);
    const flag = nextFile.flags.find((f) => f.id === id);
    return c.json(flag);
  } catch (err) {
    return c.json({ error: String(err instanceof Error ? err.message : err) }, 404);
  }
});

validationRoutes.delete('/validation/:canvas/:id', (c) => {
  const projectPath = c.get('projectPath');
  const canvas = c.req.param('canvas');
  const id = c.req.param('id');

  const file = readValidationFlags(projectPath, canvas);
  try {
    const nextFile = removeFlag(file, id);
    writeValidationFlags(projectPath, canvas, nextFile);
    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: String(err instanceof Error ? err.message : err) }, 404);
  }
});

validationRoutes.get('/validation/report', (c) => {
  const projectPath = c.get('projectPath');
  const canvas = c.req.query('canvas');
  if (!canvas) return c.json({ error: 'canvas query parameter required' }, 400);
  const openOnly = c.req.query('openOnly') !== 'false';

  let canvasData;
  try {
    canvasData = readCanvasJSON(projectPath, canvas);
  } catch {
    return c.json({ error: `Canvas not found: ${canvas}` }, 404);
  }

  const project = readProjectJSON(projectPath);
  const file = readValidationFlags(projectPath, canvas);
  const manual = listFlags(file, { openOnly });

  const violations = validateSizeRules(
    canvas,
    canvasData.width,
    canvasData.height,
    project.validation.sizeRules,
  );
  const size: ValidationSizeIssue[] = violations.map((v) => ({
    canvas: v.canvas,
    width: v.width,
    height: v.height,
    rule: v.rule.type,
    message: v.message,
  }));

  const report: ValidationReport = {
    canvas,
    generatedAt: Date.now(),
    manual,
    automatic: { size },
  };
  return c.json(report);
});

// Initialize an empty flags file (idempotent helper used when first entering Review mode).
validationRoutes.post('/validation/:canvas/init', (c) => {
  const projectPath = c.get('projectPath');
  const canvas = c.req.param('canvas');
  try {
    readCanvasJSON(projectPath, canvas);
  } catch {
    return c.json({ error: `Canvas not found: ${canvas}` }, 404);
  }
  const existing = readValidationFlags(projectPath, canvas);
  if (existing.flags.length === 0) {
    writeValidationFlags(projectPath, canvas, emptyFlagsFile(canvas));
  }
  return c.json({ canvas, initialized: true });
});
