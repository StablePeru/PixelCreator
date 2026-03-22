import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, readTilesetJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetList extends BaseCommand {
  static description = 'List all tilesets in the project';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const tilesets = project.tilesets.map((name) => {
      try {
        const ts = readTilesetJSON(projectPath, name);
        return {
          name: ts.name,
          tileWidth: ts.tileWidth,
          tileHeight: ts.tileHeight,
          tileCount: ts.tiles.length,
          tilemapCount: ts.tilemaps.length,
        };
      } catch {
        return { name, tileWidth: 0, tileHeight: 0, tileCount: 0, tilemapCount: 0 };
      }
    });

    const resultData = { tilesets, count: tilesets.length };

    const cmdResult = makeResult('tileset:list', {}, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      if (data.count === 0) {
        this.log('No tilesets found.');
        return;
      }
      this.log(`Tilesets (${data.count}):`);
      for (const ts of data.tilesets) {
        this.log(`  ${ts.name} — ${ts.tileWidth}x${ts.tileHeight}, ${ts.tileCount} tiles, ${ts.tilemapCount} tilemaps`);
      }
    });
  }
}
