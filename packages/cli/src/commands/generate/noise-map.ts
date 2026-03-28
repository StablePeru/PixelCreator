import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { PixelBuffer, savePNG, generateNoiseMap, mapNoiseToPixels, formatOutput, makeResult } from '@pixelcreator/core';

export default class GenerateNoiseMap extends BaseCommand {
  static override description = 'Generate a standalone noise map PNG (no project required)';

  static override flags = {
    ...BaseCommand.baseFlags,
    width: Flags.integer({ description: 'Image width in pixels', required: true }),
    height: Flags.integer({ description: 'Image height in pixels', required: true }),
    out: Flags.string({ description: 'Output PNG file path', required: true }),
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
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GenerateNoiseMap);

    const scale = parseFloat(flags.scale);
    const lacunarity = parseFloat(flags.lacunarity);
    const persistence = parseFloat(flags.persistence);

    const noiseType = flags.type as 'simplex' | 'fbm' | 'turbulence';
    const noiseMap = generateNoiseMap(flags.width, flags.height, noiseType, {
      seed: flags.seed,
      scale,
      octaves: flags.octaves,
      lacunarity,
      persistence,
    });

    const buffer = new PixelBuffer(flags.width, flags.height);
    mapNoiseToPixels(buffer, noiseMap, { mode: 'grayscale' });

    const destPath = path.resolve(flags.out);
    savePNG(buffer, destPath);

    const resultData = {
      width: flags.width,
      height: flags.height,
      type: flags.type,
      seed: flags.seed,
      scale,
      octaves: flags.octaves,
      dest: destPath,
    };

    const result = makeResult('generate:noise-map', {
      width: flags.width, height: flags.height, out: flags.out,
      type: flags.type, seed: flags.seed, scale, octaves: flags.octaves,
      lacunarity, persistence,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Generated ${r.type} noise map (${r.width}x${r.height}) -> ${r.dest}`);
      this.log(`  Seed: ${r.seed}, Scale: ${r.scale}, Octaves: ${r.octaves}`);
    });
  }
}
