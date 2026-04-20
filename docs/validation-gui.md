# Validation GUI (Studio "Review" mode)

The Review tab in PixelCreator Studio is a **read-only validation surface**. It does not edit pixels — it lets a human inspect results the agent produced and record structured *flags* that the agent can read back via CLI.

The loop: **human flags in GUI → agent reads via CLI → agent fixes → agent marks resolved → GUI re-renders over WebSocket**.

## Running it

Two terminals (dev):

```bash
# Terminal 1 — API server on :3000
pnpm --filter @pixelcreator/studio start

# Terminal 2 — SPA on :5173 (proxies /api to :3000)
pnpm --filter @pixelcreator/studio dev:web
```

Open `http://localhost:5173`, click the **Review** button at the top. The Editor view is still one click away.

## The CLI surface (agent-facing)

Everything the GUI does is also available as a `pxc` command, so the agent never needs browser access.

| Command | Purpose |
|---------|---------|
| `pxc validation:flag --canvas <name> --severity <s> --category <c> --note "<text>" [--frame N] [--layer layer-001] [--region x,y,w,h] [--tag t]` | Create a flag |
| `pxc validation:list --canvas <name> [--open-only] [--severity] [--category] [--frame] [--layer]` | List flags (JSON with `--output json`) |
| `pxc validation:resolve --canvas <name> --id flag-003 --resolution "fixed palette in layer-body"` | Mark a flag resolved with a fix note |
| `pxc validation:remove --canvas <name> --id flag-003` | Delete a flag |
| `pxc validation:report --canvas <name>` | Consolidated report: manual flags + automatic size-rule violations |

All commands support `--output json`, `--project`, `--dry-run`, and the rest of the `BaseCommand` flags.

## Storage

Flags for a canvas live at:

```
<project>.pxc/canvases/<name>/.validation/flags.json
```

Schema: `{ version: 1, canvas: "<name>", flags: ValidationFlag[] }`. IDs are deterministic (`flag-001`, `flag-002`, ...) via `generateSequentialId`.

## WebSocket events

Studio's `ProjectWatcher` already watches `canvases/` recursively. When `.validation/flags.json` changes it emits a dedicated `validation:updated` event (distinct from `canvas:updated`) so the Review panel can refresh without repainting the pixel canvas.

## A typical session

1. User switches to **Review**, picks a canvas, clicks **Run auto-validate**. Sees size violations if any.
2. User spots a color drift, click-drags the pixel region in the preview, selects `warning` + `palette`, writes a note, attaches tags, clicks **Create flag**.
3. Agent in another terminal:
   ```bash
   pxc validation:list --canvas hero --open-only --output json
   ```
   …picks up the flag, investigates, applies a fix via the normal CLI, then:
   ```bash
   pxc validation:resolve --canvas hero --id flag-001 --resolution "switched off-palette pixels to #306230 in layer-body"
   ```
4. Studio auto-refreshes over WS; the flag moves into the resolved list in the panel.

## Why CLI-first

The agent never drives a browser. The GUI is for humans. By making the validation model identical on both sides (same `ValidationFlag` JSON, same store on disk, same endpoints), the agent and the human always see the same state with no translation layer.
