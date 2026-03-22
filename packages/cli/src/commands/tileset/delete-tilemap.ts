import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, writeTilesetJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetDeleteTilemap extends BaseCommand {
  static description = 'Delete a tilemap from a tileset';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    tilemap: Flags.string({
      description: 'Tilemap name to delete',
      required: true,
    }),
    force: Flags.boolean({
      description: 'Confirm deletion',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetDeleteTilemap);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const tmIndex = tileset.tilemaps.findIndex((tm) => tm.name === flags.tilemap);
    if (tmIndex === -1) {
      this.error(`Tilemap "${flags.tilemap}" not found in tileset "${flags.name}".`);
    }

    tileset.tilemaps.splice(tmIndex, 1);
    writeTilesetJSON(projectPath, flags.name, tileset);

    const resultData = {
      tileset: flags.name,
      tilemap: flags.tilemap,
      deleted: true,
    };

    const cmdResult = makeResult(
      'tileset:delete-tilemap',
      { name: flags.name, tilemap: flags.tilemap, force: flags.force },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tilemap "${data.tilemap}" deleted from tileset "${data.tileset}".`);
    });
  }
}
