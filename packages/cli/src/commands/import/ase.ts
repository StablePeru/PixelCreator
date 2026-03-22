import * as path from 'node:path';
import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, writeCanvasJSON, writeLayerFrame, writePaletteJSON, decodeAse, PixelBuffer, flattenLayers, generateSequentialId, rgbaToHex, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer, CanvasData, LayerInfo, FrameInfo, PaletteData } from '@pixelcreator/core';

const ASE_BLEND_MAP: Record<number, string> = {
  0: 'normal',
  1: 'multiply',
  2: 'screen',
  3: 'overlay',
  4: 'darken',
  5: 'lighten',
};

export default class ImportAse extends BaseCommand {
  static override description = 'Import an Aseprite (.ase/.aseprite) file as a new canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({ description: 'Path to .ase/.aseprite file', required: true }),
    name: Flags.string({ char: 'n', description: 'Canvas name for import', required: true }),
    flatten: Flags.boolean({ description: 'Flatten all layers into one', default: false }),
    'import-palette': Flags.string({ description: 'Also import palette with this name' }),
    duration: Flags.integer({ description: 'Override frame duration in ms' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ImportAse);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists in this project.`);
    }

    const filePath = path.resolve(flags.file);
    if (!fs.existsSync(filePath)) {
      this.error(`File not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const ase = decodeAse(data);

    // Filter out group layers
    const normalLayers = ase.layers.filter((l) => l.type === 'normal');
    if (normalLayers.length === 0) {
      this.error('No drawable layers found in ASE file.');
    }

    const now = new Date().toISOString();
    const { width, height } = ase;

    // Build frame info
    const frameInfos: FrameInfo[] = [];
    for (let i = 0; i < ase.frameCount; i++) {
      frameInfos.push({
        id: generateSequentialId('frame', i + 1),
        index: i,
        duration: flags.duration ?? ase.frameDurations[i] ?? 100,
      });
    }

    // Build layer buffers per frame
    const layerFrameBuffers = new Map<string, Map<string, PixelBuffer>>();

    if (flags.flatten) {
      // Flatten all layers per frame
      const flatLayerId = generateSequentialId('layer', 1);
      const frameBuffers = new Map<string, PixelBuffer>();

      for (let fi = 0; fi < ase.frameCount; fi++) {
        const layerBufs: LayerWithBuffer[] = normalLayers.map((layer, li) => {
          const cel = ase.cels.find((c) => c.layerIndex === layer.index && c.frameIndex === fi);
          const buf = new PixelBuffer(width, height);
          if (cel && cel.data.length > 0) {
            blitCel(buf, cel);
          }
          return {
            info: {
              id: generateSequentialId('layer', li + 1),
              name: layer.name,
              type: 'normal' as const,
              visible: layer.visible,
              opacity: layer.opacity,
              blendMode: (ASE_BLEND_MAP[layer.blendMode] || 'normal') as any,
              locked: false,
              order: li,
            },
            buffer: buf,
          };
        });
        const flat = flattenLayers(layerBufs, width, height);
        frameBuffers.set(frameInfos[fi].id, flat);
      }

      layerFrameBuffers.set(flatLayerId, frameBuffers);
    } else {
      // Preserve layers
      for (let li = 0; li < normalLayers.length; li++) {
        const layer = normalLayers[li];
        const layerId = generateSequentialId('layer', li + 1);
        const frameBuffers = new Map<string, PixelBuffer>();

        for (let fi = 0; fi < ase.frameCount; fi++) {
          const cel = ase.cels.find((c) => c.layerIndex === layer.index && c.frameIndex === fi);
          const buf = new PixelBuffer(width, height);
          if (cel && cel.data.length > 0) {
            blitCel(buf, cel);
          }
          frameBuffers.set(frameInfos[fi].id, buf);
        }

        layerFrameBuffers.set(layerId, frameBuffers);
      }
    }

    // Build canvas layers
    const layers: LayerInfo[] = [];
    let order = 0;
    for (const [layerId] of layerFrameBuffers) {
      const li = order;
      const srcLayer = flags.flatten ? normalLayers[0] : normalLayers[li];
      layers.push({
        id: layerId,
        name: flags.flatten ? 'flattened' : (srcLayer?.name || `layer-${li + 1}`),
        type: 'normal' as const,
        visible: true,
        opacity: flags.flatten ? 255 : (srcLayer?.opacity ?? 255),
        blendMode: (flags.flatten ? 'normal' : (ASE_BLEND_MAP[srcLayer?.blendMode ?? 0] || 'normal')) as any,
        locked: false,
        order: order++,
      });
    }

    // Build animation tags
    const animationTags = ase.tags.map((tag) => ({
      name: tag.name,
      from: tag.from,
      to: tag.to,
      direction: tag.direction,
      repeat: tag.repeat,
    }));

    const canvas: CanvasData = {
      name: flags.name,
      width,
      height,
      created: now,
      modified: now,
      palette: flags['import-palette'] || null,
      layers,
      frames: frameInfos,
      animationTags,
    };

    writeCanvasJSON(projectPath, flags.name, canvas);

    // Write layer frame PNGs
    for (const [layerId, frameBuffers] of layerFrameBuffers) {
      for (const [frameId, buffer] of frameBuffers) {
        writeLayerFrame(projectPath, flags.name, layerId, frameId, buffer);
      }
    }

    // Register canvas
    project.canvases.push(flags.name);

    // Import palette if requested
    if (flags['import-palette'] && ase.palette.length > 0) {
      const paletteData: PaletteData = {
        name: flags['import-palette'],
        description: `Imported from ${path.basename(filePath)}`,
        colors: ase.palette
          .filter((c) => c.a > 0)
          .map((c, i) => ({
            index: i,
            hex: rgbaToHex({ r: c.r, g: c.g, b: c.b, a: 255 }),
            name: c.name,
            group: null,
          })),
        constraints: { maxColors: 256, locked: false, allowAlpha: true },
        ramps: [],
      };
      writePaletteJSON(projectPath, paletteData);
      if (!project.palettes.includes(flags['import-palette'])) {
        project.palettes.push(flags['import-palette']);
      }
    }

    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      source: filePath,
      width,
      height,
      framesImported: ase.frameCount,
      layersImported: layers.length,
      tagsImported: animationTags.length,
      paletteImported: flags['import-palette'] || null,
    };

    const cmdResult = makeResult('import:ase', { file: flags.file, name: flags.name, flatten: flags.flatten }, resultData, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, cmdResult, (r) => {
      this.log(`Imported ASE "${path.basename(filePath)}" as canvas "${r.name}"`);
      this.log(`  Size: ${r.width}x${r.height}, ${r.framesImported} frames, ${r.layersImported} layers`);
      if (r.tagsImported > 0) this.log(`  Animation tags: ${r.tagsImported}`);
      if (r.paletteImported) this.log(`  Palette: ${r.paletteImported}`);
    });
  }
}

function blitCel(dest: PixelBuffer, cel: { x: number; y: number; width: number; height: number; data: Buffer }): void {
  for (let y = 0; y < cel.height; y++) {
    for (let x = 0; x < cel.width; x++) {
      const dx = cel.x + x;
      const dy = cel.y + y;
      if (dx < 0 || dx >= dest.width || dy < 0 || dy >= dest.height) continue;
      const idx = (y * cel.width + x) * 4;
      if (idx + 3 < cel.data.length) {
        const a = cel.data[idx + 3];
        if (a > 0) {
          dest.setPixel(dx, dy, {
            r: cel.data[idx],
            g: cel.data[idx + 1],
            b: cel.data[idx + 2],
            a,
          });
        }
      }
    }
  }
}
