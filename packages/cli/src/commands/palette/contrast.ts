import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, hexToRGBA, contrastRatio, formatOutput, makeResult } from '@pixelcreator/core';

interface ColorPairResult {
  colorA: string;
  colorB: string;
  ratio: number;
  passes: boolean;
}

export default class PaletteContrast extends BaseCommand {
  static override description = 'Check contrast ratios between palette colors';

  static override flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    'min-ratio': Flags.string({
      description: 'Minimum contrast ratio to display',
      default: '4.5',
    }),
    all: Flags.boolean({
      description: 'Show all pairs regardless of ratio',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteContrast);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    const minRatio = Number.parseFloat(flags['min-ratio']);
    const pairs: ColorPairResult[] = [];

    for (let i = 0; i < palette.colors.length; i++) {
      for (let j = i + 1; j < palette.colors.length; j++) {
        const colorA = palette.colors[i];
        const colorB = palette.colors[j];
        const rgbaA = hexToRGBA(colorA.hex);
        const rgbaB = hexToRGBA(colorB.hex);
        const ratio = contrastRatio(rgbaA, rgbaB);
        const passes = ratio >= minRatio;

        if (flags.all || passes) {
          pairs.push({
            colorA: colorA.hex,
            colorB: colorB.hex,
            ratio,
            passes,
          });
        }
      }
    }

    // Sort by ratio descending
    pairs.sort((a, b) => b.ratio - a.ratio);

    const resultData = {
      palette: flags.name,
      minRatio,
      totalPairs: (palette.colors.length * (palette.colors.length - 1)) / 2,
      passingPairs: pairs.filter((p) => p.passes).length,
      pairs,
    };

    const cmdResult = makeResult(
      'palette:contrast',
      { name: flags.name, 'min-ratio': flags['min-ratio'], all: flags.all },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette "${data.palette}" contrast analysis (min ratio: ${data.minRatio}:1)`);
      this.log(`  ${data.passingPairs}/${data.totalPairs} pairs meet minimum ratio\n`);
      for (const pair of data.pairs) {
        const status = pair.passes ? 'PASS' : 'FAIL';
        this.log(`  ${pair.colorA} / ${pair.colorB}  ${pair.ratio.toFixed(2)}:1  ${status}`);
      }
    });
  }
}
