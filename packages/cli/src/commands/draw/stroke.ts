import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  hexToRGBA,
  createDefaultPresets,
  applySymmetricStroke,
  applySymmetricPressureStroke,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';
import { parsePoints } from '@pixelcreator/core';
import type {
  SymmetryConfig,
  SymmetryMode,
  PressureCurve,
  PressureSensitivityConfig,
} from '@pixelcreator/core';

export default class DrawStroke extends BaseCommand {
  static override description = 'Draw a brush stroke along a series of points';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    points: Flags.string({ description: 'Points as "x1,y1 x2,y2 ..."', required: true }),
    color: Flags.string({ description: 'Stroke color as hex', required: true }),
    brush: Flags.string({
      description: 'Brush preset ID (default: brush-001)',
      default: 'brush-001',
    }),
    symmetry: Flags.string({
      description: 'Symmetry mode',
      options: ['none', 'horizontal', 'vertical', 'both', 'radial'],
      default: 'none',
    }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    pressure: Flags.string({
      description: 'Pressure values per point as "0.3 0.6 1.0 0.8" (each in 0..1)',
    }),
    'pressure-curve': Flags.string({
      description: 'Pressure response curve (overrides preset)',
      options: ['linear', 'soft', 'hard'],
    }),
    'pressure-min-size': Flags.string({
      description: 'Minimum size ratio at zero pressure, 0..1 (overrides preset)',
    }),
    'pressure-min-opacity': Flags.string({
      description: 'Minimum opacity ratio at zero pressure, 0..1 (overrides preset)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawStroke);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    const project = readProjectJSON(projectPath);
    const defaults = createDefaultPresets();
    const custom = project.settings?.brushPresets ?? [];
    const preset = [...defaults, ...custom].find((p) => p.id === flags.brush);
    if (!preset) throw new Error(`Brush preset not found: ${flags.brush}`);

    const color = hexToRGBA(flags.color);
    const pts = parsePoints(flags.points);
    const symmetry: SymmetryConfig =
      canvas.symmetry && flags.symmetry === 'none'
        ? canvas.symmetry
        : { mode: flags.symmetry as SymmetryMode };

    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    const usePressure = flags.pressure !== undefined;

    if (usePressure) {
      const pressureValues = this.parsePressureValues(flags.pressure!, pts.length);
      const pressureConfig = this.resolvePressureConfig(flags, preset.pressureSensitivity);
      const pressurePreset = { ...preset, pressureSensitivity: pressureConfig };
      applySymmetricPressureStroke(buffer, pts, pressureValues, color, pressurePreset, symmetry);
    } else {
      applySymmetricStroke(buffer, pts, color, preset, symmetry);
    }

    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult(
      'draw:stroke',
      {
        canvas: flags.canvas,
        brush: flags.brush,
        color: flags.color,
        symmetry: symmetry.mode,
        pointCount: pts.length,
        pressure: usePressure,
      },
      {
        brush: preset.name,
        pointCount: pts.length,
        symmetry: symmetry.mode,
        pressure: usePressure,
      },
      startTime,
    );
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      const pressureLabel = r.pressure ? ' with pressure' : '';
      this.log(
        `Stroke drawn with brush "${r.brush}" (${r.pointCount} points, symmetry: ${r.symmetry}${pressureLabel})`,
      );
    });
  }

  private parsePressureValues(raw: string, expectedLength: number): number[] {
    const values = raw.trim().split(/\s+/).map(Number);

    if (values.some((v) => Number.isNaN(v))) {
      throw new Error('Invalid pressure values: all values must be numbers');
    }

    if (values.length !== expectedLength) {
      throw new Error(
        `Pressure array length (${values.length}) must match points length (${expectedLength})`,
      );
    }

    for (const v of values) {
      if (v < 0 || v > 1) {
        throw new Error(`Pressure value ${v} out of range: must be between 0 and 1`);
      }
    }

    return values;
  }

  private resolvePressureConfig(
    flags: Record<string, any>,
    presetConfig?: PressureSensitivityConfig,
  ): PressureSensitivityConfig {
    // Defaults used when neither inline nor preset provides a value
    const fallbackCurve: PressureCurve = 'linear';
    const fallbackMinSize = 0.2;
    const fallbackMinOpacity = 0.2;

    const hasInlineCurve = flags['pressure-curve'] !== undefined;
    const hasInlineMinSize = flags['pressure-min-size'] !== undefined;
    const hasInlineMinOpacity = flags['pressure-min-opacity'] !== undefined;

    const curve: PressureCurve = hasInlineCurve
      ? (flags['pressure-curve'] as PressureCurve)
      : (presetConfig?.curve ?? fallbackCurve);

    const minSize = hasInlineMinSize
      ? this.parseRatio(flags['pressure-min-size'], 'pressure-min-size')
      : (presetConfig?.minSize ?? fallbackMinSize);

    const minOpacity = hasInlineMinOpacity
      ? this.parseRatio(flags['pressure-min-opacity'], 'pressure-min-opacity')
      : (presetConfig?.minOpacity ?? fallbackMinOpacity);

    return { enabled: true, curve, minSize, minOpacity };
  }

  private parseRatio(raw: string, flagName: string): number {
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > 1) {
      throw new Error(`--${flagName} must be a number between 0 and 1, got "${raw}"`);
    }
    return value;
  }
}
