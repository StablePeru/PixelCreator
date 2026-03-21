import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, readCanvasJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasList extends BaseCommand {
  static description = 'List all canvases in the project';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const canvases = project.canvases.map((name) => {
      const canvas = readCanvasJSON(projectPath, name);
      return {
        name: canvas.name,
        width: canvas.width,
        height: canvas.height,
        layers: canvas.layers.length,
        frames: canvas.frames.length,
      };
    });

    const resultData = { canvases };

    const cmdResult = makeResult(
      'canvas:list',
      {},
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.canvases.length === 0) {
        this.log('No canvases found.');
        return;
      }
      this.log(`Canvases (${data.canvases.length}):`);
      for (const c of data.canvases) {
        this.log(`  ${c.name} — ${c.width}x${c.height}, ${c.layers} layer(s), ${c.frames} frame(s)`);
      }
    });
  }
}
