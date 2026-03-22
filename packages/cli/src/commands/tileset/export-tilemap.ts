import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTilesetJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TilesetExportTilemap extends BaseCommand {
  static description = 'Export a tilemap as CSV, Tiled TMJ, or JSON';

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
      description: 'Destination file path',
      required: true,
    }),
    format: Flags.string({
      description: 'Export format',
      options: ['tiled', 'csv', 'generic'],
      default: 'generic',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetExportTilemap);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.name);

    const tilemap = tileset.tilemaps.find((tm) => tm.name === flags.tilemap);
    if (!tilemap) {
      this.error(`Tilemap "${flags.tilemap}" not found in tileset "${flags.name}"`);
    }

    const destPath = path.resolve(flags.dest);
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    let content: string;

    if (flags.format === 'csv') {
      const rows: string[] = [];
      for (let row = 0; row < tilemap.height; row++) {
        const cells: number[] = [];
        for (let col = 0; col < tilemap.width; col++) {
          cells.push(tilemap.cells[row * tilemap.width + col].tileIndex);
        }
        rows.push(cells.join(','));
      }
      content = rows.join('\n');
    } else if (flags.format === 'tiled') {
      // TMJ layer data
      const data = tilemap.cells.map((c) => c.tileIndex >= 0 ? c.tileIndex + 1 : 0);
      const tmj = {
        type: 'map',
        tiledversion: '1.10',
        version: '1.10',
        orientation: 'orthogonal',
        renderorder: 'right-down',
        width: tilemap.width,
        height: tilemap.height,
        tilewidth: tileset.tileWidth,
        tileheight: tileset.tileHeight,
        layers: [
          {
            type: 'tilelayer',
            name: tilemap.name,
            width: tilemap.width,
            height: tilemap.height,
            data,
            x: 0,
            y: 0,
            opacity: 1,
            visible: true,
          },
        ],
        tilesets: [
          {
            firstgid: 1,
            source: `${tileset.name}.json`,
          },
        ],
      };
      content = JSON.stringify(tmj, null, 2);
    } else {
      content = JSON.stringify(tilemap, null, 2);
    }

    fs.writeFileSync(destPath, content);

    const resultData = {
      tileset: flags.name,
      tilemap: flags.tilemap,
      dest: destPath,
      format: flags.format,
      width: tilemap.width,
      height: tilemap.height,
    };

    const cmdResult = makeResult('tileset:export-tilemap', {
      name: flags.name,
      tilemap: flags.tilemap,
      dest: flags.dest,
      format: flags.format,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tilemap "${data.tilemap}" exported to ${data.dest}`);
      this.log(`  Format: ${data.format}`);
      this.log(`  Grid: ${data.width}x${data.height}`);
    });
  }
}
