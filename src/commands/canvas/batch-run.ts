import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

function getBinPath(): string {
  const url = new URL(import.meta.url);
  const dir = url.protocol === 'file:' ? url.pathname.replace(/^\/([A-Z]:)/i, '$1') : url.pathname;
  return path.resolve(path.dirname(dir), '..', '..', '..', 'bin', 'run.js');
}

export default class CanvasBatchRun extends BaseCommand {
  static override description = 'Execute a command on each canvas in the project';

  static override flags = {
    ...BaseCommand.baseFlags,
    command: Flags.string({ description: 'Command to run (use {{canvas}} for canvas name)', required: true }),
    canvases: Flags.string({ description: 'Comma-separated canvas names (omit for all)' }),
    all: Flags.boolean({ description: 'Run on all canvases', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasBatchRun);
    const projectPath = getProjectPath(flags.project);

    const project = readProjectJSON(projectPath);
    let canvasNames: string[];

    if (/[;&|`$()]/.test(flags.command)) {
      throw new Error('Command contains unsafe shell characters. Use a recipe for complex operations.');
    }

    if (flags.all) {
      canvasNames = project.canvases;
    } else if (flags.canvases) {
      canvasNames = flags.canvases.split(',').map((s) => s.trim());
    } else {
      throw new Error('Must provide --canvases or --all');
    }

    const results: Array<{ canvas: string; success: boolean; output?: string; error?: string }> = [];

    for (const canvasName of canvasNames) {
      const cmd = flags.command.replace(/\{\{canvas\}\}/g, canvasName);
      try {
        const output = execSync(`node "${getBinPath()}" ${cmd} --project "${projectPath}"`, {
          encoding: 'utf-8',
          timeout: 30000,
        });
        results.push({ canvas: canvasName, success: true, output: output.trim() });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ canvas: canvasName, success: false, error: msg });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const result = makeResult('canvas:batch-run', { command: flags.command, canvases: canvasNames }, { results, succeeded, failed, total: canvasNames.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      for (const res of r.results) {
        const icon = res.success ? 'OK' : 'FAIL';
        console.log(`  [${icon}] ${res.canvas}${res.error ? ` — ${res.error}` : ''}`);
      }
      console.log(`${r.succeeded}/${r.total} succeeded`);
    });
  }
}
