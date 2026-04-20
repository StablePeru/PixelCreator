import type { AssetValidationResult } from './asset.js';
import type { PaletteAccessibilityReport } from './accessibility.js';

export type FlagSeverity = 'error' | 'warning' | 'info';

export type FlagCategory =
  | 'pixel'
  | 'color'
  | 'palette'
  | 'animation'
  | 'bounds'
  | 'composition'
  | 'other';

export interface FlagRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ValidationFlag {
  id: string;
  canvas: string;
  frameIndex?: number;
  layerId?: string;
  region?: FlagRegion;
  severity: FlagSeverity;
  category: FlagCategory;
  note: string;
  tags: string[];
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
}

export interface ValidationFlagsFile {
  version: 1;
  canvas: string;
  flags: ValidationFlag[];
}

export interface ValidationPaletteIssue {
  canvas: string;
  frame: number;
  offenders: { x: number; y: number; color: string }[];
  totalPixelsOutOfPalette: number;
}

export interface ValidationSizeIssue {
  canvas: string;
  width: number;
  height: number;
  rule: string;
  message: string;
}

export interface ValidationReport {
  canvas: string;
  generatedAt: number;
  manual: ValidationFlag[];
  automatic: {
    palette?: ValidationPaletteIssue[];
    accessibility?: PaletteAccessibilityReport;
    size?: ValidationSizeIssue[];
    asset?: AssetValidationResult[];
  };
}
