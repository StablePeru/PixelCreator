import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
  readPaletteJSON,
} from '../../io/project-io.js';
import { samplePixelColor } from '../../core/palette-engine.js';
import { findNearestColor } from '../../core/palette-engine.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { rgbaToHex, hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawSample extends BaseCommand {
  static description = 'Sample a pixel color from a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    x: Flags.integer({
      description: 'X coordinate',
      required: true,
    }),
    y: Flags.integer({
      description: 'Y coordinate',
      required: true,
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Layer ID',
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Frame ID',
    }),
    flatten: Flags.boolean({
      description: 'Sample from flattened layers',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawSample);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.flatten && flags.layer) {
      this.error('--flatten and --layer are mutually exclusive.');
    }

    const frameId = flags.frame ?? canvas.frames[0]?.id;
    if (!frameId) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    if (!canvas.frames.some((f) => f.id === frameId)) {
      this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
    }

    const layerId = flags.layer ?? canvas.layers[0]?.id;
    if (!flags.flatten && !layerId) {
      this.error(`Canvas "${flags.canvas}" has no layers.`);
    }

    if (flags.x < 0 || flags.x >= canvas.width || flags.y < 0 || flags.y >= canvas.height) {
      this.error(`Coordinates (${flags.x}, ${flags.y}) out of bounds for ${canvas.width}x${canvas.height} canvas.`);
    }

    let rgba;
    let usedLayer: string | null;
    let flattened = false;

    if (flags.flatten) {
      const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
      }));
      const buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
      rgba = samplePixelColor(buffer, flags.x, flags.y);
      usedLayer = null;
      flattened = true;
    } else {
      const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
      rgba = samplePixelColor(buffer, flags.x, flags.y);
      usedLayer = layerId;
    }

    const hexColor = rgbaToHex(rgba);

    // Check for palette match
    let paletteMatch: { color: string; index: number; distance: number } | undefined;
    if (canvas.palette) {
      try {
        const palette = readPaletteJSON(projectPath, canvas.palette);
        if (palette.colors.length > 0 && rgba.a > 0) {
          const paletteRGBA = palette.colors.map((c) => hexToRGBA(c.hex));
          const nearest = findNearestColor(rgba, paletteRGBA);
          paletteMatch = {
            color: rgbaToHex(nearest.color),
            index: nearest.index,
            distance: nearest.distance,
          };
        }
      } catch {
        // Palette not found — skip match
      }
    }

    const resultData = {
      x: flags.x,
      y: flags.y,
      color: hexColor,
      rgba,
      layer: usedLayer,
      frame: frameId,
      flattened,
      paletteMatch,
    };

    const cmdResult = makeResult(
      'draw:sample',
      { canvas: flags.canvas, x: flags.x, y: flags.y, layer: flags.layer, frame: flags.frame, flatten: flags.flatten },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Color at (${data.x}, ${data.y}): ${data.color}`);
      this.log(`  RGBA: ${data.rgba.r}, ${data.rgba.g}, ${data.rgba.b}, ${data.rgba.a}`);
      if (data.flattened) {
        this.log(`  Source: flattened`);
      } else {
        this.log(`  Layer: ${data.layer}, Frame: ${data.frame}`);
      }
      if (data.paletteMatch) {
        this.log(`  Palette match: ${data.paletteMatch.color} (index ${data.paletteMatch.index}, distance ${data.paletteMatch.distance.toFixed(2)})`);
      }
    });
  }
}
