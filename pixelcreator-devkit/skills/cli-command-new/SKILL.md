---
name: cli-command-new
description: Scaffold a new oclif command in packages/cli/src/commands/<topic>/<cmd>.ts with BaseCommand, flags, result emission and a vitest test. Triggers when the user asks to expose a core engine via the pxc CLI.
---

# CLI-Command-New Skill

Scaffold a new `pxc` CLI command wired to an existing core engine.

## Pre-checks

1. Confirm the backing engine exists (or ask the `engine-expert` subagent).
2. Pick:
   - **Topic** (existing preferred: animation, brush, canvas, dataset, draw, effect, gamedev, generate, guide, export, frame, import, layer, palette, plugin, project, recipe, select, studio, template, tileset, validate, view).
   - **Command name** (kebab-case, e.g., `sharpen`).
3. Confirm no collision: `packages/cli/src/commands/<topic>/<cmd>.ts` must not exist.

## Files to create

### 1. Command file
`packages/cli/src/commands/<topic>/<cmd>.ts`:

```typescript
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { <Name>Engine, type <Name>Config } from '@pixelcreator/core';
import { makeResult } from '@pixelcreator/core';

export default class <Topic><Name> extends BaseCommand {
  static description = '<One-line description>';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ description: 'Canvas name', required: true }),
    // domain-specific flags
  };

  static examples = [
    '<%= config.bin %> <%= command.id %> --project my.pxc --canvas main --output json',
  ];

  async run(): Promise<void> {
    const { flags } = await this.parse(<Topic><Name>);
    const project = await this.loadProject(flags.project);
    const buffer = project.getCanvas(flags.canvas);

    const config: <Name>Config = { /* map from flags */ };
    const result = <Name>Engine.apply(buffer, config);
    await project.setCanvas(flags.canvas, result.buffer);
    await project.save();

    this.emit(makeResult({
      command: '<topic>:<cmd>',
      data: { canvas: flags.canvas /* ... */ },
    }));
  }
}
```

### 2. Test file
`packages/cli/test/commands/<topic>-<cmd>.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { runCommand } from '@oclif/test';

describe('<topic>:<cmd>', () => {
  it('emits success result in JSON', async () => {
    const { stdout } = await runCommand([
      '<topic>:<cmd>',
      '--project', 'test-fixtures/blank.pxc',
      '--canvas', 'main',
      '--output', 'json',
    ]);
    const payload = JSON.parse(stdout);
    expect(payload.ok).toBe(true);
  });

  it('fails on missing canvas', async () => { /* ... */ });
  it('respects --dry-run', async () => { /* ... */ });
});
```

## After scaffolding

- Run `pnpm --filter @pixelcreator/cli build` to regenerate `oclif.manifest.json`.
- Run the new test (should fail until logic wiring is correct — TDD).
- Prompt the user to add a matching Studio route (use `studio-route-new`).

## Anti-patterns

- Don't reach into engines with `new`/mutation — always use static factory methods.
- Don't skip `BaseCommand` — lose standard flags + output formatter.
- Don't `console.log`; use `this.emit(makeResult(...))`.
- Don't write business logic in the command — call the engine.

Command to scaffold: $ARGUMENTS
