import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readAssetSpec,
  parseAssetSpec,
  buildAsset,
  writeExportFiles,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';
import type { AssetSpec } from '@pixelcreator/core';

interface BuildOutcome {
  success: boolean;
  fileCount: number;
  errors: string[];
  warnings: string[];
}

export default class AssetBuild extends BaseCommand {
  static description = 'Build a game-ready asset: validate, render, compose, and export';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Asset name to build',
      required: true,
    }),
    dest: Flags.string({
      description: 'Output directory (default: exports/<asset-name>/)',
    }),
    watch: Flags.boolean({
      description: 'Rebuild on spec or canvas changes (press Ctrl+C to stop)',
      default: false,
    }),
    debounce: Flags.integer({
      description: 'Debounce delay in ms for --watch',
      default: 300,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AssetBuild);
    const projectPath = getProjectPath(flags.project);

    if (!flags.watch) {
      await this.buildOnce(flags, projectPath, startTime, { throwOnError: true });
      return;
    }

    await this.runWatch(flags, projectPath);
  }

  // One-shot build. In watch mode, `throwOnError` is false so a bad spec
  // logs but keeps the watcher alive.
  private async buildOnce(
    flags: {
      name: string;
      dest?: string;
      output?: string;
    },
    projectPath: string,
    startTime: number,
    opts: { throwOnError: boolean },
  ): Promise<BuildOutcome> {
    const format = this.getOutputFormat(flags);

    let spec: AssetSpec;
    try {
      const raw = readAssetSpec(projectPath, flags.name);
      const parsed = parseAssetSpec(raw);
      if (!parsed.spec) {
        const msg = `Invalid asset spec "${flags.name}":\n  ${parsed.errors.join('\n  ')}`;
        if (opts.throwOnError) this.error(msg);
        this.log(msg);
        return { success: false, fileCount: 0, errors: parsed.errors, warnings: [] };
      }
      spec = parsed.spec;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (opts.throwOnError) this.error(msg);
      this.log(`Read error: ${msg}`);
      return { success: false, fileCount: 0, errors: [msg], warnings: [] };
    }

    const destDir = flags.dest
      ? path.resolve(flags.dest)
      : path.join(projectPath, 'exports', spec.name);

    const result = buildAsset(spec, projectPath, destDir);

    if (!result.validation.valid) {
      const errors = result.validation.issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => `[${issue.field}] ${issue.message}`);
      const msg = `Asset "${flags.name}" validation failed:\n  ${errors.join('\n  ')}`;
      if (opts.throwOnError) this.error(msg);
      this.log(msg);
      return { success: false, fileCount: 0, errors, warnings: [] };
    }

    const written = writeExportFiles(destDir, result.files);

    const warnings = result.validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.message);

    const resultData = {
      asset: spec.name,
      canvas: describeCanvases(spec),
      engine: spec.export.engine,
      scale: spec.export.scale,
      dest: destDir,
      files: written,
      fileCount: written.length,
      warnings,
    };

    const cmdResult = makeResult(
      'asset:build',
      { name: flags.name, dest: flags.dest },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Asset "${data.asset}" built successfully`);
      this.log(`  Canvas: ${data.canvas}`);
      this.log(`  Engine: ${data.engine} (scale ${data.scale}x)`);
      this.log(`  Output: ${data.dest}`);
      this.log(`  Files:`);
      for (const f of data.files) {
        this.log(`    ${f}`);
      }
      if (data.warnings.length > 0) {
        this.log('');
        this.log('  Warnings:');
        for (const w of data.warnings) {
          this.log(`    ${w}`);
        }
      }
    });

    return {
      success: true,
      fileCount: written.length,
      errors: [],
      warnings,
    };
  }

  private async runWatch(
    flags: { name: string; dest?: string; output?: string; debounce: number },
    projectPath: string,
  ): Promise<void> {
    const stamp = () => new Date().toISOString().slice(11, 19);

    // Try to read the spec up-front to know which canvases to watch. If it
    // fails, still start the asset-dir watcher so a later fix retriggers.
    let canvasNames: string[] = [];
    try {
      const raw = readAssetSpec(projectPath, flags.name);
      const parsed = parseAssetSpec(raw);
      if (parsed.spec) canvasNames = collectWatchCanvases(parsed.spec);
    } catch {
      // Ignore — first buildOnce will surface the error.
    }

    const watchers: fs.FSWatcher[] = [];
    let running = false;
    let triggers = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (running) return;
      running = true;
      triggers++;
      this.log(`[${stamp()}] Change detected — rebuilding "${flags.name}"...`);
      void this.buildOnce(flags, projectPath, Date.now(), { throwOnError: false })
        .then((outcome) => {
          if (outcome.success) {
            this.log(`[${stamp()}] Rebuild complete (${outcome.fileCount} files)`);
          } else {
            this.log(`[${stamp()}] Rebuild skipped due to errors`);
          }
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.log(`[${stamp()}] Rebuild error: ${msg}`);
        })
        .finally(() => {
          running = false;
        });
    };

    const schedule = (filename: string | null) => {
      if (filename && (filename.includes('snapshots') || filename.endsWith('.tmp'))) {
        return;
      }
      if (pending) clearTimeout(pending);
      pending = setTimeout(trigger, flags.debounce);
    };

    // Initial build (tolerant of errors in watch mode).
    this.log(`[${stamp()}] Initial build for "${flags.name}"...`);
    const initial = await this.buildOnce(flags, projectPath, Date.now(), {
      throwOnError: false,
    });
    this.log(
      `[${stamp()}] ${initial.success ? `Initial build complete (${initial.fileCount} files)` : 'Initial build failed — waiting for changes'}`,
    );

    const assetsDir = path.join(projectPath, 'assets');
    if (fs.existsSync(assetsDir)) {
      watchers.push(
        fs.watch(assetsDir, { recursive: false }, (_event, filename) => {
          // Only trigger if the change is for this asset's spec file.
          if (filename && !filename.startsWith(flags.name)) return;
          schedule(filename ? String(filename) : null);
        }),
      );
    }

    for (const canvasName of canvasNames) {
      const canvasDir = path.join(projectPath, 'canvases', canvasName);
      if (fs.existsSync(canvasDir)) {
        watchers.push(
          fs.watch(canvasDir, { recursive: true }, (_event, filename) => {
            schedule(filename ? String(filename) : null);
          }),
        );
      }
    }

    const canvasDesc =
      canvasNames.length === 0
        ? ''
        : canvasNames.length === 1
          ? ` and canvas "${canvasNames[0]}"`
          : ` and canvases [${canvasNames.map((c) => `"${c}"`).join(', ')}]`;
    this.log(
      `Watching asset spec${canvasDesc} (debounce: ${flags.debounce}ms). Press Ctrl+C to stop.`,
    );

    await new Promise<void>((resolve) => {
      const shutdown = () => {
        if (pending) clearTimeout(pending);
        for (const w of watchers) {
          try {
            w.close();
          } catch {
            // noop
          }
        }
        this.log(`\n[${stamp()}] Watch stopped (${triggers} rebuild${triggers === 1 ? '' : 's'})`);
        resolve();
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    });
  }
}

function describeCanvases(spec: AssetSpec): string {
  if (spec.type === 'biome-blend') {
    return `${spec.source.canvas} + ${spec.target.canvas}`;
  }
  return spec.canvas;
}

function collectWatchCanvases(spec: AssetSpec): string[] {
  if (spec.type === 'biome-blend') {
    return [spec.source.canvas, spec.target.canvas];
  }
  return [spec.canvas];
}
