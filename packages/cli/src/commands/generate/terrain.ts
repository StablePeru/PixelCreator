import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, formatOutput, makeResult, generateNoiseMap, mapNoiseToPixels } from '@pixelcreator/core';
import type { NoiseType, NoiseToPixelOptions } from '@pixelcreator/core';

const TERRAIN_PRESETS = {
  island: {
    noiseType: 'fbm' as const,
    scale: 0.05,
    octaves: 6,
    lacunarity: 2.0,
    persistence: 0.5,
    paletteColors: '#1a1a8e,#2288aa,#44cc44,#88aa44,#cccccc,#ffffff',
    radialFalloff: true,
  },
  cave: {
    noiseType: 'turbulence' as const,
    scale: 0.08,
    octaves: 4,
    lacunarity: 2.0,
    persistence: 0.5,
    threshold: 0.45,
    colorAbove: '#333333',
    colorBelow: '#111111',
  },
  clouds: {
    noiseType: 'fbm' as const,
    scale: 0.04,
    octaves: 5,
    lacunarity: 2.0,
    persistence: 0.6,
    paletteColors: '#87ceeb,#ffffff',
  },
};

export default class GenerateTerrain extends BaseCommand {
  static override description = 'Generate terrain using noise presets on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    preset: Flags.string({
      description: 'Terrain preset',
      options: ['island', 'cave', 'clouds'],
      required: true,
    }),
    seed: Flags.integer({ description: 'Random seed', default: Date.now() }),
    'palette-colors': Flags.string({ description: 'Override preset palette (comma-separated hex)' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateTerrain);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const preset = TERRAIN_PRESETS[flags.preset as keyof typeof TERRAIN_PRESETS];
    const width = canvas.width;
    const height = canvas.height;

    const noiseOpts = {
      seed: flags.seed, scale: preset.scale, octaves: preset.octaves,
      lacunarity: preset.lacunarity, persistence: preset.persistence,
    };
    const noiseMap = generateNoiseMap(width, height, preset.noiseType as NoiseType, noiseOpts);

    // Apply radial falloff for island preset
    if ('radialFalloff' in preset && preset.radialFalloff) {
      const cx = width / 2;
      const cy = height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
          const falloff = Math.max(0, 1 - dist * 1.5);
          noiseMap[y * width + x] *= falloff;
        }
      }
    }

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    const mapOptions: Record<string, unknown> = {};

    if ('threshold' in preset) {
      mapOptions.mode = 'threshold';
      mapOptions.threshold = preset.threshold;
      mapOptions.colorAbove = preset.colorAbove;
      mapOptions.colorBelow = preset.colorBelow;
    } else {
      const colorStr = flags['palette-colors'] || ('paletteColors' in preset ? preset.paletteColors : undefined);
      if (colorStr) {
        mapOptions.mode = 'palette';
        mapOptions.paletteColors = colorStr.split(',').map((c: string) => c.trim());
      } else {
        mapOptions.mode = 'grayscale';
      }
    }

    mapNoiseToPixels(buffer, noiseMap, mapOptions as NoiseToPixelOptions);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      frame: frameId,
      preset: flags.preset,
      seed: flags.seed,
      noiseType: preset.noiseType,
      width,
      height,
    };

    const result = makeResult('generate:terrain', {
      canvas: flags.canvas, preset: flags.preset, seed: flags.seed,
      'palette-colors': flags['palette-colors'], layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated "${r.preset}" terrain on "${r.canvas}" (${r.width}x${r.height})`);
      this.log(`  Noise: ${r.noiseType}, Seed: ${r.seed}`);
    });
  }
}
