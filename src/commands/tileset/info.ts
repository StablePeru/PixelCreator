import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class TilesetInfo extends BaseCommand {
  static description = 'Show tileset information';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const totalArea = tileset.tiles.length * tileset.tileWidth * tileset.tileHeight;

    const resultData = {
      name: tileset.name,
      tileWidth: tileset.tileWidth,
      tileHeight: tileset.tileHeight,
      tileCount: tileset.tiles.length,
      tilemapCount: tileset.tilemaps.length,
      tilemaps: tileset.tilemaps.map((tm) => ({
        name: tm.name,
        width: tm.width,
        height: tm.height,
      })),
      source: tileset.source ?? null,
      totalArea,
      created: tileset.created,
      modified: tileset.modified,
    };

    const cmdResult = makeResult('tileset:info', { name: flags.name }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tileset: ${data.name}`);
      this.log(`  Tile size: ${data.tileWidth}x${data.tileHeight}`);
      this.log(`  Tiles: ${data.tileCount}`);
      this.log(`  Total area: ${data.totalArea}px²`);
      if (data.source) {
        this.log(`  Source: ${data.source.canvas ? `canvas:${data.source.canvas}` : `file:${data.source.file}`}`);
      }
      if (data.tilemaps.length > 0) {
        this.log(`  Tilemaps (${data.tilemapCount}):`);
        for (const tm of data.tilemaps) {
          this.log(`    - ${tm.name} (${tm.width}x${tm.height})`);
        }
      }
    });
  }
}
