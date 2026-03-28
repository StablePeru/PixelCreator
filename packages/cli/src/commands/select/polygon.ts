import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readSelection,
  writeSelection,
  createPolygonSelection,
  mergeSelections,
  parsePoints,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class SelectPolygon extends BaseCommand {
  static override description = 'Create a polygon selection from vertex points';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    points: Flags.string({
      description: 'Space-separated "x,y" vertex coordinates (at least 3)',
      required: true,
    }),
    add: Flags.boolean({
      description: 'Add to existing selection instead of replacing',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectPolygon);
    const projectPath = getProjectPath(flags.project);

    const pts = parsePoints(flags.points);
    if (pts.length < 3) this.error('At least 3 vertices required for polygon selection');

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let mask = createPolygonSelection(canvas.width, canvas.height, pts);

    if (flags.add) {
      const existing = readSelection(projectPath, flags.canvas);
      if (existing) mask = mergeSelections(existing, mask);
    }

    writeSelection(projectPath, flags.canvas, mask);

    const result = makeResult(
      'select:polygon',
      { canvas: flags.canvas, vertexCount: pts.length, add: flags.add },
      { vertexCount: pts.length, add: flags.add },
      startTime,
    );
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(
        `Polygon selection created with ${r.vertexCount} vertices${r.add ? ' (added to existing)' : ''}`,
      );
    });
  }
}
