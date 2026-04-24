import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  listAssetSpecs,
  readAssetSpec,
  parseAssetSpec,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

interface AssetListEntry {
  name: string;
  valid: boolean;
  type?: string;
  canvas?: string;
  frameSize?: { width: number; height: number };
  tileSize?: { width: number; height: number };
  animationCount?: number;
  animationNames?: string[];
  engine?: string;
  scale?: number;
  maxColors?: number | null;
  error?: string;
}

export default class AssetList extends BaseCommand {
  static description = 'List asset specs stored under .pxc/assets/';

  static flags = {
    ...BaseCommand.baseFlags,
    details: Flags.boolean({
      description: 'Include per-animation names in the output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AssetList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const names = listAssetSpecs(projectPath);

    const entries: AssetListEntry[] = names.map((name) => {
      try {
        const raw = readAssetSpec(projectPath, name);
        const { spec, errors } = parseAssetSpec(raw);
        if (!spec) {
          return { name, valid: false, error: errors.join('; ') };
        }
        if (spec.type === 'tileset') {
          return {
            name: spec.name,
            valid: true,
            type: spec.type,
            canvas: spec.canvas,
            tileSize: spec.tileSize,
            engine: spec.export.engine,
            scale: spec.export.scale,
            maxColors: spec.constraints?.maxColors ?? null,
          };
        }
        return {
          name: spec.name,
          valid: true,
          type: spec.type,
          canvas: spec.canvas,
          frameSize: spec.frameSize,
          animationCount: spec.animations.length,
          animationNames: spec.animations.map((a) => a.name),
          engine: spec.export.engine,
          scale: spec.export.scale,
          maxColors: spec.constraints?.maxColors ?? null,
        };
      } catch (err) {
        return {
          name,
          valid: false,
          error: err instanceof Error ? err.message : 'Unknown read error',
        };
      }
    });

    const resultData = {
      assets: entries,
      count: entries.length,
    };

    const cmdResult = makeResult('asset:list', { details: flags.details }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      if (data.count === 0) {
        this.log('No asset specs found. Run `pxc asset:init` to create one.');
        return;
      }

      this.log(`Found ${data.count} asset spec${data.count === 1 ? '' : 's'}:`);
      this.log('');

      for (const entry of data.assets) {
        if (!entry.valid) {
          this.log(`  [INVALID] ${entry.name}`);
          if (entry.error) {
            this.log(`    error: ${entry.error}`);
          }
          continue;
        }

        const frame = entry.frameSize ? `${entry.frameSize.width}x${entry.frameSize.height}` : '?';
        const tile = entry.tileSize ? `${entry.tileSize.width}x${entry.tileSize.height}` : '?';
        const maxColors = entry.maxColors ?? '-';
        if (entry.type === 'tileset') {
          this.log(
            `  ${entry.name}  [${entry.type}]  canvas=${entry.canvas}  tile=${tile}  engine=${entry.engine}(${entry.scale}x)  maxColors=${maxColors}`,
          );
        } else {
          this.log(
            `  ${entry.name}  [${entry.type}]  canvas=${entry.canvas}  frame=${frame}  anims=${entry.animationCount}  engine=${entry.engine}(${entry.scale}x)  maxColors=${maxColors}`,
          );
          if (flags.details && entry.animationNames) {
            this.log(`    animations: ${entry.animationNames.join(', ')}`);
          }
        }
      }
    });
  }
}
