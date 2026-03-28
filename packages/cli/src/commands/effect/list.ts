import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

interface EffectRow {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, unknown>;
}

export default class EffectList extends BaseCommand {
  static description = 'List all effects on a layer';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    layer: Flags.string({ char: 'l', description: 'Layer ID', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(EffectList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) throw new Error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}"`);

    if (!layer.effects) layer.effects = [];

    const effects: EffectRow[] = layer.effects.map((e) => ({
      id: e.id,
      type: e.type,
      enabled: e.enabled,
      params: e.params as unknown as Record<string, unknown>,
    }));

    const cmdResult = makeResult(
      'effect:list',
      { canvas: flags.canvas, layer: flags.layer },
      { canvas: flags.canvas, layer: flags.layer, effects, total: effects.length },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.effects.length === 0) {
        this.log(`No effects on layer "${data.layer}" in canvas "${data.canvas}".`);
        return;
      }

      this.log(`Effects on layer "${data.layer}" in canvas "${data.canvas}":\n`);

      const header = padRow('ID', 'Type', 'Enabled', 'Params');
      const separator = padRow('----------', '---------------', '-------', '--------------------');
      this.log(header);
      this.log(separator);

      for (const effect of data.effects) {
        this.log(
          padRow(
            effect.id,
            effect.type,
            effect.enabled ? 'yes' : 'no',
            JSON.stringify(effect.params),
          ),
        );
      }
    });
  }
}

function padRow(id: string, type: string, enabled: string, params: string): string {
  return [
    id.padEnd(14),
    type.padEnd(18),
    enabled.padEnd(10),
    params,
  ].join('');
}
