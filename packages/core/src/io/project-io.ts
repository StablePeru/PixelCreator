import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectData } from '../types/project.js';
import type { CanvasData } from '../types/canvas.js';
import type { PaletteData } from '../types/palette.js';
import type { TilesetData } from '../types/tileset.js';
import type { TemplateData } from '../types/template.js';
import type { RecipeData } from '../types/recipe.js';
import type { SelectionMask, ClipboardData } from '../types/selection.js';
import type { AssetSpec } from '../types/asset.js';
import type { ValidationFlagsFile } from '../types/validation.js';
import { emptyFlagsFile } from '../core/validation-engine.js';
import { PixelBuffer } from './png-codec.js';
import { savePNG, loadPNG, createEmptyBuffer } from './png-codec.js';
import { selectionToPixelBuffer, pixelBufferToSelection } from '../core/selection-engine.js';
import { generateSequentialId } from '../utils/id-generator.js';

export function findProjectRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    // Check for .pxc directories
    const entries = fs.readdirSync(dir).filter((e) => e.endsWith('.pxc'));
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'project.json'))) {
        return full;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function getProjectPath(projectFlag: string | undefined): string {
  if (projectFlag) {
    const resolved = path.resolve(projectFlag);
    if (fs.existsSync(resolved) && fs.existsSync(path.join(resolved, 'project.json'))) {
      return resolved;
    }
    throw new Error(`Project not found at: ${resolved}`);
  }
  const found = findProjectRoot(process.cwd());
  if (!found) {
    throw new Error('No .pxc project found. Run `pxc project:init` first or use --project flag.');
  }
  return found;
}

export function readProjectJSON(projectPath: string): ProjectData {
  const filePath = path.join(projectPath, 'project.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeProjectJSON(projectPath: string, data: ProjectData): void {
  data.modified = new Date().toISOString();
  fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(data, null, 2));
}

export function readCanvasJSON(projectPath: string, canvasName: string): CanvasData {
  const filePath = path.join(projectPath, 'canvases', canvasName, 'canvas.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Canvas not found: ${canvasName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeCanvasJSON(projectPath: string, canvasName: string, data: CanvasData): void {
  const dir = path.join(projectPath, 'canvases', canvasName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.modified = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'canvas.json'), JSON.stringify(data, null, 2));
}

export function readPaletteJSON(projectPath: string, paletteName: string): PaletteData {
  const filePath = path.join(projectPath, 'palettes', `${paletteName}.palette.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Palette not found: ${paletteName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writePaletteJSON(projectPath: string, data: PaletteData): void {
  const dir = path.join(projectPath, 'palettes');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, `${data.name}.palette.json`), JSON.stringify(data, null, 2));
}

export function getLayerFramePath(
  projectPath: string,
  canvasName: string,
  layerId: string,
  frameId: string,
): string {
  return path.join(projectPath, 'canvases', canvasName, 'layers', layerId, `${frameId}.png`);
}

export function readLayerFrame(
  projectPath: string,
  canvasName: string,
  layerId: string,
  frameId: string,
): PixelBuffer {
  const filePath = getLayerFramePath(projectPath, canvasName, layerId, frameId);
  if (!fs.existsSync(filePath)) {
    // Return empty buffer - canvas dimensions needed
    const canvas = readCanvasJSON(projectPath, canvasName);
    return createEmptyBuffer(canvas.width, canvas.height);
  }
  return loadPNG(filePath);
}

export function writeLayerFrame(
  projectPath: string,
  canvasName: string,
  layerId: string,
  frameId: string,
  buffer: PixelBuffer,
): void {
  const filePath = getLayerFramePath(projectPath, canvasName, layerId, frameId);
  savePNG(buffer, filePath);
}

export function initProjectStructure(projectPath: string, name: string): ProjectData {
  const dirs = ['palettes', 'canvases', 'tilesets', 'templates', 'recipes', 'exports'];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  }

  const now = new Date().toISOString();
  const project: ProjectData = {
    version: '1.0.0',
    name,
    description: '',
    created: now,
    modified: now,
    settings: {
      defaultTileSize: { width: 16, height: 16 },
      defaultPalette: null,
      pixelPerfect: true,
    },
    palettes: [],
    canvases: [],
    tilesets: [],
    templates: [],
    recipes: [],
    tags: {},
    validation: {
      paletteEnforcement: 'warn',
      sizeRules: [],
    },
    exportProfiles: {},
  };

  writeProjectJSON(projectPath, project);
  return project;
}

export function deleteLayerFrame(
  projectPath: string,
  canvasName: string,
  layerId: string,
  frameId: string,
): void {
  const filePath = getLayerFramePath(projectPath, canvasName, layerId, frameId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function deleteLayerDirectory(
  projectPath: string,
  canvasName: string,
  layerId: string,
): void {
  const dir = path.join(projectPath, 'canvases', canvasName, 'layers', layerId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function deleteCanvasDirectory(projectPath: string, canvasName: string): void {
  const dir = path.join(projectPath, 'canvases', canvasName);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function renameLayerFrame(
  projectPath: string,
  canvasName: string,
  layerId: string,
  oldFrameId: string,
  newFrameId: string,
): void {
  const oldPath = getLayerFramePath(projectPath, canvasName, layerId, oldFrameId);
  const newPath = getLayerFramePath(projectPath, canvasName, layerId, newFrameId);
  if (fs.existsSync(oldPath)) {
    const dir = path.dirname(newPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(oldPath, newPath);
  }
}

export function reindexFrames(projectPath: string, canvasName: string, canvas: CanvasData): void {
  const tempPrefix = '__temp_reindex_';

  // Pass 1: rename all to temp names to avoid collisions
  for (const layer of canvas.layers) {
    for (let i = 0; i < canvas.frames.length; i++) {
      const frame = canvas.frames[i];
      const targetId = generateSequentialId('frame', i + 1);
      if (frame.id !== targetId) {
        renameLayerFrame(projectPath, canvasName, layer.id, frame.id, `${tempPrefix}${i}`);
      }
    }
  }

  // Pass 2: rename temp to final names
  for (const layer of canvas.layers) {
    for (let i = 0; i < canvas.frames.length; i++) {
      const frame = canvas.frames[i];
      const targetId = generateSequentialId('frame', i + 1);
      if (frame.id !== targetId) {
        renameLayerFrame(projectPath, canvasName, layer.id, `${tempPrefix}${i}`, targetId);
      }
    }
  }

  // Update frame metadata
  for (let i = 0; i < canvas.frames.length; i++) {
    canvas.frames[i].id = generateSequentialId('frame', i + 1);
    canvas.frames[i].index = i;
  }
}

export function renameCanvasDirectory(projectPath: string, oldName: string, newName: string): void {
  const oldDir = path.join(projectPath, 'canvases', oldName);
  const newDir = path.join(projectPath, 'canvases', newName);
  fs.renameSync(oldDir, newDir);

  const canvas = readCanvasJSON(projectPath, newName);
  canvas.name = newName;
  writeCanvasJSON(projectPath, newName, canvas);
}

export function copyCanvasDirectory(
  projectPath: string,
  sourceName: string,
  destName: string,
): void {
  const srcDir = path.join(projectPath, 'canvases', sourceName);
  const dstDir = path.join(projectPath, 'canvases', destName);
  fs.cpSync(srcDir, dstDir, { recursive: true });

  const canvas = readCanvasJSON(projectPath, destName);
  canvas.name = destName;
  const now = new Date().toISOString();
  canvas.created = now;
  canvas.modified = now;
  writeCanvasJSON(projectPath, destName, canvas);
}

// Tileset I/O

export function readTilesetJSON(projectPath: string, tilesetName: string): TilesetData {
  const filePath = path.join(projectPath, 'tilesets', tilesetName, 'tileset.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tileset not found: ${tilesetName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeTilesetJSON(
  projectPath: string,
  tilesetName: string,
  data: TilesetData,
): void {
  const dir = path.join(projectPath, 'tilesets', tilesetName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.modified = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'tileset.json'), JSON.stringify(data, null, 2));
}

export function getTilePath(projectPath: string, tilesetName: string, tileId: string): string {
  return path.join(projectPath, 'tilesets', tilesetName, 'tiles', `${tileId}.png`);
}

export function readTileImage(
  projectPath: string,
  tilesetName: string,
  tileId: string,
): PixelBuffer {
  const filePath = getTilePath(projectPath, tilesetName, tileId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tile image not found: ${tileId} in tileset ${tilesetName}`);
  }
  return loadPNG(filePath);
}

