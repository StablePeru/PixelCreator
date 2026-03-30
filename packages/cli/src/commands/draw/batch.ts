import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  drawPixel,
  drawRect,
  drawLine,
  hexToRGBA,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

interface PixelOp {
  type: 'pixel';
  x: number;
  y: number;
  color: string;
}

interface RectOp {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  fill?: boolean;
}

interface LineOp {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

type DrawOp = PixelOp | RectOp | LineOp;

function validateOp(op: unknown, index: number): DrawOp {
  if (typeof op !== 'object' || op === null) {
    throw new Error(`Operation ${index}: must be an object`);
  }

  const obj = op as Record<string, unknown>;

  if (obj.type === 'pixel') {
    if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
      throw new Error(`Operation ${index} (pixel): x and y must be numbers`);
    }
    if (typeof obj.color !== 'string') {
      throw new Error(`Operation ${index} (pixel): color must be a hex string`);
    }
    return { type: 'pixel', x: obj.x, y: obj.y, color: obj.color };
  }

  if (obj.type === 'rect') {
    if (
      typeof obj.x !== 'number' ||
      typeof obj.y !== 'number' ||
      typeof obj.w !== 'number' ||
      typeof obj.h !== 'number'
    ) {
      throw new Error(`Operation ${index} (rect): x, y, w, h must be numbers`);
    }
    if (typeof obj.color !== 'string') {
      throw new Error(`Operation ${index} (rect): color must be a hex string`);
    }
    return {
      type: 'rect',
      x: obj.x,
      y: obj.y,
      w: obj.w,
      h: obj.h,
      color: obj.color,
      fill: obj.fill === true,
    };
  }

  if (obj.type === 'line') {
    if (
      typeof obj.x1 !== 'number' ||
      typeof obj.y1 !== 'number' ||
      typeof obj.x2 !== 'number' ||
      typeof obj.y2 !== 'number'
    ) {
      throw new Error(`Operation ${index} (line): x1, y1, x2, y2 must be numbers`);
    }
    if (typeof obj.color !== 'string') {
      throw new Error(`Operation ${index} (line): color must be a hex string`);
    }
    return { type: 'line', x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2, color: obj.color };
  }

  throw new Error(
    `Operation ${index}: unknown type "${String(obj.type)}". Must be pixel, rect, or line`,
  );
}

export default class DrawBatch extends BaseCommand {
  static override description =
    'Apply multiple draw operations to a single frame in one pass (1 read, N draws, 1 write)';

  static override flags = {
    ...BaseCommand.baseFlags,
    'ops-file': Flags.string({
      description: 'Path to JSON file containing array of draw operations',
      required: true,
    }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to first layer)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(DrawBatch);
    const projectPath = getProjectPath(flags.project);

    // Load canvas metadata
    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layerId = flags.layer || canvas.layers[0]?.id;
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!layerId || !frameId) throw new Error('Canvas has no layers or frames');

    // Read and parse ops file
    const opsFilePath = path.resolve(flags['ops-file']);
    if (!fs.existsSync(opsFilePath)) {
      throw new Error(`Ops file not found: ${opsFilePath}`);
    }

    let rawOps: unknown;
    try {
      rawOps = JSON.parse(fs.readFileSync(opsFilePath, 'utf-8'));
    } catch {
      throw new Error(`Failed to parse ops file as JSON: ${opsFilePath}`);
    }

    if (!Array.isArray(rawOps)) {
      throw new Error('Ops file must contain a JSON array of operations');
    }

    // Validate ALL operations before touching the buffer
    const ops: DrawOp[] = rawOps.map((op, i) => validateOp(op, i));

    if (ops.length === 0) {
      throw new Error('Ops file contains an empty array — nothing to draw');
    }

    // Single read
    const buffer = readLayerFrame(projectPath, flags.canvas, layerId, frameId);

    // Apply all operations in order
    for (const op of ops) {
      switch (op.type) {
        case 'pixel': {
          const color = hexToRGBA(op.color);
          drawPixel(buffer, op.x, op.y, color);
          break;
        }
        case 'rect': {
          const color = hexToRGBA(op.color);
          drawRect(buffer, op.x, op.y, op.w, op.h, color, op.fill === true);
          break;
        }
        case 'line': {
          const color = hexToRGBA(op.color);
          drawLine(buffer, op.x1, op.y1, op.x2, op.y2, color);
          break;
        }
      }
    }

    // Single write
    writeLayerFrame(projectPath, flags.canvas, layerId, frameId, buffer);

    const result = makeResult(
      'draw:batch',
      {
        canvas: flags.canvas,
        layer: layerId,
        frame: frameId,
        opsFile: flags['ops-file'],
        operationCount: ops.length,
      },
      { applied: ops.length, frame: frameId },
      startTime,
    );
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Applied ${r.applied} draw operations to frame ${r.frame}`);
    });
  }
}
