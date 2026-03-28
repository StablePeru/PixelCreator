import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, formatOutput, makeResult, hexToRGBA, generateSimplexNoise, generateFbm, generateTurbulence, mapNoiseToPixels } from '@pixelcreator/core';

export default class GenerateNoise extends BaseCommand {
  static override description = 'Generate procedural noise on a canvas layer frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    type: Flags.string({
      description: 'Noise algorithm type',
      options: ['simplex', 'fbm', 'turbulence'],
      default: 'simplex',
    }),
    seed: Flags.integer({ description: 'Random seed', default: Date.now() }),
    scale: Flags.string({ description: 'Noise scale (frequency)', default: '0.1' }),
    octaves: Flags.integer({ description: 'Number of octaves for fBm/turbulence', default: 4 }),
    lacunarity: Flags.string({ description: 'Frequency multiplier per octave', default: '2.0' }),
    persistence: Flags.string({ description: 'Amplitude multiplier per octave', default: '0.5' }),
    mode: Flags.string({
      description: 'Mapping mode',
      options: ['grayscale', 'palette', 'threshold'],
      default: 'grayscale',
    }),
    threshold: Flags.string({ description: 'Threshold value for threshold mode (0.0-1.0)' }),
    'color-above': Flags.string({ description: 'Color for values above threshold (hex)' }),
    'color-below': Flags.string({ description: 'Color for values below threshold (hex)' }),
    'palette-colors': Flags.string({ description: 'Comma-separated hex colors for palette mode' }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateNoise);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const scale = parseFloat(flags.scale);
    const lacunarity = parseFloat(flags.lacunarity);
    const persistence = parseFloat(flags.persistence);

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    const mapping: Record<string, unknown> = { mode: flags.mode };
    if (flags.mode === 'threshold') {
      mapping.threshold = flags.threshold ? parseFloat(flags.threshold) : 0.5;
      mapping.colorAbove = flags['color-above'] ?? '#ffffff';
      mapping.colorBelow = flags['color-below'] ?? '#000000';
    } else if (flags.mode === 'palette' && flags['palette-colors']) {
      mapping.paletteColors = flags['palette-colors'].split(',').map((c: string) => c.trim());
    }

    const noiseOpts = { seed: flags.seed, scale, octaves: flags.octaves, lacunarity, persistence };

    switch (flags.type) {
      case 'fbm':
        generateFbm(buffer, noiseOpts, mapping as any);
        break;
      case 'turbulence':
        generateTurbulence(buffer, noiseOpts, mapping as any);
        break;
      default:
        generateSimplexNoise(buffer, { seed: flags.seed, scale }, mapping as any);
        break;
    }
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const resultData = {
      canvas: flags.canvas,
      layer: layerId,
      frame: frameId,
      type: flags.type,
      seed: flags.seed,
      scale,
      mode: flags.mode,
      width: canvas.width,
      height: canvas.height,
    };

    const result = makeResult('generate:noise', {
      canvas: flags.canvas, type: flags.type, seed: flags.seed, scale,
      octaves: flags.octaves, lacunarity, persistence, mode: flags.mode,
      layer: layerId, frame: frameId,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated ${r.type} noise on "${r.canvas}" (${r.width}x${r.height})`);
      this.log(`  Seed: ${r.seed}, Scale: ${r.scale}, Mode: ${r.mode}`);
    });
  }
}
