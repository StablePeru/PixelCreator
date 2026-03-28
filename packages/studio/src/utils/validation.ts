import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6,8}$/, 'Invalid hex color');

export const drawPixelSchema = z.object({
  canvas: z.string().min(1),
  x: z.number().int(),
  y: z.number().int(),
  color: hexColor,
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawLineSchema = z.object({
  canvas: z.string().min(1),
  x1: z.number().int(),
  y1: z.number().int(),
  x2: z.number().int(),
  y2: z.number().int(),
  color: hexColor,
  thickness: z.number().int().min(1).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawRectSchema = z.object({
  canvas: z.string().min(1),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  color: hexColor,
  fill: z.boolean().optional(),
  thickness: z.number().int().min(1).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawCircleSchema = z.object({
  canvas: z.string().min(1),
  cx: z.number().int(),
  cy: z.number().int(),
  radius: z.number().int().min(1),
  color: hexColor,
  fill: z.boolean().optional(),
  thickness: z.number().int().min(1).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawFillSchema = z.object({
  canvas: z.string().min(1),
  x: z.number().int(),
  y: z.number().int(),
  color: hexColor,
  tolerance: z.number().int().min(0).optional(),
  contiguous: z.boolean().optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawEllipseSchema = z.object({
  canvas: z.string().min(1),
  cx: z.number().int(),
  cy: z.number().int(),
  rx: z.number().int().min(1),
  ry: z.number().int().min(1),
  color: hexColor,
  fill: z.boolean().optional(),
  thickness: z.number().int().min(1).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

const pointSchema = z.object({ x: z.number(), y: z.number() });

export const drawPolygonSchema = z.object({
  canvas: z.string().min(1),
  points: z.array(pointSchema).min(3),
  color: hexColor,
  fill: z.boolean().optional(),
  thickness: z.number().int().min(1).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawGradientSchema = z.object({
  canvas: z.string().min(1),
  x1: z.number().int(),
  y1: z.number().int(),
  x2: z.number().int(),
  y2: z.number().int(),
  from: hexColor,
  to: hexColor,
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawRadialGradientSchema = z.object({
  canvas: z.string().min(1),
  cx: z.number().int(),
  cy: z.number().int(),
  radius: z.number().int().min(1),
  from: hexColor,
  to: hexColor,
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawBezierSchema = z.object({
  canvas: z.string().min(1),
  points: z.array(pointSchema).min(3).max(4),
  color: hexColor,
  thickness: z.number().int().min(1).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawOutlineSchema = z.object({
  canvas: z.string().min(1),
  color: hexColor,
  thickness: z.number().int().min(1).optional(),
  corners: z.boolean().optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawStampSchema = z.object({
  canvas: z.string().min(1),
  x: z.number().int(),
  y: z.number().int(),
  color: hexColor,
  size: z.number().int().min(1).optional(),
  shape: z.enum(['square', 'circle']).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const createCanvasSchema = z.object({
  name: z.string().min(1),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
  background: hexColor.optional(),
});

// --- Brush & Symmetry Schemas ---

export const brushPresetCreateSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().min(1).max(64),
  shape: z.enum(['circle', 'square', 'diamond', 'custom']),
  pattern: z.array(z.array(z.boolean())).optional(),
  spacing: z.number().min(0.1).max(10).optional(),
  opacity: z.number().int().min(0).max(255).optional(),
  pixelPerfect: z.boolean().optional(),
});

export const symmetryConfigSchema = z.object({
  mode: z.enum(['none', 'horizontal', 'vertical', 'both', 'radial']),
  axisX: z.number().int().optional(),
  axisY: z.number().int().optional(),
  radialSegments: z.number().int().min(2).max(24).optional(),
  radialCenterX: z.number().int().optional(),
  radialCenterY: z.number().int().optional(),
});

export const drawStrokeSchema = z.object({
  canvas: z.string().min(1),
  points: z.array(pointSchema).min(1),
  color: hexColor,
  brushId: z.string().optional(),
  symmetry: symmetryConfigSchema.optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});

export const drawSymmetricSchema = z.object({
  canvas: z.string().min(1),
  type: z.enum(['pixel', 'line', 'fill']),
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  x1: z.number().int().optional(),
  y1: z.number().int().optional(),
  x2: z.number().int().optional(),
  y2: z.number().int().optional(),
  color: hexColor,
  symmetry: symmetryConfigSchema,
  tolerance: z.number().int().min(0).optional(),
  layer: z.string().optional(),
  frame: z.string().optional(),
});
