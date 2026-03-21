import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { renderToHtml, renderAnimationHtml } from '../../io/html-renderer.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportHtml extends BaseCommand {
  static description = 'Export a canvas as an HTML preview file';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination HTML file path',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Frame ID to export (default: first frame)',
    }),
    scale: Flags.integer({
      description: 'Pixel scale factor',
      default: 10,
    }),
    grid: Flags.boolean({
      description: 'Show pixel grid overlay',
      default: false,
    }),
    animated: Flags.boolean({
      description: 'Export all frames as animated HTML',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportHtml);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const destPath = path.resolve(flags.dest);
    const renderOptions = {
      scale: flags.scale,
      grid: flags.grid,
      title: flags.canvas,
    };

    let html: string;
    let frameCount: number;

    if (flags.animated) {
      const frameBuffers = canvas.frames.map((frame) => {
        const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
          info: layerInfo,
          buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frame.id),
        }));
        return flattenLayers(layersWithBuffers, canvas.width, canvas.height);
      });

      const durations = canvas.frames.map((frame) => frame.duration ?? 100);
      html = renderAnimationHtml(frameBuffers, durations, renderOptions);
      frameCount = canvas.frames.length;
    } else {
      const frameId = flags.frame ?? canvas.frames[0]?.id;
      if (!frameId) {
        this.error(`Canvas "${flags.canvas}" has no frames.`);
      }

      const frameExists = canvas.frames.some((f) => f.id === frameId);
      if (!frameExists) {
        this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
      }

      const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
      }));

      const buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
      html = renderToHtml(buffer, renderOptions);
      frameCount = 1;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, html, 'utf-8');

    const resultData = {
      dest: destPath,
      width: canvas.width,
      height: canvas.height,
      animated: flags.animated,
      frames: frameCount,
    };

    const cmdResult = makeResult(
      'export:html',
      { canvas: flags.canvas, dest: flags.dest, frame: flags.frame, scale: flags.scale, grid: flags.grid, animated: flags.animated },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Exported HTML preview to ${data.dest}`);
      this.log(`  Size: ${data.width}x${data.height}, scale ${flags.scale}x`);
      if (data.animated) {
        this.log(`  Animated: ${data.frames} frames`);
      }
      if (flags.grid) {
        this.log(`  Grid: enabled`);
      }
    });
  }
}
