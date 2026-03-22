import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, writeTilesetJSON, formatOutput, makeResult } from '@pixelcreator/core';
import type { TilemapCell, TilemapData } from '@pixelcreator/core';

export default class TilesetCreateTilemap extends BaseCommand {
  static description = 'Create an empty tilemap in a tileset';

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
    width: Flags.integer({
      char: 'w',
      description: 'Grid width in tiles',
      required: true,
    }),
    height: Flags.integer({
      char: 'h',
      description: 'Grid height in tiles',
      required: true,
    }),
    fill: Flags.integer({
      description: 'Fill tile index (default -1 for empty)',
      default: -1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetCreateTilemap);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    if (tileset.tilemaps.some((tm) => tm.name === flags.tilemap)) {
      this.error(`Tilemap "${flags.tilemap}" already exists in tileset "${flags.name}"`);
    }

    const now = new Date().toISOString();
    const cells: TilemapCell[] = Array.from(
      { length: flags.width * flags.height },
      () => ({ tileIndex: flags.fill }),
    );

    const tilemap: TilemapData = {
      name: flags.tilemap,
      width: flags.width,
      height: flags.height,
      cells,
      created: now,
      modified: now,
    };

    tileset.tilemaps.push(tilemap);
    writeTilesetJSON(projectPath, flags.name, tileset);

    const resultData = {
      tileset: flags.name,
      tilemap: flags.tilemap,
      width: flags.width,
      height: flags.height,
      fill: flags.fill,
      cellCount: cells.length,
    };

    const cmdResult = makeResult('tileset:create-tilemap', {
      name: flags.name,
      tilemap: flags.tilemap,
      width: flags.width,
      height: flags.height,
      fill: flags.fill,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tilemap "${data.tilemap}" created in tileset "${data.tileset}"`);
      this.log(`  Grid: ${data.width}x${data.height} (${data.cellCount} cells)`);
      this.log(`  Fill: ${data.fill === -1 ? 'empty' : `tile ${data.fill}`}`);
    });
  }
}
