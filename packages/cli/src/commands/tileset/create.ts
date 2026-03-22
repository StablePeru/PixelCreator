import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readCanvasJSON, ensureTilesetStructure, writeTilesetJSON, writeTileImage, loadPNG, renderFrames, generateSequentialId, formatOutput, makeResult, sliceTiles, deduplicateTiles, hashTileBuffer, buildTilemapFromIndexMap } from '@pixelcreator/core';
import type { TilesetData, TileInfo } from '@pixelcreator/core';

export default class TilesetCreate extends BaseCommand {
  static description = 'Create a tileset from a canvas or PNG file';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Tileset name',
      required: true,
    }),
    canvas: Flags.string({
      char: 'c',
      description: 'Source canvas name',
    }),
    file: Flags.string({
      description: 'Source PNG file path',
    }),
    'tile-width': Flags.integer({
      description: 'Tile width in pixels',
    }),
    'tile-height': Flags.integer({
      description: 'Tile height in pixels',
    }),
    'no-deduplicate': Flags.boolean({
      description: 'Skip tile deduplication',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetCreate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!flags.canvas && !flags.file) {
      this.error('Exactly one of --canvas or --file is required.');
    }
    if (flags.canvas && flags.file) {
      this.error('Exactly one of --canvas or --file is required, not both.');
    }

    if (project.tilesets.includes(flags.name)) {
      this.error(`Tileset "${flags.name}" already exists.`);
    }

    const tileWidth = flags['tile-width'] ?? project.settings.defaultTileSize.width;
    const tileHeight = flags['tile-height'] ?? project.settings.defaultTileSize.height;

    // Get source buffer
    let sourceBuffer;
    if (flags.canvas) {
      const canvas = readCanvasJSON(projectPath, flags.canvas);
      const rendered = renderFrames(projectPath, flags.canvas, canvas, [0], 1);
      sourceBuffer = rendered[0];
    } else {
      sourceBuffer = loadPNG(flags.file!);
    }

    // Slice
    const { tiles, columns, rows } = sliceTiles(sourceBuffer, tileWidth, tileHeight);

    // Dedup or not
    let finalTiles;
    let hashes: string[];
    let indexMap: number[];

    if (flags['no-deduplicate']) {
      finalTiles = tiles;
      hashes = tiles.map((t) => hashTileBuffer(t));
      indexMap = tiles.map((_, i) => i);
    } else {
      const dedup = deduplicateTiles(tiles);
      finalTiles = dedup.unique;
      hashes = dedup.hashes;
      indexMap = dedup.indexMap;
    }

    // Build tileset structure
    ensureTilesetStructure(projectPath, flags.name);

    const tileInfos: TileInfo[] = finalTiles.map((_, i) => ({
      id: generateSequentialId('tile', i + 1),
      index: i,
      hash: hashes[i],
    }));

    // Write tile images
    for (let i = 0; i < finalTiles.length; i++) {
      writeTileImage(projectPath, flags.name, tileInfos[i].id, finalTiles[i]);
    }

    const now = new Date().toISOString();
    const tilesetData: TilesetData = {
      name: flags.name,
      tileWidth,
      tileHeight,
      source: flags.canvas ? { canvas: flags.canvas } : { file: flags.file },
      tiles: tileInfos,
      tilemaps: [],
      created: now,
      modified: now,
    };

    // Build source tilemap if dedup was used
    if (!flags['no-deduplicate']) {
      const tilemap = buildTilemapFromIndexMap('source', columns, rows, indexMap);
      tilesetData.tilemaps.push(tilemap);
    }

    writeTilesetJSON(projectPath, flags.name, tilesetData);

    project.tilesets.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      tileWidth,
      tileHeight,
      totalSliced: tiles.length,
      uniqueTiles: finalTiles.length,
      deduplicated: tiles.length - finalTiles.length,
      tilemaps: tilesetData.tilemaps.length,
      source: flags.canvas ? `canvas:${flags.canvas}` : `file:${flags.file}`,
    };

    const cmdResult = makeResult('tileset:create', {
      name: flags.name,
      canvas: flags.canvas,
      file: flags.file,
      tileWidth,
      tileHeight,
      deduplicate: !flags['no-deduplicate'],
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Tileset "${data.name}" created from ${data.source}`);
      this.log(`  Tile size: ${data.tileWidth}x${data.tileHeight}`);
      this.log(`  Tiles: ${data.uniqueTiles} unique (${data.deduplicated} duplicates removed from ${data.totalSliced})`);
      if (data.tilemaps > 0) {
        this.log(`  Source tilemap created`);
      }
    });
  }
}
