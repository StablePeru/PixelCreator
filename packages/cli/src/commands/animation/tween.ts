import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, flattenLayers, tweenFrames, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class AnimationTween extends BaseCommand {
  static override description = 'Generate interpolated frames between two keyframes';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    from: Flags.integer({ description: 'Start frame index', required: true }),
    to: Flags.integer({ description: 'End frame index', required: true }),
    steps: Flags.integer({ description: 'Number of intermediate frames to generate', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID (defaults to flattened)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationTween);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    if (flags.from < 0 || flags.from >= canvas.frames.length) throw new Error('Invalid from frame index');
    if (flags.to < 0 || flags.to >= canvas.frames.length) throw new Error('Invalid to frame index');
    if (flags.steps < 1) throw new Error('Steps must be at least 1');

    const fromFrameId = canvas.frames[flags.from].id;
    const toFrameId = canvas.frames[flags.to].id;

    // Get flattened or single-layer buffers
    let fromBuf, toBuf;
    if (flags.layer) {
      fromBuf = readLayerFrame(projectPath, flags.canvas, flags.layer, fromFrameId);
      toBuf = readLayerFrame(projectPath, flags.canvas, flags.layer, toFrameId);
    } else {
      const getFlattened = (frameId: string) => {
        const lwb: LayerWithBuffer[] = canvas.layers.map((l) => ({
          info: l,
          buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
        }));
        return flattenLayers(lwb, canvas.width, canvas.height);
      };
      fromBuf = getFlattened(fromFrameId);
      toBuf = getFlattened(toFrameId);
    }

    const tweened = tweenFrames(fromBuf, toBuf, flags.steps);

    // Insert frames after 'from'
    const insertIdx = flags.from + 1;
    const layerId = flags.layer || canvas.layers[0]?.id;
    if (!layerId) throw new Error('Canvas has no layers');

    const newFrames = [];
    for (let i = 0; i < tweened.length; i++) {
      const frameId = generateSequentialId('tween', insertIdx + i);
      newFrames.push({
        id: frameId,
        index: insertIdx + i,
        duration: canvas.frames[flags.from].duration,
      });
      writeLayerFrame(projectPath, flags.canvas, layerId, frameId, tweened[i]);
    }

    // Insert into frames array
    canvas.frames.splice(insertIdx, 0, ...newFrames);

    // Reindex
    for (let i = 0; i < canvas.frames.length; i++) {
      canvas.frames[i].index = i;
    }

    // Adjust animation tags
    for (const tag of canvas.animationTags) {
      if (tag.from >= insertIdx) tag.from += tweened.length;
      if (tag.to >= insertIdx) tag.to += tweened.length;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('animation:tween', { canvas: flags.canvas, from: flags.from, to: flags.to, steps: flags.steps }, { framesGenerated: tweened.length, insertedAt: insertIdx }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Generated ${r.framesGenerated} tween frames between frame ${flags.from} and ${flags.to}`);
    });
  }
}
