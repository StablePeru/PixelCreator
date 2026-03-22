import * as path from 'node:path';
import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, readCanvasJSON, readLayerFrame, PixelBuffer, savePNG, flattenLayers, scaleBuffer, renderFrames, composeSpritesheet, encodeGif, encodeApng, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class ExportRun extends BaseCommand {
  static description = 'Run an export profile on a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    profile: Flags.string({
      description: 'Export profile name',
      required: true,
    }),
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Specific frame ID (for single-frame exports)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportRun);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const profile = project.exportProfiles[flags.profile];
    if (!profile) {
      this.error(`Export profile "${flags.profile}" not found.`);
    }

    const destPath = path.resolve(projectPath, profile.dest);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    let outputWidth: number;
    let outputHeight: number;

    switch (profile.target) {
      case 'png': {
        const frameId = flags.frame ?? canvas.frames[0]?.id;
        if (!frameId) {
          this.error(`Canvas "${flags.canvas}" has no frames.`);
        }

        const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
          info: layerInfo,
          buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
        }));

        let buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

        if (profile.scale > 1) {
          buffer = scaleBuffer(buffer, profile.scale);
        }

        savePNG(buffer, destPath);
        outputWidth = buffer.width;
        outputHeight = buffer.height;
        break;
      }

      case 'spritesheet': {
        const frameIndices = canvas.frames.map((_, i) => i);
        const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, profile.scale);
        const durations = canvas.frames.map((f) => f.duration);

        const result = composeSpritesheet(
          renderedFrames,
          canvas.width * profile.scale,
          canvas.height * profile.scale,
          durations,
          canvas.animationTags,
          { layout: 'horizontal', columns: renderedFrames.length, spacing: 0 },
        );

        savePNG(result.buffer, destPath);

        // Write metadata
        const metaPath = destPath.replace(/\.png$/, '.json');
        fs.writeFileSync(metaPath, JSON.stringify(result.metadata, null, 2));

        outputWidth = result.buffer.width;
        outputHeight = result.buffer.height;
        break;
      }

      case 'gif': {
        const frameIndices = canvas.frames.map((_, i) => i);
        const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, profile.scale);

        const gifFrames = renderedFrames.map((buffer, i) => ({
          buffer,
          duration: canvas.frames[i].duration,
        }));

        const gifData = encodeGif(gifFrames, {
          width: canvas.width * profile.scale,
          height: canvas.height * profile.scale,
          loop: 0,
        });

        fs.writeFileSync(destPath, gifData);
        outputWidth = canvas.width * profile.scale;
        outputHeight = canvas.height * profile.scale;
        break;
      }

      case 'apng': {
        const frameIndices = canvas.frames.map((_, i) => i);
        const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, profile.scale);

        const apngFrames = renderedFrames.map((buffer, i) => ({
          buffer,
          duration: canvas.frames[i].duration,
        }));

        const apngData = encodeApng(apngFrames, {
          width: canvas.width * profile.scale,
          height: canvas.height * profile.scale,
          loop: 0,
        });

        fs.writeFileSync(destPath, apngData);
        outputWidth = canvas.width * profile.scale;
        outputHeight = canvas.height * profile.scale;
        break;
      }

      default:
        this.error(`Unsupported export target: ${profile.target}`);
    }

    const resultData = {
      profile: flags.profile,
      target: profile.target,
      canvas: flags.canvas,
      frame: flags.frame ?? null,
      dest: destPath,
      scale: profile.scale,
      width: outputWidth!,
      height: outputHeight!,
    };

    const cmdResult = makeResult(
      'export:run',
      { profile: flags.profile, canvas: flags.canvas, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Exported "${data.canvas}" via profile "${data.profile}"`);
      this.log(`  Target: ${data.target}`);
      this.log(`  Size: ${data.width}x${data.height} (scale ${data.scale}x)`);
      this.log(`  Dest: ${data.dest}`);
    });
  }
}
