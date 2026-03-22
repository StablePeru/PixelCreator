import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

interface LayerRow {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  opacity: number;
  order: number;
}

export default class LayerList extends BaseCommand {
  static description = 'List all layers in a canvas';

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
    const { flags } = await this.parse(LayerList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layers: LayerRow[] = canvas.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      opacity: layer.opacity,
      order: layer.order,
    }));

    const cmdResult = makeResult(
      'layer:list',
      { canvas: flags.canvas },
      { canvas: flags.canvas, layers },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.layers.length === 0) {
        this.log(`No layers in canvas "${data.canvas}".`);
        return;
      }

      this.log(`Layers in canvas "${data.canvas}":\n`);

      const header = padRow('ID', 'Name', 'Type', 'Visible', 'Opacity', 'Order');
      const separator = padRow('----------', '----------', '---------', '-------', '-------', '-----');
      this.log(header);
      this.log(separator);

      for (const layer of data.layers) {
        this.log(
          padRow(
            layer.id,
            layer.name,
            layer.type,
            layer.visible ? 'yes' : 'no',
            String(layer.opacity),
            String(layer.order),
          ),
        );
      }
    });
  }
}

function padRow(
  id: string,
  name: string,
  type: string,
  visible: string,
  opacity: string,
  order: string,
): string {
  return [
    id.padEnd(12),
    name.padEnd(16),
    type.padEnd(10),
    visible.padEnd(8),
    opacity.padEnd(8),
    order.padEnd(5),
  ].join('');
}
