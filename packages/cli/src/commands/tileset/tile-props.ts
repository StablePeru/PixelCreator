import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, writeTilesetJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetTileProps extends BaseCommand {
  static description = 'View or edit tile properties';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    tile: Flags.string({
      description: 'Tile ID',
      required: true,
    }),
    set: Flags.string({
      description: 'Set a property (format: "key:value")',
    }),
    remove: Flags.string({
      description: 'Remove a property by key',
    }),
    type: Flags.string({
      description: 'Value type for --set (string, number, boolean)',
      default: 'string',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetTileProps);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const tile = tileset.tiles.find((t) => t.id === flags.tile);
    if (!tile) {
      this.error(`Tile "${flags.tile}" not found in tileset "${flags.name}".`);
    }

    if (!tile.properties) {
      tile.properties = {};
    }

    const hasSetter = flags.set !== undefined || flags.remove !== undefined;

    if (!hasSetter) {
      const resultData = { tileset: flags.name, tileId: flags.tile, properties: tile.properties, changes: [] as string[] };
      const cmdResult = makeResult('tileset:tile-props', { name: flags.name, tile: flags.tile }, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log(`Tile "${data.tileId}" properties:`);
        const keys = Object.keys(data.properties);
        if (keys.length === 0) {
          this.log('  (no properties)');
          return;
        }
        for (const key of keys) {
          this.log(`  ${key}: ${data.properties[key]} (${typeof data.properties[key]})`);
        }
      });
      return;
    }

    const changes: string[] = [];

    if (flags.set !== undefined) {
      const colonIndex = flags.set.indexOf(':');
      if (colonIndex === -1) {
        this.error('--set format must be "key:value".');
      }
      const key = flags.set.slice(0, colonIndex);
      const rawValue = flags.set.slice(colonIndex + 1);
      if (!key) {
        this.error('Property key must be non-empty.');
      }

      let value: string | number | boolean;
      switch (flags.type) {
        case 'number': {
          value = Number(rawValue);
          if (Number.isNaN(value)) {
            this.error(`Cannot parse "${rawValue}" as number.`);
          }
          break;
        }
        case 'boolean': {
          if (rawValue !== 'true' && rawValue !== 'false') {
            this.error('Boolean value must be "true" or "false".');
          }
          value = rawValue === 'true';
          break;
        }
        default:
          value = rawValue;
      }

      tile.properties[key] = value;
      changes.push(`Set "${key}" = ${JSON.stringify(value)} (${flags.type})`);
    }

    if (flags.remove !== undefined) {
      if (tile.properties[flags.remove] !== undefined) {
        delete tile.properties[flags.remove];
        changes.push(`Removed "${flags.remove}"`);
      } else {
        changes.push(`"${flags.remove}" not found`);
      }
    }

    writeTilesetJSON(projectPath, flags.name, tileset);

    const resultData = { tileset: flags.name, tileId: flags.tile, properties: tile.properties, changes };
    const cmdResult = makeResult('tileset:tile-props', { name: flags.name, tile: flags.tile, set: flags.set, remove: flags.remove, type: flags.type }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tile "${data.tileId}" in tileset "${data.tileset}" updated:`);
      for (const c of data.changes) {
        this.log(`  ${c}`);
      }
    });
  }
}
