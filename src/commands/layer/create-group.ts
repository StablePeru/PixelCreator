import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON } from '../../io/project-io.js';
import { generateId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerCreateGroup extends BaseCommand {
  static override description = 'Create a layer group (folder) in a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    name: Flags.string({ char: 'n', description: 'Group name', required: true }),
    parent: Flags.string({ description: 'Parent group ID (for nested groups)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerCreateGroup);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const groupId = generateId('group');
    const maxOrder = canvas.layers.reduce((max, l) => Math.max(max, l.order), -1);

    if (flags.parent) {
      const parentLayer = canvas.layers.find((l) => l.id === flags.parent);
      if (!parentLayer || !parentLayer.isGroup) {
        throw new Error(`Parent group "${flags.parent}" not found`);
      }
    }

    canvas.layers.push({
      id: groupId,
      name: flags.name,
      type: 'normal',
      visible: true,
      opacity: 255,
      blendMode: 'normal',
      locked: false,
      order: maxOrder + 1,
      parentId: flags.parent || null,
      isGroup: true,
      clipping: false,
    });

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('layer:create-group', { canvas: flags.canvas, name: flags.name }, { id: groupId, name: flags.name, parent: flags.parent || null }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Created group "${r.name}" (${r.id})${r.parent ? ` inside ${r.parent}` : ''}`);
    });
  }
}
