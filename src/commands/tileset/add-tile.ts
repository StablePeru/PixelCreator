import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readTilesetJSON,
  writeTilesetJSON,
  writeTileImage,
} from '../../io/project-io.js';
import { loadPNG } from '../../io/png-codec.js';
import { hashTileBuffer } from '../../core/tileset-engine.js';
import { generateSequentialId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class TilesetAddTile extends BaseCommand {
  static description = 'Add a tile to a tileset from a PNG file';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    file: Flags.string({
      description: 'PNG file to add as tile',
      required: true,
    }),
    label: Flags.string({
      description: 'Optional label for the tile',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetAddTile);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const buffer = loadPNG(flags.file);

    if (buffer.width !== tileset.tileWidth || buffer.height !== tileset.tileHeight) {
      this.error(
        `Tile dimensions ${buffer.width}x${buffer.height} don't match tileset ${tileset.tileWidth}x${tileset.tileHeight}`,
      );
    }

    const hash = hashTileBuffer(buffer);
    const newIndex = tileset.tiles.length;
    const tileId = generateSequentialId('tile', newIndex + 1);

    const tileInfo = {
      id: tileId,
      index: newIndex,
      hash,
      ...(flags.label ? { label: flags.label } : {}),
    };

    tileset.tiles.push(tileInfo);
    writeTileImage(projectPath, flags.name, tileId, buffer);
    writeTilesetJSON(projectPath, flags.name, tileset);

    const resultData = {
      tileset: flags.name,
      tileId,
      index: newIndex,
      hash,
      label: flags.label ?? null,
    };

    const cmdResult = makeResult('tileset:add-tile', {
      name: flags.name,
      file: flags.file,
      label: flags.label,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tile "${data.tileId}" added to tileset "${data.tileset}" (index ${data.index})`);
    });
  }
}
