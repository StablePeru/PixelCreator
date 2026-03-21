import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { rgbToHsl } from '../../core/color-analysis-engine.js';
import { hexToRGBA, rgbaToHex } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawColorInfo extends BaseCommand {
  static description = 'Display detailed information about a color';

  static flags = {
    ...BaseCommand.baseFlags,
    project: Flags.string({
      char: 'p',
      description: 'Path to .pxc project',
      required: false,
    }),
    color: Flags.string({
      description: 'Color in hex format (e.g. #ff0000)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawColorInfo);

    const format = this.getOutputFormat(flags);

    const rgba = hexToRGBA(flags.color);
    const hsl = rgbToHsl(rgba.r, rgba.g, rgba.b);
    const normalizedHex = rgbaToHex(rgba);

    const resultData = {
      hex: normalizedHex,
      r: rgba.r,
      g: rgba.g,
      b: rgba.b,
      a: rgba.a,
      h: hsl.h,
      s: hsl.s,
      l: hsl.l,
    };

    const cmdResult = makeResult(
      'draw:color-info',
      { color: flags.color },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Color: ${data.hex}`);
      console.log(`  RGB:  ${data.r}, ${data.g}, ${data.b}`);
      console.log(`  Alpha: ${data.a}`);
      console.log(`  HSL:  ${data.h}deg, ${data.s}%, ${data.l}%`);
    });
  }
}
