import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class GamedevInfo extends BaseCommand {
  static description = 'Show canvas metadata relevant for game engine export';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const resultData = {
      canvas: flags.canvas,
      width: canvas.width,
      height: canvas.height,
      frameCount: canvas.frames.length,
      layerCount: canvas.layers.length,
      layers: canvas.layers.map(l => ({ id: l.id, name: l.name, type: l.type, visible: l.visible })),
      animationTags: canvas.animationTags.map(t => ({
        name: t.name,
        from: t.from,
        to: t.to,
        direction: t.direction,
      })),
      animationTagCount: canvas.animationTags.length,
    };

    const cmdResult = makeResult(
      'gamedev:info',
      { canvas: flags.canvas },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas: ${data.canvas}`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Frames: ${data.frameCount}`);
      this.log(`  Layers: ${data.layerCount}`);
      for (const layer of data.layers) {
        this.log(`    ${layer.id} — ${layer.name} (${layer.type}${layer.visible ? '' : ', hidden'})`);
      }
      if (data.animationTagCount > 0) {
        this.log(`  Animation tags: ${data.animationTagCount}`);
        for (const tag of data.animationTags) {
          this.log(`    ${tag.name}: frames ${tag.from}-${tag.to} (${tag.direction})`);
        }
      } else {
        this.log(`  Animation tags: none`);
      }
    });
  }
}
