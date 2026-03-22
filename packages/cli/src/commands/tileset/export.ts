import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, readTileImage, savePNG, composeTilesetImage, generateTiledMetadata, scaleBuffer, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetExport extends BaseCommand {
  static description = 'Export tileset as spritesheet + metadata';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination directory',
      required: true,
    }),
    format: Flags.string({
      description: 'Export format',
      options: ['tiled', 'generic'],
      default: 'generic',
    }),
    columns: Flags.integer({
      description: 'Columns in spritesheet (auto if not set)',
    }),
    spacing: Flags.integer({
      description: 'Pixel spacing between tiles',
      default: 0,
    }),
    scale: Flags.integer({
      description: 'Scale factor',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetExport);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    if (tileset.tiles.length === 0) {
      this.error(`Tileset "${flags.name}" has no tiles.`);
    }

    const tiles = tileset.tiles.map((t) => readTileImage(projectPath, flags.name, t.id));
    const columns = flags.columns ?? Math.ceil(Math.sqrt(tiles.length));

    let sheet = composeTilesetImage(tiles, tileset.tileWidth, tileset.tileHeight, {
      columns,
      spacing: flags.spacing,
    });

    if (flags.scale > 1) {
      sheet = scaleBuffer(sheet, flags.scale);
    }

    const destDir = path.resolve(flags.dest);
    fs.mkdirSync(destDir, { recursive: true });

    const imageName = `${tileset.name}.png`;
    const metaName = `${tileset.name}.json`;
    savePNG(sheet, path.join(destDir, imageName));

    let metadata: object;
    if (flags.format === 'tiled') {
      metadata = generateTiledMetadata(tileset, imageName, columns, flags.spacing);
    } else {
      metadata = {
        name: tileset.name,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        tileCount: tileset.tiles.length,
        columns,
        spacing: flags.spacing,
        image: imageName,
        imageWidth: sheet.width,
        imageHeight: sheet.height,
        tiles: tileset.tiles.map((t) => ({
          id: t.id,
          index: t.index,
          label: t.label,
        })),
      };
    }

    fs.writeFileSync(path.join(destDir, metaName), JSON.stringify(metadata, null, 2));

    const resultData = {
      name: tileset.name,
      dest: destDir,
      format: flags.format,
      imageFile: imageName,
      metadataFile: metaName,
      tileCount: tileset.tiles.length,
      columns,
      sheetWidth: sheet.width,
      sheetHeight: sheet.height,
      scale: flags.scale,
    };

    const cmdResult = makeResult('tileset:export', {
      name: flags.name,
      dest: flags.dest,
      format: flags.format,
      columns,
      spacing: flags.spacing,
      scale: flags.scale,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tileset "${data.name}" exported to ${data.dest}`);
      this.log(`  Format: ${data.format}`);
      this.log(`  Image: ${data.imageFile} (${data.sheetWidth}x${data.sheetHeight})`);
      this.log(`  Metadata: ${data.metadataFile}`);
      this.log(`  Tiles: ${data.tileCount}, columns: ${data.columns}`);
    });
  }
}
