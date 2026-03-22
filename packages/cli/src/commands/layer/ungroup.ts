import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerUngroup extends BaseCommand {
  static override description = 'Dissolve a layer group (children move to root)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    group: Flags.string({ description: 'Group ID to dissolve', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerUngroup);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const groupIdx = canvas.layers.findIndex((l) => l.id === flags.group);
    if (groupIdx === -1) throw new Error(`Group "${flags.group}" not found`);

    const group = canvas.layers[groupIdx];
    if (!group.isGroup) throw new Error(`Layer "${flags.group}" is not a group`);

    const groupParent = group.parentId ?? null;

    // Move all children to the group's parent
    let movedCount = 0;
    for (const layer of canvas.layers) {
      if ((layer.parentId ?? null) === flags.group) {
        layer.parentId = groupParent;
        movedCount++;
      }
    }

    // Remove the group layer
    canvas.layers.splice(groupIdx, 1);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:ungroup', { canvas: flags.canvas, group: flags.group }, { groupId: flags.group, childrenMoved: movedCount }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Dissolved group ${r.groupId}, moved ${r.childrenMoved} children to parent`);
    });
  }
}
