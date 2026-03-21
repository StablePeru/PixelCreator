import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerEdit extends BaseCommand {
  static description = 'Edit layer properties';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Layer ID',
      required: true,
    }),
    name: Flags.string({
      description: 'New layer name',
    }),
    opacity: Flags.integer({
      description: 'Layer opacity (0-255)',
    }),
    visible: Flags.string({
      description: 'Layer visibility (true/false)',
    }),
    locked: Flags.string({
      description: 'Layer locked state (true/false)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerEdit);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    if (flags.name === undefined && flags.opacity === undefined && flags.visible === undefined && flags.locked === undefined) {
      this.error('At least one property flag must be provided (--name, --opacity, --visible, --locked).');
    }

    if (flags.opacity !== undefined && (flags.opacity < 0 || flags.opacity > 255)) {
      this.error('Opacity must be between 0 and 255.');
    }

    if (flags.visible !== undefined && flags.visible !== 'true' && flags.visible !== 'false') {
      this.error('--visible must be "true" or "false".');
    }

    if (flags.locked !== undefined && flags.locked !== 'true' && flags.locked !== 'false') {
      this.error('--locked must be "true" or "false".');
    }

    const changes: { field: string; from: unknown; to: unknown }[] = [];

    if (flags.name !== undefined) {
      changes.push({ field: 'name', from: layer.name, to: flags.name });
      layer.name = flags.name;
    }

    if (flags.opacity !== undefined) {
      changes.push({ field: 'opacity', from: layer.opacity, to: flags.opacity });
      layer.opacity = flags.opacity;
    }

    if (flags.visible !== undefined) {
      const val = flags.visible === 'true';
      changes.push({ field: 'visible', from: layer.visible, to: val });
      layer.visible = val;
    }

    if (flags.locked !== undefined) {
      const val = flags.locked === 'true';
      changes.push({ field: 'locked', from: layer.locked, to: val });
      layer.locked = val;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      id: layer.id,
      name: layer.name,
      changes,
    };

    const cmdResult = makeResult(
      'layer:edit',
      { canvas: flags.canvas, layer: flags.layer, name: flags.name, opacity: flags.opacity, visible: flags.visible, locked: flags.locked },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.id}" updated in canvas "${flags.canvas}"`);
      for (const c of data.changes) {
        this.log(`  ${c.field}: ${c.from} -> ${c.to}`);
      }
    });
  }
}
