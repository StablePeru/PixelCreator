import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readTilesetJSON,
  writeTilesetJSON,
  resolveAutoTilemap,
  createDefaultBlob47Mapping,
  createDefaultWang16Mapping,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';
import type { AutoTileConfig } from '@pixelcreator/core';

export default class TilesetAutotile extends BaseCommand {
  static description = 'Configure and resolve auto-tiling for a tilemap';

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
    'terrain-id': Flags.integer({
      description: 'Terrain ID to use for auto-tiling',
      required: true,
    }),
    type: Flags.string({
      description: 'Auto-tile type',
      options: ['wang-16', 'blob-47'],
      default: 'blob-47',
    }),
    'resolve-all': Flags.boolean({
      description: 'Resolve auto-tiles for the entire tilemap',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TilesetAutotile);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const tileset = readTilesetJSON(projectPath, flags.tileset);

    const tilemapIndex = tileset.tilemaps.findIndex((tm) => tm.name === flags.tilemap);
    if (tilemapIndex === -1) {
      this.error(`Tilemap "${flags.tilemap}" not found in tileset "${flags.tileset}"`);
    }

    const tileType = flags.type as 'wang-16' | 'blob-47';
    const tileMapping =
      tileType === 'blob-47' ? createDefaultBlob47Mapping() : createDefaultWang16Mapping();

    const config: AutoTileConfig = {
      type: tileType,
      terrainId: flags['terrain-id'],
      tileMapping,
    };

    // Store the auto-tile config on the tileset
    const existingConfigs = tileset.autoTile ?? [];
    const configIdx = existingConfigs.findIndex((c) => c.terrainId === config.terrainId);
    const updatedConfigs =
      configIdx >= 0
        ? existingConfigs.map((c, i) => (i === configIdx ? config : c))
        : [...existingConfigs, config];
    const updatedTileset = { ...tileset, autoTile: updatedConfigs };

    if (flags['resolve-all']) {
      const resolvedTilemap = resolveAutoTilemap(
        updatedTileset.tilemaps[tilemapIndex],
        updatedConfigs,
      );
      updatedTileset.tilemaps = updatedTileset.tilemaps.map((tm, i) =>
        i === tilemapIndex ? resolvedTilemap : tm,
      );
    }

    writeTilesetJSON(projectPath, flags.tileset, updatedTileset);

    const resultData = {
      tileset: flags.tileset,
      tilemap: flags.tilemap,
      terrainId: flags['terrain-id'],
      type: tileType,
      resolvedAll: flags['resolve-all'],
      mappingSize: Object.keys(tileMapping).length,
    };

    const cmdResult = makeResult(
      'tileset:autotile',
      {
        tileset: flags.tileset,
        tilemap: flags.tilemap,
        terrainId: flags['terrain-id'],
        type: tileType,
        resolveAll: flags['resolve-all'],
      },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(
        `Auto-tile configured for terrain ${data.terrainId} (${data.type}) in "${data.tilemap}"`,
      );
      this.log(`  Mapping: ${data.mappingSize} entries`);
      if (data.resolvedAll) {
        this.log(`  Resolved all cells in tilemap`);
      }
    });
  }
}
