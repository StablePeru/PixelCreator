import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, extractRegion, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

export default class CanvasExtract extends BaseCommand {
  static description = 'Extract a region from a canvas as a new canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Source canvas name',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'New canvas name',
      required: true,
    }),
    x: Flags.integer({
      description: 'X coordinate of the region',
      required: true,
    }),
    y: Flags.integer({
      description: 'Y coordinate of the region',
      required: true,
    }),
    width: Flags.integer({
      description: 'Width of the region',
      required: true,
    }),
    height: Flags.integer({
      description: 'Height of the region',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasExtract);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.canvases.includes(flags.canvas)) {
      this.error(`Canvas "${flags.canvas}" not found in project.`);
    }

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists.`);
    }

    const sourceCanvas = readCanvasJSON(projectPath, flags.canvas);

    // Validate bounds
    if (flags.x < 0 || flags.y < 0 || flags.width < 1 || flags.height < 1) {
      this.error('Region coordinates must be non-negative and dimensions must be at least 1.');
    }

    if (flags.x + flags.width > sourceCanvas.width || flags.y + flags.height > sourceCanvas.height) {
      this.error(`Region (${flags.x},${flags.y} ${flags.width}x${flags.height}) exceeds canvas bounds (${sourceCanvas.width}x${sourceCanvas.height}).`);
    }

    const now = new Date().toISOString();

    // Create new canvas with same layer structure
    const newLayers = sourceCanvas.layers.map((l, i) => ({
      id: generateSequentialId('layer', i + 1),
      name: l.name,
      type: l.type,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      locked: l.locked,
      order: l.order,
    }));

    const newFrames = sourceCanvas.frames.map((f, i) => ({
      id: generateSequentialId('frame', i + 1),
      index: i,
      duration: f.duration,
    }));

    const newCanvas: CanvasData = {
      name: flags.name,
      width: flags.width,
      height: flags.height,
      created: now,
      modified: now,
      palette: sourceCanvas.palette,
      layers: newLayers,
      frames: newFrames,
      animationTags: [],
    };

    writeCanvasJSON(projectPath, flags.name, newCanvas);

    // Extract region for each layer and frame
    for (let li = 0; li < sourceCanvas.layers.length; li++) {
      for (let fi = 0; fi < sourceCanvas.frames.length; fi++) {
        const buffer = readLayerFrame(projectPath, flags.canvas, sourceCanvas.layers[li].id, sourceCanvas.frames[fi].id);
        const region = extractRegion(buffer, flags.x, flags.y, flags.width, flags.height);
        writeLayerFrame(projectPath, flags.name, newLayers[li].id, newFrames[fi].id, region);
      }
    }

    project.canvases.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      source: flags.canvas,
      name: flags.name,
      region: { x: flags.x, y: flags.y, width: flags.width, height: flags.height },
      layers: newLayers.length,
      frames: newFrames.length,
    };

    const cmdResult = makeResult('canvas:extract', {
      canvas: flags.canvas, name: flags.name,
      x: flags.x, y: flags.y, width: flags.width, height: flags.height,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Extracted region from "${data.source}" as "${data.name}"`);
      this.log(`  Region: (${data.region.x},${data.region.y}) ${data.region.width}x${data.region.height}`);
      this.log(`  Layers: ${data.layers}, Frames: ${data.frames}`);
    });
  }
}
