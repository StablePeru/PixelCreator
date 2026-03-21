import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  readCanvasJSON,
  readPaletteJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { validateBufferAgainstPalette } from '../../core/palette-engine.js';
import type { PaletteViolation } from '../../core/palette-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

interface CanvasValidationResult {
  canvas: string;
  palette: string;
  violations: number;
  passed: boolean;
  details: PaletteViolation[];
}

export default class ValidatePalette extends BaseCommand {
  static description = 'Validate canvas pixels against a palette';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name to validate',
    }),
    palette: Flags.string({
      description: 'Override palette name',
    }),
    all: Flags.boolean({
      description: 'Validate all canvases in the project',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidatePalette);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!flags.canvas && !flags.all) {
      this.error('Specify --canvas or --all to select canvases to validate.');
    }

    const canvasNames = flags.all ? project.canvases : [flags.canvas!];
    const results: CanvasValidationResult[] = [];

    for (const canvasName of canvasNames) {
      const canvas = readCanvasJSON(projectPath, canvasName);
      const paletteName = flags.palette ?? canvas.palette;

      if (!paletteName) {
        results.push({
          canvas: canvasName,
          palette: 'none',
          violations: 0,
          passed: true,
          details: [],
        });
        continue;
      }

      const palette = readPaletteJSON(projectPath, paletteName);
      const allViolations: PaletteViolation[] = [];

      for (const layer of canvas.layers) {
        for (const frame of canvas.frames) {
          const buffer = readLayerFrame(projectPath, canvasName, layer.id, frame.id);
          const violations = validateBufferAgainstPalette(buffer, palette, layer.id, frame.id);
          allViolations.push(...violations);
        }
      }

      results.push({
        canvas: canvasName,
        palette: paletteName,
        violations: allViolations.length,
        passed: allViolations.length === 0,
        details: allViolations,
      });
    }

    const cmdResult = makeResult(
      'validate:palette',
      { canvas: flags.canvas, palette: flags.palette, all: flags.all },
      { results, totalViolations: results.reduce((sum, r) => sum + r.violations, 0) },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      for (const r of data.results) {
        if (r.passed) {
          this.log(`${r.canvas} (${r.palette}): PASS`);
        } else {
          this.log(`${r.canvas} (${r.palette}): FAIL: ${r.violations} violations`);
        }
      }

      if (data.totalViolations > 0) {
        this.log(`\nTotal violations: ${data.totalViolations}`);
      }
    });
  }
}
