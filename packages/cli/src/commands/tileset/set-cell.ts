import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, writeTilesetJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetSetCell extends BaseCommand {
  static description = 'Set a cell in a tilemap';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    tilemap: Flags.string({
      description: 'Tilemap name',
      required: true,
    }),
    x: Flags.integer({
      description: 'Cell X position (column)',
      required: true,
    }),
    y: Flags.integer({
      description: 'Cell Y position (row)',
      required: true,
    }),
    tile: Flags.integer({
      description: 'Tile index to place',
      required: true,
    }),
    'flip-h': Flags.boolean({
      description: 'Flip tile horizontally',
      default: false,
    }),
    'flip-v': Flags.boolean({
      description: 'Flip tile vertically',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetSetCell);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const tilemap = tileset.tilemaps.find((tm) => tm.name === flags.tilemap);
    if (!tilemap) {
      this.error(`Tilemap "${flags.tilemap}" not found in tileset "${flags.name}"`);
    }

    if (flags.x < 0 || flags.x >= tilemap.width || flags.y < 0 || flags.y >= tilemap.height) {
      this.error(`Cell (${flags.x}, ${flags.y}) out of bounds for tilemap ${tilemap.width}x${tilemap.height}`);
    }

    const cellIndex = flags.y * tilemap.width + flags.x;
    tilemap.cells[cellIndex] = {
      tileIndex: flags.tile,
      ...(flags['flip-h'] ? { flipH: true } : {}),
      ...(flags['flip-v'] ? { flipV: true } : {}),
    };

    tilemap.modified = new Date().toISOString();
    writeTilesetJSON(projectPath, flags.name, tileset);

    const resultData = {
      tileset: flags.name,
      tilemap: flags.tilemap,
      x: flags.x,
      y: flags.y,
      tile: flags.tile,
      flipH: flags['flip-h'],
      flipV: flags['flip-v'],
    };

    const cmdResult = makeResult('tileset:set-cell', {
      name: flags.name,
      tilemap: flags.tilemap,
      x: flags.x,
      y: flags.y,
      tile: flags.tile,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Cell (${data.x}, ${data.y}) set to tile ${data.tile} in "${data.tilemap}"`);
    });
  }
}
