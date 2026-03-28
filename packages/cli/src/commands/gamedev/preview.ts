import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, exportToGameEngine, formatOutput, makeResult } from '@pixelcreator/core';
import type { GameEngine, GamedevExportOptions } from '@pixelcreator/core';

export default class GamedevPreview extends BaseCommand {
  static description = 'Preview what files would be generated for a game engine export (dry run)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    engine: Flags.string({
      char: 'e',
      description: 'Target game engine',
      options: ['godot', 'unity', 'generic'],
      default: 'generic',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevPreview);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const options: GamedevExportOptions = {
      engine: flags.engine as GameEngine,
      canvas: flags.canvas,
      includeAnimations: true,
      includeTileset: false,
      scale: 1,
      outputDir: '',
    };

    const { files } = exportToGameEngine(projectPath, options);

    const fileList = files.map(f => ({
      name: f.name,
      size: typeof f.content === 'string' ? Buffer.byteLength(f.content, 'utf-8') : f.content.length,
      type: f.name.endsWith('.png') ? 'image' : f.name.endsWith('.tres') || f.name.endsWith('.tscn') ? 'godot-resource' : 'json',
    }));

    const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);

    const resultData = {
      canvas: flags.canvas,
      engine: flags.engine,
      files: fileList,
      fileCount: fileList.length,
      totalSize,
    };

    const cmdResult = makeResult(
      'gamedev:preview',
      { canvas: flags.canvas, engine: flags.engine },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Export preview for "${data.canvas}" (${data.engine} engine)`);
      this.log(`  Files (${data.fileCount}):`);
      for (const f of data.files) {
        const sizeStr = f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`;
        this.log(`    ${f.name} — ${sizeStr} (${f.type})`);
      }
      const totalStr = data.totalSize < 1024 ? `${data.totalSize} B` : `${(data.totalSize / 1024).toFixed(1)} KB`;
      this.log(`  Total: ${totalStr}`);
    });
  }
}
