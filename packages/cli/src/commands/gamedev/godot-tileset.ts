import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readTilesetJSON, exportGodotTileset, formatOutput, makeResult,
} from '@pixelcreator/core';

export default class GamedevGodotTileset extends BaseCommand {
  static description = 'Generate a Godot .tres TileSet resource from a tileset';

  static flags = {
    ...BaseCommand.baseFlags,
    tileset: Flags.string({
      char: 't',
      description: 'Tileset name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination .tres file path',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevGodotTileset);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.tileset);

    const sheetFilename = `${flags.tileset}_tiles.png`;
    const tresContent = exportGodotTileset(tileset, sheetFilename);

    const destPath = path.resolve(flags.dest);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destPath, tresContent, 'utf-8');

    const resultData = {
      tileset: flags.tileset,
      dest: destPath,
      tileCount: tileset.tiles.length,
      tileSize: { width: tileset.tileWidth, height: tileset.tileHeight },
    };

    const cmdResult = makeResult(
      'gamedev:godot-tileset',
      { tileset: flags.tileset, dest: flags.dest },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Generated Godot TileSet: ${data.dest}`);
      this.log(`  Tiles: ${data.tileCount}`);
      this.log(`  Tile size: ${data.tileSize.width}x${data.tileSize.height}`);
    });
  }
}
