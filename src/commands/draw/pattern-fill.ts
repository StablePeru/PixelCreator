import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { loadPNG } from '../../io/png-codec.js';
import { drawPatternFill } from '../../core/drawing-engine.js';
import { parseRect } from '../../utils/point-parser.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class DrawPatternFill extends BaseCommand {
  static override description = 'Fill a region with a repeating pattern';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    pattern: Flags.string({ description: 'Path to external PNG pattern file' }),
    'pattern-layer': Flags.string({ description: 'Layer ID to use as pattern source' }),
    'offset-x': Flags.integer({ description: 'Pattern offset X', default: 0 }),
    'offset-y': Flags.integer({ description: 'Pattern offset Y', default: 0 }),
    region: Flags.string({ description: 'Region to fill: "x,y,w,h"' }),
    layer: Flags.string({ char: 'l', description: 'Target layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawPatternFill);
    const projectPath = getProjectPath(flags.project);

    if (!flags.pattern && !flags['pattern-layer']) {
      throw new Error('Must provide --pattern (PNG path) or --pattern-layer (layer ID)');
    }

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    let patternBuffer;
    let patternSource: string;
    if (flags.pattern) {
      patternBuffer = loadPNG(flags.pattern);
      patternSource = flags.pattern;
    } else {
      patternBuffer = readLayerFrame(projectPath, flags.canvas, flags['pattern-layer']!, frameId);
      patternSource = `layer:${flags['pattern-layer']}`;
    }

    const region = flags.region ? parseRect(flags.region) : undefined;
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);
    drawPatternFill(buffer, patternBuffer, region, flags['offset-x'], flags['offset-y']);
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult('draw:pattern-fill', { canvas: flags.canvas, pattern: patternSource }, { patternSource, offsetX: flags['offset-x'], offsetY: flags['offset-y'], region: flags.region }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Pattern fill applied from ${r.patternSource}`);
    });
  }
}
