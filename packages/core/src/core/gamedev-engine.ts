import * as fs from 'node:fs';
import * as path from 'node:path';
import { PixelBuffer } from '../io/png-codec.js';
import { savePNG, encodePNG } from '../io/png-codec.js';
import { readCanvasJSON, readLayerFrame } from '../io/project-io.js';
import { flattenLayers } from './layer-engine.js';
import type { LayerWithBuffer } from './layer-engine.js';
import type { CanvasData, AnimationTag } from '../types/canvas.js';
import type {
  SpriteFrameExport, AnimationExport, GodotSpriteFrames,
  GodotTileSetResource, UnitySpriteSheet, GamedevExportOptions,
} from '../types/gamedev.js';
import type { TilesetData } from '../types/tileset.js';

// --- Frame Metadata ---

export function extractFrameMetadata(
  canvas: CanvasData,
  frameWidth: number,
  frameHeight: number,
  layout: 'horizontal' | 'grid' = 'horizontal',
  columns?: number,
): SpriteFrameExport[] {
  const cols = columns ?? canvas.frames.length;
  return canvas.frames.map((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      name: f.label || `frame_${i}`,
      x: col * frameWidth,
      y: row * frameHeight,
      width: frameWidth,
      height: frameHeight,
      duration: f.duration,
    };
  });
}

export function extractAnimations(canvas: CanvasData, frameMetadata: SpriteFrameExport[]): AnimationExport[] {
  if (canvas.animationTags.length === 0) {
    return [{
      name: 'default',
      frames: frameMetadata,
      direction: 'forward',
      loop: true,
      fps: 10,
    }];
  }

  return canvas.animationTags.map(tag => ({
    name: tag.name,
    frames: frameMetadata.slice(tag.from, tag.to + 1),
    direction: tag.direction,
    loop: tag.repeat === 0,
    fps: Math.round(1000 / (frameMetadata[tag.from]?.duration || 100)),
  }));
}

// --- Godot Export ---

export function exportGodotSpriteFrames(
  sheetFilename: string,
  animations: AnimationExport[],
): string {
  const lines: string[] = [];
  lines.push('[gd_resource type="SpriteFrames" format=3]');
  lines.push('');

  // Sub-resources for AtlasTextures
  let subId = 1;
  const frameRefs: Map<string, string> = new Map();

  for (const anim of animations) {
    for (const frame of anim.frames) {
      const key = `${frame.x}_${frame.y}_${frame.width}_${frame.height}`;
      if (!frameRefs.has(key)) {
        lines.push(`[sub_resource type="AtlasTexture" id="atlas_${subId}"]`);
        lines.push(`atlas = ExtResource("1_${sheetFilename}")`);
        lines.push(`region = Rect2(${frame.x}, ${frame.y}, ${frame.width}, ${frame.height})`);
        lines.push('');
        frameRefs.set(key, `SubResource("atlas_${subId}")`);
        subId++;
      }
    }
  }

  // Resource section
  lines.push('[resource]');
  const animArray = animations.map(anim => {
    const frames = anim.frames.map(f => {
      const key = `${f.x}_${f.y}_${f.width}_${f.height}`;
      return `{ "texture": ${frameRefs.get(key)}, "duration": ${f.duration / 1000} }`;
    });
    return `{ "name": "${anim.name}", "speed": ${anim.fps}.0, "loop": ${anim.loop}, "frames": [${frames.join(', ')}] }`;
  });
  lines.push(`animations = [${animArray.join(', ')}]`);

  return lines.join('\n');
}

export function exportGodotTileset(
  tileset: TilesetData,
  sheetFilename: string,
): string {
  const lines: string[] = [];
  lines.push('[gd_resource type="TileSet" format=3]');
  lines.push('');
  lines.push(`[ext_resource type="Texture2D" path="res://${sheetFilename}" id="1"]`);
  lines.push('');
  lines.push('[resource]');
  lines.push(`tile_size = Vector2i(${tileset.tileWidth}, ${tileset.tileHeight})`);

  for (let i = 0; i < tileset.tiles.length; i++) {
    const tile = tileset.tiles[i];
    const tilesPerRow = Math.max(1, Math.ceil(Math.sqrt(tileset.tiles.length)));
    const col = i % tilesPerRow;
    const row = Math.floor(i / tilesPerRow);
    lines.push(`${i}/texture_region = Rect2(${col * tileset.tileWidth}, ${row * tileset.tileHeight}, ${tileset.tileWidth}, ${tileset.tileHeight})`);
  }

  return lines.join('\n');
}

export function exportGodotScene(
  canvasName: string,
  sheetFilename: string,
  spriteFramesFilename: string,
): string {
  const lines: string[] = [];
  lines.push('[gd_scene format=3]');
  lines.push('');
  lines.push(`[ext_resource type="SpriteFrames" path="res://${spriteFramesFilename}" id="1"]`);
  lines.push(`[ext_resource type="Texture2D" path="res://${sheetFilename}" id="2"]`);
  lines.push('');
  lines.push(`[node name="${canvasName}" type="AnimatedSprite2D"]`);
  lines.push('sprite_frames = ExtResource("1")');
  lines.push('animation = "default"');

  return lines.join('\n');
}

// --- Unity Export ---

