import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { generateNoiseMap, formatOutput, makeResult } from '@pixelcreator/core';

const ASCII_BLOCKS = [' ', '\u2591', '\u2592', '\u2593', '\u2588'];

export default class GeneratePreview extends BaseCommand {
  static override description = 'Preview procedural noise as ASCII art in the terminal';

  static override flags = {
    ...BaseCommand.baseFlags,
    width: Flags.integer({ description: 'Preview width in characters', default: 40 }),
    height: Flags.integer({ description: 'Preview height in characters', default: 20 }),
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
    const { flags } = await this.parse(GeneratePreview);

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

    const lines: string[] = [];
    for (let y = 0; y < flags.height; y++) {
      let line = '';
      for (let x = 0; x < flags.width; x++) {
        const value = noiseMap[y * flags.width + x];
        const index = Math.min(ASCII_BLOCKS.length - 1, Math.max(0, Math.floor(value * ASCII_BLOCKS.length)));
        line += ASCII_BLOCKS[index];
      }
      lines.push(line);
    }

    const rendered = lines.join('\n');

    const resultData = {
      width: flags.width,
      height: flags.height,
      type: flags.type,
      seed: flags.seed,
      scale,
      renderedLines: lines.length,
    };

    const result = makeResult('generate:preview', {
      width: flags.width, height: flags.height, type: flags.type,
      seed: flags.seed, scale, octaves: flags.octaves,
      lacunarity, persistence,
    }, resultData, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, () => {
      console.log(rendered);
    });
  }
}
