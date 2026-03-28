import { Flags } from '@oclif/core';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  buildStateMachineFromTags,
  validateStateMachine,
  exportGodotAnimationTree,
  exportUnityAnimatorController,
  exportStateMachineGeneric,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';
import type { GameEngine, AnimationStateMachine } from '@pixelcreator/core';

export default class GamedevExportStateMachine extends BaseCommand {
  static override description = 'Export animation state machine for game engines';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    engine: Flags.string({
      description: 'Target engine',
      required: true,
      options: ['godot', 'unity', 'generic'],
    }),
    dest: Flags.string({ description: 'Output directory', required: true }),
    config: Flags.string({ description: 'JSON file with state machine definition' }),
    'auto-linear': Flags.boolean({
      description: 'Auto-generate linear state machine from tags',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevExportStateMachine);
    const projectPath = getProjectPath(flags.project);
    const engine = flags.engine as GameEngine;

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let sm: AnimationStateMachine;

    if (flags.config) {
      if (!existsSync(flags.config)) this.error(`Config file not found: ${flags.config}`);
      sm = JSON.parse(readFileSync(flags.config, 'utf-8'));
    } else if (flags['auto-linear']) {
      sm = buildStateMachineFromTags(canvas.animationTags);
    } else {
      this.error('Either --config or --auto-linear is required');
    }

    const errors = validateStateMachine(sm, canvas.animationTags);
    if (errors.length > 0) this.error(`Validation failed:\n${errors.join('\n')}`);

    let content: string;
    let filename: string;
    switch (engine) {
      case 'godot':
        content = exportGodotAnimationTree(sm);
        filename = `${flags.canvas}_state_machine.tres`;
        break;
      case 'unity':
        content = JSON.stringify(exportUnityAnimatorController(sm), null, 2);
        filename = `${flags.canvas}_animator.json`;
        break;
      default:
        content = JSON.stringify(exportStateMachineGeneric(sm), null, 2);
        filename = `${flags.canvas}_state_machine.json`;
        break;
    }

    if (!existsSync(flags.dest)) mkdirSync(flags.dest, { recursive: true });
    writeFileSync(join(flags.dest, filename), content, 'utf-8');

    const result = makeResult(
      'gamedev:export-state-machine',
      { canvas: flags.canvas, engine, dest: flags.dest },
      { engine, filename, states: sm.states.length },
      startTime,
    );
    formatOutput(this.getOutputFormat(flags), result, (r) => {
      console.log(`Exported ${r.engine} state machine (${r.states} states) → ${r.filename}`);
    });
  }
}