export function writeTileImage(
  projectPath: string,
  tilesetName: string,
  tileId: string,
  buffer: PixelBuffer,
): void {
  const filePath = getTilePath(projectPath, tilesetName, tileId);
  savePNG(buffer, filePath);
}

export function ensureTilesetStructure(projectPath: string, tilesetName: string): void {
  const tilesDir = path.join(projectPath, 'tilesets', tilesetName, 'tiles');
  fs.mkdirSync(tilesDir, { recursive: true });
}

export function ensureCanvasStructure(
  projectPath: string,
  canvasName: string,
  canvas: CanvasData,
): void {
  const canvasDir = path.join(projectPath, 'canvases', canvasName);
  fs.mkdirSync(canvasDir, { recursive: true });

  for (const layer of canvas.layers) {
    const layerDir = path.join(canvasDir, 'layers', layer.id);
    fs.mkdirSync(layerDir, { recursive: true });

    for (const frame of canvas.frames) {
      const framePath = path.join(layerDir, `${frame.id}.png`);
      if (!fs.existsSync(framePath)) {
        savePNG(createEmptyBuffer(canvas.width, canvas.height), framePath);
      }
    }
  }
}

// Template I/O

export function readTemplateJSON(projectPath: string, templateName: string): TemplateData {
  const filePath = path.join(projectPath, 'templates', `${templateName}.template.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeTemplateJSON(projectPath: string, data: TemplateData): void {
  const dir = path.join(projectPath, 'templates');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.modified = new Date().toISOString();
  fs.writeFileSync(path.join(dir, `${data.name}.template.json`), JSON.stringify(data, null, 2));
}

export function deleteTemplateFile(projectPath: string, templateName: string): void {
  const filePath = path.join(projectPath, 'templates', `${templateName}.template.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Recipe I/O

export function readRecipeJSON(projectPath: string, recipeName: string): RecipeData {
  const filePath = path.join(projectPath, 'recipes', `${recipeName}.recipe.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Recipe not found: ${recipeName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeRecipeJSON(projectPath: string, data: RecipeData): void {
  const dir = path.join(projectPath, 'recipes');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.modified = new Date().toISOString();
  fs.writeFileSync(path.join(dir, `${data.name}.recipe.json`), JSON.stringify(data, null, 2));
}

export function deleteRecipeFile(projectPath: string, recipeName: string): void {
  const filePath = path.join(projectPath, 'recipes', `${recipeName}.recipe.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Selection I/O

export function getSelectionPath(projectPath: string, canvasName: string): string {
  return path.join(projectPath, 'selections', `${canvasName}.selection.png`);
}

export function readSelection(projectPath: string, canvasName: string): SelectionMask | null {
  const filePath = getSelectionPath(projectPath, canvasName);
  if (!fs.existsSync(filePath)) return null;
  const buffer = loadPNG(filePath);
  return pixelBufferToSelection(buffer);
}

export function writeSelection(projectPath: string, canvasName: string, mask: SelectionMask): void {
  const filePath = getSelectionPath(projectPath, canvasName);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  savePNG(selectionToPixelBuffer(mask), filePath);
}

export function deleteSelection(projectPath: string, canvasName: string): void {
  const filePath = getSelectionPath(projectPath, canvasName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Asset Spec I/O

export function getAssetSpecPath(projectPath: string, assetName: string): string {
  return path.join(projectPath, 'assets', `${assetName}.asset.json`);
}

export function readAssetSpec(projectPath: string, assetName: string): AssetSpec {
  const filePath = getAssetSpecPath(projectPath, assetName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Asset spec not found: ${assetName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeAssetSpec(projectPath: string, spec: AssetSpec): void {
  const dir = path.join(projectPath, 'assets');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getAssetSpecPath(projectPath, spec.name), JSON.stringify(spec, null, 2));
}

export function listAssetSpecs(projectPath: string): string[] {
  const dir = path.join(projectPath, 'assets');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.asset.json'))
    .map((f) => f.replace('.asset.json', ''));
}

export function deleteAssetSpec(projectPath: string, assetName: string): void {
  const filePath = getAssetSpecPath(projectPath, assetName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Clipboard I/O

export function getClipboardPath(projectPath: string): string {
  return path.join(projectPath, 'clipboard');
}

export function readClipboard(
  projectPath: string,
): { data: ClipboardData; buffer: PixelBuffer } | null {
  const dir = getClipboardPath(projectPath);
  const metaPath = path.join(dir, 'clipboard.json');
  const contentPath = path.join(dir, 'content.png');
  if (!fs.existsSync(metaPath) || !fs.existsSync(contentPath)) return null;
  const data: ClipboardData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const buffer = loadPNG(contentPath);
  return { data, buffer };
}

export function writeClipboard(
  projectPath: string,
  data: ClipboardData,
  buffer: PixelBuffer,
): void {
  const dir = getClipboardPath(projectPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'clipboard.json'), JSON.stringify(data, null, 2));
  savePNG(buffer, path.join(dir, 'content.png'));
}

export function clearClipboard(projectPath: string): void {
  const dir = getClipboardPath(projectPath);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Validation flags I/O
// Flags live under canvases/{name}/.validation/flags.json as a single append-only document.

export function getValidationFlagsPath(projectPath: string, canvasName: string): string {
  return path.join(projectPath, 'canvases', canvasName, '.validation', 'flags.json');
}

export function readValidationFlags(projectPath: string, canvasName: string): ValidationFlagsFile {
  const filePath = getValidationFlagsPath(projectPath, canvasName);
  if (!fs.existsSync(filePath)) {
    return emptyFlagsFile(canvasName);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as ValidationFlagsFile;
  if (!parsed || parsed.version !== 1 || parsed.canvas !== canvasName) {
    throw new Error(
      `Invalid validation flags file at ${filePath} (expected version=1, canvas=${canvasName})`,
    );
  }
  return parsed;
}

export function writeValidationFlags(
  projectPath: string,
  canvasName: string,
  file: ValidationFlagsFile,
): void {
  const filePath = getValidationFlagsPath(projectPath, canvasName);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
}
