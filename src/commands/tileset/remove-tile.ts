import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readTilesetJSON,
  writeTilesetJSON,
  getTilePath,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class TilesetRemoveTile extends BaseCommand {
  static description = 'Remove a tile from a tileset';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    tile: Flags.integer({
      description: 'Tile index to remove',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetRemoveTile);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const tileIndex = flags.tile;
    const tile = tileset.tiles.find((t) => t.index === tileIndex);
    if (!tile) {
      this.error(`Tile index ${tileIndex} not found in tileset "${flags.name}"`);
    }

    // Remove tile image
    const tilePath = getTilePath(projectPath, flags.name, tile.id);
    if (fs.existsSync(tilePath)) {
      fs.unlinkSync(tilePath);
    }

    // Remove from tiles array
    tileset.tiles = tileset.tiles.filter((t) => t.index !== tileIndex);

    // Reindex remaining tiles
    tileset.tiles.forEach((t, i) => {
      t.index = i;
    });

    // Update tilemaps: set removed tile references to -1
    for (const tilemap of tileset.tilemaps) {
      for (const cell of tilemap.cells) {
        if (cell.tileIndex === tileIndex) {
          cell.tileIndex = -1;
        } else if (cell.tileIndex > tileIndex) {
          cell.tileIndex--;
        }
      }
    }

    writeTilesetJSON(projectPath, flags.name, tileset);

    const resultData = {
      tileset: flags.name,
      removedTile: tile.id,
      removedIndex: tileIndex,
      remainingTiles: tileset.tiles.length,
    };

    const cmdResult = makeResult('tileset:remove-tile', {
      name: flags.name,
      tile: tileIndex,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tile "${data.removedTile}" (index ${data.removedIndex}) removed from "${data.tileset}"`);
      this.log(`  Remaining tiles: ${data.remainingTiles}`);
    });
  }
}
