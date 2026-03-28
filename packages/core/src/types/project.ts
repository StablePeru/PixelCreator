export interface SizeConstraint {
  width?: number;
  height?: number;
  multipleOf?: { width: number; height: number };
}

export interface SizeRule {
  pattern: string;
  type: 'exact' | 'multiple-of' | 'max' | 'min';
  width?: number;
  height?: number;
  multipleOf?: { width: number; height: number };
}

export interface ValidationSettings {
  paletteEnforcement: 'off' | 'warn' | 'error';
  sizeRules: SizeRule[];
}

export interface ExportProfile {
  target: string;
  dest: string;
  scale: number;
  spriteFrames?: boolean;
}

export interface ProjectSettings {
  defaultTileSize: { width: number; height: number };
  defaultPalette: string | null;
  pixelPerfect: boolean;
  brushPresets?: import('./brush.js').BrushPreset[];
  preferences?: import('./guide.js').StudioPreferences;
}

export interface ProjectData {
  $schema?: string;
  version: string;
  name: string;
  description: string;
  created: string;
  modified: string;
  settings: ProjectSettings;
  palettes: string[];
  canvases: string[];
  tilesets: string[];
  templates: string[];
  recipes: string[];
  tags: Record<string, string[]>;
  validation: ValidationSettings;
  exportProfiles: Record<string, ExportProfile>;
}
