import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readTilesetJSON,
  writeTilesetJSON,
  tilemapFloodFill,
  tilemapBrushPaint,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class TilesetPaint extends BaseCommand {
  static description = 'Paint tiles onto a tilemap using brush or flood fill';

  static flags = {
    ...BaseCommand.baseFlags,
    tileset: Flags.string({
      description: 'Tileset name',
      required: true,
    }),
    tilemap: Flags.string({
      description: 'Tilemap name',
      required: true,
    }),
    x: Flags.integer({
      description: 'X position (column)',
      required: true,
    }),
    y: Flags.integer({
      description: 'Y position (row)',
      required: true,
    }),
    tile: Flags.integer({
      description: 'Tile index to paint',
      required: true,
    }),
    'brush-size': Flags.integer({
      description: 'Brush size (square side length)',
      default: 1,
    }),
    fill: Flags.boolean({
      description: 'Use flood fill instead of brush',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetPaint);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.tileset);

    const tilemapIndex = tileset.tilemaps.findIndex((tm) => tm.name === flags.tilemap);
    if (tilemapIndex === -1) {
      this.error(`Tilemap "${flags.tilemap}" not found in tileset "${flags.tileset}"`);
    }

    const tilemap = tileset.tilemaps[tilemapIndex];

    if (flags.x < 0 || flags.x >= tilemap.width || flags.y < 0 || flags.y >= tilemap.height) {
      this.error(
        `Position (${flags.x}, ${flags.y}) out of bounds for tilemap ${tilemap.width}x${tilemap.height}`,
      );
    }

    const updatedTilemap = flags.fill
      ? tilemapFloodFill(tilemap, flags.x, flags.y, flags.tile)
      : tilemapBrushPaint(tilemap, flags.x, flags.y, flags['brush-size'], flags.tile);

    const updatedTileset = {
      ...tileset,
      tilemaps: tileset.tilemaps.map((tm, i) => (i === tilemapIndex ? updatedTilemap : tm)),
    };
    writeTilesetJSON(projectPath, flags.tileset, updatedTileset);

    const mode = flags.fill
      ? 'flood-fill'
      : `brush (${flags['brush-size']}x${flags['brush-size']})`;

    const resultData = {
      tileset: flags.tileset,
      tilemap: flags.tilemap,
      x: flags.x,
      y: flags.y,
      tile: flags.tile,
      mode,
    };

    const cmdResult = makeResult(
      'tileset:paint',
      {
        tileset: flags.tileset,
        tilemap: flags.tilemap,
        x: flags.x,
        y: flags.y,
        tile: flags.tile,
        brushSize: flags['brush-size'],
        fill: flags.fill,
      },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(
        `Painted tile ${data.tile} at (${data.x}, ${data.y}) in "${data.tilemap}" using ${data.mode}`,
      );
    });
  }
}
