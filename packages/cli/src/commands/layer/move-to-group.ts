import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerMoveToGroup extends BaseCommand {
  static override description = 'Move a layer into a group (or back to root)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID to move', required: true }),
    group: Flags.string({ description: 'Target group ID (omit to move to root)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerMoveToGroup);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found`);

    if (flags.group) {
      const group = canvas.layers.find((l) => l.id === flags.group);
      if (!group || !group.isGroup) throw new Error(`Group "${flags.group}" not found`);
      if (flags.group === flags.layer) throw new Error('Cannot move a layer into itself');
    }

    layer.parentId = flags.group || null;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:move-to-group', { canvas: flags.canvas, layer: flags.layer, group: flags.group }, { layerId: flags.layer, groupId: flags.group || null }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Moved layer ${r.layerId} to ${r.groupId ? `group ${r.groupId}` : 'root'}`);
    });
  }
}
