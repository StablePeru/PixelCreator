import { z } from 'zod';
import type { GameEngine } from './gamedev.js';
import type { AnimationDirection } from './canvas.js';

// --- Zod Schemas (source of truth) ---

export const PivotPointSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const AssetAnimationSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      'Animation name must be lowercase alphanumeric with hyphens/underscores',
    ),
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  fps: z.number().min(1).max(60),
  direction: z.enum(['forward', 'reverse', 'pingpong']).default('forward'),
  loop: z.boolean().default(true),
  pivot: PivotPointSchema.optional(),
});

export const AssetExportConfigSchema = z.object({
  engine: z.enum(['godot', 'unity', 'generic']).default('generic'),
  scale: z.number().int().min(1).max(8).default(1),
  layout: z.enum(['horizontal', 'vertical', 'grid']).default('horizontal'),
  padding: z.number().int().min(0).max(16).default(0),
  columns: z.number().int().min(1).optional(),
});

export const SpatialConsistencyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  baselineTolerance: z.number().int().min(0).max(16).default(2),
  horizontalTolerance: z.number().int().min(0).max(16).default(2),
  topExtentRatio: z.number().min(1.0).max(10.0).default(2.0),
  lateralExtentRatio: z.number().min(1.0).max(10.0).default(2.0),
});

export const AssetConstraintsSchema = z.object({
  maxColors: z.number().int().min(2).max(256).optional(),
  frameSizeMultipleOf: z.number().int().min(1).optional(),
  requireAllFramesFilled: z.boolean().default(true),
  maxFrameDrift: z.number().int().min(0).max(32).optional(),
  spatialConsistency: SpatialConsistencyConfigSchema.optional(),
});

// --- Spatial analysis types ---

export interface FrameBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const AssetNameSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z][a-z0-9_-]*$/,
    'Asset name must be lowercase alphanumeric with hyphens/underscores',
  );

export const CharacterSpritesheetAssetSpecSchema = z.object({
  $schema: z.string().optional(),
  name: AssetNameSchema,
  type: z.literal('character-spritesheet'),
  canvas: z.string().min(1),
  frameSize: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }),
  pivot: PivotPointSchema.optional(),
  animations: z.array(AssetAnimationSchema).min(1, 'At least one animation is required'),
  export: AssetExportConfigSchema,
  constraints: AssetConstraintsSchema.optional().default({ requireAllFramesFilled: true }),
});

// --- Tileset asset spec ---

export const TilesetAssetExportConfigSchema = z.object({
  engine: z.enum(['godot', 'generic']).default('generic'),
  scale: z.number().int().min(1).max(8).default(1),
  columns: z.number().int().min(1).optional(),
  spacing: z.number().int().min(0).max(16).default(0),
});

export const TilesetTileMetadataSchema = z.object({
  index: z.number().int().min(0),
  label: z.string().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const TilesetAssetConstraintsSchema = z.object({
  maxColors: z.number().int().min(2).max(256).optional(),
  tileSizeMultipleOf: z.number().int().min(1).optional(),
  requireAllTilesUnique: z.boolean().default(false),
});

export const TilesetAssetSpecSchema = z.object({
  $schema: z.string().optional(),
  name: AssetNameSchema,
  type: z.literal('tileset'),
  canvas: z.string().min(1),
  tileSize: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }),
  tiles: z.array(TilesetTileMetadataSchema).optional(),
  export: TilesetAssetExportConfigSchema,
  constraints: TilesetAssetConstraintsSchema.optional().default({
    requireAllTilesUnique: false,
  }),
});

// --- Biome blend asset spec ---

export const BiomeBlendModeSchema = z.enum(['dither']);

export const BiomeBlendConfigSchema = z.object({
  mode: BiomeBlendModeSchema.default('dither'),
  strength: z.number().min(0).max(1).default(0.5),
  includeInverse: z.boolean().default(false),
});

export const BiomeBlendExportConfigSchema = z.object({
  engine: z.enum(['godot', 'generic']).default('generic'),
  scale: z.number().int().min(1).max(8).default(1),
  columns: z.number().int().min(1).optional(),
  spacing: z.number().int().min(0).max(16).default(0),
});

export const BiomeBlendAssetConstraintsSchema = z.object({
  maxColors: z.number().int().min(2).max(256).optional(),
  tileSizeMultipleOf: z.number().int().min(1).optional(),
});

export const BiomeBlendAssetSpecSchema = z.object({
  $schema: z.string().optional(),
  name: AssetNameSchema,
  type: z.literal('biome-blend'),
  tileSize: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }),
  source: z.object({ canvas: z.string().min(1) }),
  target: z.object({ canvas: z.string().min(1) }),
  blend: BiomeBlendConfigSchema,
  export: BiomeBlendExportConfigSchema,
  constraints: BiomeBlendAssetConstraintsSchema.optional().default({}),
});

// --- Discriminated union ---

export const AssetSpecSchema = z.discriminatedUnion('type', [
  CharacterSpritesheetAssetSpecSchema,
  TilesetAssetSpecSchema,
  BiomeBlendAssetSpecSchema,
]);

// --- TypeScript types (inferred from schemas) ---

export type PivotPoint = z.infer<typeof PivotPointSchema>;
export type AssetAnimation = z.infer<typeof AssetAnimationSchema>;
export type AssetExportConfig = z.infer<typeof AssetExportConfigSchema>;
export type AssetConstraints = z.infer<typeof AssetConstraintsSchema>;
export type SpatialConsistencyConfig = z.infer<typeof SpatialConsistencyConfigSchema>;
export type CharacterSpritesheetAssetSpec = z.infer<typeof CharacterSpritesheetAssetSpecSchema>;
export type TilesetAssetExportConfig = z.infer<typeof TilesetAssetExportConfigSchema>;
export type TilesetTileMetadata = z.infer<typeof TilesetTileMetadataSchema>;
export type TilesetAssetConstraints = z.infer<typeof TilesetAssetConstraintsSchema>;
export type TilesetAssetSpec = z.infer<typeof TilesetAssetSpecSchema>;
export type BiomeBlendMode = z.infer<typeof BiomeBlendModeSchema>;
export type BiomeBlendConfig = z.infer<typeof BiomeBlendConfigSchema>;
export type BiomeBlendExportConfig = z.infer<typeof BiomeBlendExportConfigSchema>;
export type BiomeBlendAssetConstraints = z.infer<typeof BiomeBlendAssetConstraintsSchema>;
export type BiomeBlendAssetSpec = z.infer<typeof BiomeBlendAssetSpecSchema>;
export type AssetSpec = z.infer<typeof AssetSpecSchema>;
export type AssetType = AssetSpec['type'];

// --- Cross-animation spatial metrics ---

export interface AnimationSpatialMetrics {
  animationName: string;
  aggregateBbox: FrameBoundingBox;
  baselineOffset: number;
  topExtent: number;
  leftExtent: number;
  rightExtent: number;
  centerOffsetX: number;
}

// --- Validation result types ---

export type AssetIssueSeverity = 'error' | 'warning';

export interface AssetValidationIssue {
  severity: AssetIssueSeverity;
  field: string;
  message: string;
}

export interface AssetValidationResult {
  valid: boolean;
  asset: string;
  issues: AssetValidationIssue[];
}

// --- Build result types ---

export interface AssetBuildResult {
  asset: string;
  files: Array<{ name: string; content: string | Buffer }>;
  validation: AssetValidationResult;
}
