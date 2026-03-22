import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, readTileImage, savePNG, renderTilemap, scaleBuffer, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetRenderTilemap extends BaseCommand {
  static description = 'Render a tilemap to a PNG file';

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
    dest: Flags.string({
      description: 'Destination PNG file path',
      required: true,
    }),
    scale: Flags.integer({
      description: 'Scale factor',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetRenderTilemap);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const tilemap = tileset.tilemaps.find((tm) => tm.name === flags.tilemap);
    if (!tilemap) {
      this.error(`Tilemap "${flags.tilemap}" not found in tileset "${flags.name}"`);
    }

    // Load all tile images
    const tiles = tileset.tiles.map((t) => readTileImage(projectPath, flags.name, t.id));

    let rendered = renderTilemap(tilemap, tiles, tileset.tileWidth, tileset.tileHeight);

    if (flags.scale > 1) {
      rendered = scaleBuffer(rendered, flags.scale);
    }

    const destPath = path.resolve(flags.dest);
    savePNG(rendered, destPath);

    const resultData = {
      tileset: flags.name,
      tilemap: flags.tilemap,
      dest: destPath,
      width: rendered.width,
      height: rendered.height,
      scale: flags.scale,
    };

    const cmdResult = makeResult('tileset:render-tilemap', {
      name: flags.name,
      tilemap: flags.tilemap,
      dest: flags.dest,
      scale: flags.scale,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tilemap "${data.tilemap}" rendered to ${data.dest}`);
      this.log(`  Size: ${data.width}x${data.height} (scale: ${data.scale}x)`);
    });
  }
}
