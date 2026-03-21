import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

function getBinPath(): string {
  const url = new URL(import.meta.url);
  const dir = url.protocol === 'file:' ? url.pathname.replace(/^\/([A-Z]:)/i, '$1') : url.pathname;
  return path.resolve(path.dirname(dir), '..', '..', '..', 'bin', 'run.js');
}

export default class ProjectWatch extends BaseCommand {
  static override description = 'Watch for file changes and execute a recipe or command';

  static override flags = {
    ...BaseCommand.baseFlags,
    recipe: Flags.string({ description: 'Recipe name to run on change' }),
    command: Flags.string({ description: 'Command string to run on change' }),
    debounce: Flags.integer({ description: 'Debounce delay in ms', default: 500 }),
    pattern: Flags.string({ description: 'File pattern to watch (default: canvases/**/*.png)', default: 'canvases' }),
    timeout: Flags.integer({ description: 'Watch timeout in seconds (0 = indefinite)', default: 0 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectWatch);
    const projectPath = getProjectPath(flags.project);

    if (!flags.recipe && !flags.command) {
      throw new Error('Must provide --recipe or --command');
    }

    const watchDir = path.join(projectPath, flags.pattern);
    if (!fs.existsSync(watchDir)) {
      throw new Error(`Watch directory not found: ${watchDir}`);
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let triggerCount = 0;

    const executeTrigger = () => {
      if (running) return;
      running = true;
      triggerCount++;

      const timestamp = new Date().toISOString().slice(11, 19);
      try {
        if (flags.recipe) {
          console.log(`[${timestamp}] Change detected — running recipe "${flags.recipe}"...`);
          execSync(`node "${getBinPath()}" recipe:run --name "${flags.recipe}" --project "${projectPath}"`, {
            encoding: 'utf-8',
            timeout: 30000,
            stdio: 'pipe',
          });
          console.log(`[${timestamp}] Recipe completed`);
        } else if (flags.command) {
          console.log(`[${timestamp}] Change detected — running: ${flags.command}`);
          execSync(`node "${getBinPath()}" ${flags.command} --project "${projectPath}"`, {
            encoding: 'utf-8',
            timeout: 30000,
            stdio: 'pipe',
          });
          console.log(`[${timestamp}] Command completed`);
        }
      } catch (err: any) {
        console.error(`[${timestamp}] Error: ${err.stderr?.split('\n')[0] || 'Unknown error'}`);
      }
      running = false;
    };

    console.log(`Watching ${watchDir} (debounce: ${flags.debounce}ms)...`);
    console.log('Press Ctrl+C to stop.');

    const watcher = fs.watch(watchDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      // Ignore snapshot and temp files
      if (filename.includes('snapshots') || filename.includes('.tmp')) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(executeTrigger, flags.debounce);
    });

    // Handle timeout
    if (flags.timeout > 0) {
      setTimeout(() => {
        watcher.close();
        const result = makeResult('project:watch', { recipe: flags.recipe, command: flags.command }, { triggers: triggerCount, duration: Date.now() - startTime }, startTime);
        const format = this.getOutputFormat(flags);
        formatOutput(format, result, (r) => {
          console.log(`\nWatch ended after ${flags.timeout}s (${r.triggers} triggers)`);
        });
      }, flags.timeout * 1000);
    }

    // Keep process alive
    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        watcher.close();
        console.log(`\nWatch stopped (${triggerCount} triggers)`);
        resolve();
      });

      if (flags.timeout > 0) {
        setTimeout(resolve, (flags.timeout + 1) * 1000);
      }
    });
  }
}
