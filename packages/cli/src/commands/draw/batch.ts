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
  drawCircle,
  drawEllipse,
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

interface CircleOp {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
  color: string;
  fill?: boolean;
}

interface EllipseOp {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  fill?: boolean;
}

type DrawOp = PixelOp | RectOp | LineOp | CircleOp | EllipseOp;

type ColorMap = Record<string, string>;

function resolveColor(
  obj: Record<string, unknown>,
  index: number,
  typeName: string,
  colors: ColorMap,
): string {
  const hasColor = 'color' in obj && obj.color !== undefined;
  const hasRef = 'colorRef' in obj && obj.colorRef !== undefined;

  if (hasColor && hasRef) {
    throw new Error(`Operation ${index} (${typeName}): cannot specify both "color" and "colorRef"`);
  }

  if (hasRef) {
    if (typeof obj.colorRef !== 'string') {
      throw new Error(`Operation ${index} (${typeName}): colorRef must be a string`);
    }
    const resolved = colors[obj.colorRef];
    if (resolved === undefined) {
      throw new Error(`Operation ${index} (${typeName}): unknown color alias "${obj.colorRef}"`);
    }
    return resolved;
  }

  if (typeof obj.color !== 'string') {
    throw new Error(`Operation ${index} (${typeName}): color must be a hex string`);
  }
  return obj.color;
}

function validateColorMap(raw: unknown): ColorMap {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('"colors" must be a plain object mapping alias names to hex strings');
  }
  const map = raw as Record<string, unknown>;
  const result: ColorMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value !== 'string') {
      throw new Error(`Color alias "${key}": value must be a hex string, got ${typeof value}`);
    }
    result[key] = value;
  }
  return result;
}

function parseBatchDocument(rawOps: unknown): { colors: ColorMap; operations: unknown[] } {
  // Legacy format: plain array
  if (Array.isArray(rawOps)) {
    return { colors: {}, operations: rawOps };
  }

  // Extended format: { colors?, operations }
  if (typeof rawOps === 'object' && rawOps !== null) {
    const doc = rawOps as Record<string, unknown>;
    if (!Array.isArray(doc.operations)) {
      throw new Error(
        'Batch document must be a JSON array or an object with an "operations" array',
      );
    }
    const colors = doc.colors !== undefined ? validateColorMap(doc.colors) : {};
    return { colors, operations: doc.operations };
  }

  throw new Error('Batch document must be a JSON array or an object with an "operations" array');
}

function validateOp(op: unknown, index: number, colors: ColorMap): DrawOp {
  if (typeof op !== 'object' || op === null) {
    throw new Error(`Operation ${index}: must be an object`);
  }

  const obj = op as Record<string, unknown>;

  if (obj.type === 'pixel') {
    if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
      throw new Error(`Operation ${index} (pixel): x and y must be numbers`);
    }
    const color = resolveColor(obj, index, 'pixel', colors);
    return { type: 'pixel', x: obj.x, y: obj.y, color };
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
    const color = resolveColor(obj, index, 'rect', colors);
    return {
      type: 'rect',
      x: obj.x,
      y: obj.y,
      w: obj.w,
      h: obj.h,
      color,
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
    const color = resolveColor(obj, index, 'line', colors);
    return { type: 'line', x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2, color };
  }

  if (obj.type === 'circle') {
    if (
      typeof obj.cx !== 'number' ||
      typeof obj.cy !== 'number' ||
      typeof obj.radius !== 'number'
    ) {
      throw new Error(`Operation ${index} (circle): cx, cy, radius must be numbers`);
    }
    const color = resolveColor(obj, index, 'circle', colors);
    return {
      type: 'circle',
      cx: obj.cx,
      cy: obj.cy,
      radius: obj.radius,
      color,
      fill: obj.fill === true,
    };
  }

  if (obj.type === 'ellipse') {
    if (
      typeof obj.cx !== 'number' ||
      typeof obj.cy !== 'number' ||
      typeof obj.rx !== 'number' ||
      typeof obj.ry !== 'number'
    ) {
      throw new Error(`Operation ${index} (ellipse): cx, cy, rx, ry must be numbers`);
    }
    const color = resolveColor(obj, index, 'ellipse', colors);
    return {
      type: 'ellipse',
      cx: obj.cx,
      cy: obj.cy,
      rx: obj.rx,
      ry: obj.ry,
      color,
      fill: obj.fill === true,
    };
  }

  throw new Error(
    `Operation ${index}: unknown type "${String(obj.type)}". Must be pixel, rect, line, circle, or ellipse`,
  );
}

export default class DrawBatch extends BaseCommand {
  static override description =
    'Apply multiple draw operations to a single frame in one pass (1 read, N draws, 1 write)';

  static override flags = {
    ...BaseCommand.baseFlags,
    'ops-file': Flags.string({
      description: 'Path to JSON file containing array of draw operations (use "-" for stdin)',
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

    // Read and parse ops source (file or stdin when --ops-file -)
    const isStdin = flags['ops-file'] === '-';
    let rawJson: string;

    if (isStdin) {
      try {
        rawJson = fs.readFileSync(0, 'utf-8');
      } catch {
        throw new Error('Failed to read operations from stdin');
      }
    } else {
      const opsFilePath = path.resolve(flags['ops-file']);
      if (!fs.existsSync(opsFilePath)) {
        throw new Error(`Ops file not found: ${opsFilePath}`);
      }
      try {
        rawJson = fs.readFileSync(opsFilePath, 'utf-8');
      } catch {
        throw new Error(`Failed to read ops file: ${opsFilePath}`);
      }
    }

    let rawOps: unknown;
    try {
      rawOps = JSON.parse(rawJson);
    } catch {
      throw new Error(
        isStdin
          ? 'Failed to parse stdin as JSON'
          : `Failed to parse ops file as JSON: ${flags['ops-file']}`,
      );
    }

    // Parse document (legacy array or extended {colors, operations})
    const { colors, operations } = parseBatchDocument(rawOps);

    // Validate ALL operations before touching the buffer
    const ops: DrawOp[] = operations.map((op, i) => validateOp(op, i, colors));

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
        case 'circle': {
          const color = hexToRGBA(op.color);
          drawCircle(buffer, op.cx, op.cy, op.radius, color, op.fill === true);
          break;
        }
        case 'ellipse': {
          const color = hexToRGBA(op.color);
          drawEllipse(buffer, op.cx, op.cy, op.rx, op.ry, color, op.fill === true);
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
