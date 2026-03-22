import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readPaletteJSON, readLayerFrame, writeLayerFrame, flattenLayers, generatePaletteCycleFrames, hexToRGBA, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class AnimationCyclePalette extends BaseCommand {
  static override description = 'Generate animation frames by cycling palette colors';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    palette: Flags.string({ description: 'Palette name', required: true }),
    indices: Flags.string({ description: 'Comma-separated palette indices to cycle: "0,1,2,3"', required: true }),
    frames: Flags.integer({ description: 'Number of frames to generate', required: true }),
    duration: Flags.integer({ description: 'Duration per frame in ms', default: 100 }),
    frame: Flags.integer({ description: 'Source frame index', default: 0 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationCyclePalette);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const palette = readPaletteJSON(projectPath, flags.palette);

    const cycleIndices = flags.indices.split(',').map((s) => parseInt(s.trim(), 10));
    for (const idx of cycleIndices) {
      if (idx < 0 || idx >= palette.colors.length) {
        throw new Error(`Palette index ${idx} out of range (0-${palette.colors.length - 1})`);
      }
    }

    const paletteColors = palette.colors.map((c) => hexToRGBA(c.hex));
    const sourceFrameId = canvas.frames[flags.frame]?.id;
    if (!sourceFrameId) throw new Error(`Frame ${flags.frame} not found`);

    // Flatten source frame
    const lwb: LayerWithBuffer[] = canvas.layers.map((l) => ({
      info: l,
      buffer: readLayerFrame(projectPath, flags.canvas, l.id, sourceFrameId),
    }));
    const sourceBuf = flattenLayers(lwb, canvas.width, canvas.height);

    const cycledFrames = generatePaletteCycleFrames(sourceBuf, paletteColors, cycleIndices, flags.frames);

    // Add frames to canvas
    const layerId = canvas.layers[0]?.id;
    if (!layerId) throw new Error('Canvas has no layers');

    for (let i = 0; i < cycledFrames.length; i++) {
      const frameId = generateSequentialId('cycle', canvas.frames.length + i);
      canvas.frames.push({
        id: frameId,
        index: canvas.frames.length,
        duration: flags.duration,
      });
      writeLayerFrame(projectPath, flags.canvas, layerId, frameId, cycledFrames[i]);
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('animation:cycle-palette', { canvas: flags.canvas, palette: flags.palette, indices: flags.indices, frames: flags.frames }, { framesGenerated: cycledFrames.length, cycleColors: cycleIndices.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Generated ${r.framesGenerated} palette cycle frames (${r.cycleColors} colors cycling)`);
    });
  }
}
