import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { hexToRGBA, checkContrast, formatOutput, makeResult } from '@pixelcreator/core';

export default class DrawContrastCheck extends BaseCommand {
  static override description = 'Check WCAG contrast ratio between two hex colors';

  static override flags = {
    ...BaseCommand.baseFlags,
    fg: Flags.string({ description: 'Foreground color as hex (e.g. #ffffff)', required: true }),
    bg: Flags.string({ description: 'Background color as hex (e.g. #000000)', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawContrastCheck);

    const format = this.getOutputFormat(flags);

    const fgColor = hexToRGBA(flags.fg);
    const bgColor = hexToRGBA(flags.bg);
    const contrast = checkContrast(fgColor, bgColor);

    const resultData = {
      fg: flags.fg,
      bg: flags.bg,
      ratio: contrast.ratio,
      passAA: contrast.passAA,
      passAALarge: contrast.passAALarge,
      passAAA: contrast.passAAA,
      passAAALarge: contrast.passAAALarge,
    };

    const cmdResult = makeResult(
      'draw:contrast-check',
      { fg: flags.fg, bg: flags.bg },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Contrast check: ${data.fg} on ${data.bg}`);
      this.log(`  Ratio: ${data.ratio.toFixed(2)}:1`);
      this.log(`  WCAG AA (normal text):  ${data.passAA ? 'PASS' : 'FAIL'}`);
      this.log(`  WCAG AA (large text):   ${data.passAALarge ? 'PASS' : 'FAIL'}`);
      this.log(`  WCAG AAA (normal text): ${data.passAAA ? 'PASS' : 'FAIL'}`);
      this.log(`  WCAG AAA (large text):  ${data.passAAALarge ? 'PASS' : 'FAIL'}`);
    });
  }
}