export function exportUnitySpriteSheet(
  name: string,
  sheetFilename: string,
  frameMetadata: SpriteFrameExport[],
  animations: AnimationExport[],
): UnitySpriteSheet {
  return {
    name,
    texture: sheetFilename,
    sprites: frameMetadata.map(f => ({
      name: f.name,
      rect: { x: f.x, y: f.y, w: f.width, h: f.height },
      pivot: { x: 0.5, y: 0.5 },
    })),
    animations: animations.map(a => ({
      name: a.name,
      frameRate: a.fps,
      loop: a.loop,
      sprites: a.frames.map(f => f.name),
    })),
  };
}

// --- Generic Export ---

export function exportGenericMetadata(
  canvasName: string,
  canvas: CanvasData,
  frameMetadata: SpriteFrameExport[],
  animations: AnimationExport[],
): Record<string, unknown> {
  return {
    generator: 'PixelCreator',
    version: '2.0.0',
    canvas: canvasName,
    size: { width: canvas.width, height: canvas.height },
    frameCount: canvas.frames.length,
    layerCount: canvas.layers.length,
    frames: frameMetadata,
    animations,
    layers: canvas.layers.map(l => ({ id: l.id, name: l.name, type: l.type })),
  };
}

// --- Spritesheet Generation ---

export function generateExportSpritesheet(
  projectPath: string,
  canvasName: string,
  scale: number = 1,
): { buffer: PixelBuffer; frameWidth: number; frameHeight: number } {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const frameBuffers: PixelBuffer[] = [];

  for (const frame of canvas.frames) {
    const layersWithBuffers: LayerWithBuffer[] = canvas.layers
      .filter(l => l.type !== 'reference')
      .map(l => ({
        info: l,
        buffer: readLayerFrame(projectPath, canvasName, l.id, frame.id),
      }));
    frameBuffers.push(flattenLayers(layersWithBuffers, canvas.width, canvas.height));
  }

  // Compose horizontal spritesheet manually
  const sheetWidth = canvas.width * frameBuffers.length;
  const sheetHeight = canvas.height;
  const buffer = new PixelBuffer(sheetWidth, sheetHeight);
  for (let i = 0; i < frameBuffers.length; i++) {
    const fb = frameBuffers[i];
    for (let y = 0; y < fb.height; y++) {
      for (let x = 0; x < fb.width; x++) {
        buffer.setPixel(i * canvas.width + x, y, fb.getPixel(x, y));
      }
    }
  }

  if (scale > 1) {
    const scaled = new PixelBuffer(sheetWidth * scale, sheetHeight * scale);
    for (let y = 0; y < sheetHeight; y++) {
      for (let x = 0; x < sheetWidth; x++) {
        const pixel = buffer.getPixel(x, y);
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            scaled.setPixel(x * scale + sx, y * scale + sy, pixel);
          }
        }
      }
    }
    return { buffer: scaled, frameWidth: canvas.width * scale, frameHeight: canvas.height * scale };
  }

  return { buffer, frameWidth: canvas.width, frameHeight: canvas.height };
}

// --- Full Export ---

export function exportToGameEngine(
  projectPath: string,
  options: GamedevExportOptions,
): { files: Array<{ name: string; content: string | Buffer }> } {
  const canvas = readCanvasJSON(projectPath, options.canvas);
  const { buffer, frameWidth, frameHeight } = generateExportSpritesheet(projectPath, options.canvas, options.scale);
  const sheetFilename = `${options.canvas}_sheet.png`;
  const frameMetadata = extractFrameMetadata(canvas, frameWidth, frameHeight);
  const animations = options.includeAnimations ? extractAnimations(canvas, frameMetadata) : [];

  const files: Array<{ name: string; content: string | Buffer }> = [];

  // Spritesheet PNG
  files.push({ name: sheetFilename, content: Buffer.from(encodePNG(buffer)) });

  if (options.engine === 'godot') {
    const sfName = `${options.canvas}.tres`;
    files.push({ name: sfName, content: exportGodotSpriteFrames(sheetFilename, animations) });
    const sceneName = `${options.canvas}.tscn`;
    files.push({ name: sceneName, content: exportGodotScene(options.canvas, sheetFilename, sfName) });
  } else if (options.engine === 'unity') {
    const metaName = `${options.canvas}_sprite.json`;
    const unity = exportUnitySpriteSheet(options.canvas, sheetFilename, frameMetadata, animations);
    files.push({ name: metaName, content: JSON.stringify(unity, null, 2) });
  } else {
    const metaName = `${options.canvas}_metadata.json`;
    const generic = exportGenericMetadata(options.canvas, canvas, frameMetadata, animations);
    files.push({ name: metaName, content: JSON.stringify(generic, null, 2) });
  }

  return { files };
}

export function writeExportFiles(
  outputDir: string,
  files: Array<{ name: string; content: string | Buffer }>,
): string[] {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const written: string[] = [];
  for (const file of files) {
    const filePath = path.join(outputDir, file.name);
    if (typeof file.content === 'string') {
      fs.writeFileSync(filePath, file.content, 'utf-8');
    } else {
      fs.writeFileSync(filePath, file.content);
    }
    written.push(filePath);
  }
  return written;
}
