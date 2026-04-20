# PixelCreator — Architecture at a glance

CLI-first pixel-art toolkit for game development. pnpm workspace monorepo.

```
@pixelcreator/core  ──►  @pixelcreator/cli
                   └──►  @pixelcreator/studio
```

Every feature flows in this order: **types → engine → I/O → CLI command → Studio route → Studio UI → tests at each level**.

## Packages

### `packages/core/` (`@pixelcreator/core`)

Pure domain logic. No filesystem side effects above the `io/` layer.

- **`src/types/`** — TypeScript interfaces (`Canvas`, `Layer`, `Frame`, `Palette`, `PixelBuffer`, `ValidationFlag`, ...). Single source of truth for all data shapes.
- **`src/core/`** — ~32 engines. Static-method or pure-class pattern. Inputs typed; outputs typed; no mutation of inputs (spread new objects).
- **`src/io/`** — 12 modules bridging engines to disk (`canvas-io`, `palette-io`, `validation-io`, ...). Storage layout: `canvases/{name}/layers/{layerId}/{frameId}.png`.
- **`src/utils/`** — Deterministic helpers: `generateSequentialId(prefix, index)`, colour conversions, buffer scaling.
- **Exports** — all public API via `src/index.ts` barrel. Consumers must import from `@pixelcreator/core`, never deep paths.

### `packages/cli/` (`@pixelcreator/cli`)

oclif v4 CLI (`pxc` binary). 245+ commands across 24 topics.

- Every command extends `BaseCommand` (`src/commands/base-command.ts`) and inherits `baseFlags`: `--project/-p`, `--output text|json|silent`, `--verbose/-v`, `--dry-run`, `--no-color`.
- Topics map 1:1 to directories: `draw/`, `canvas/`, `layer/`, `frame/`, `palette/`, `animation/`, `tileset/`, `export/`, `validate/`, `validation/`, `asset/`, ...
- CLI is CLI-first — every feature that Studio exposes must also be reachable via `pxc <topic>:<command> --output json`.

### `packages/studio/` (`@pixelcreator/studio`)

Hono REST API + React SPA + WebSocket.

- **`src/server/`** — Hono app (`app.ts` registers all routes), 22+ route modules under `src/server/routes/`, ~344 endpoints. File watcher at `src/ws/watcher.ts` (native `fs.watch`, 200 ms debounce) drives `WsBroadcaster` at `src/ws/handler.ts`.
- **`src/web/`** — React SPA. Plain React Context for state (`ColorContext`, `ToolContext`, `BrushContext`), plain `fetch()` for data. Hooks under `src/web/hooks/` follow the `useCanvasLive` pattern: fetch on mount → store in local state → refetch on WS event.
- **Ports (dev)** — API `:3000`, SPA `:5173` (proxies `/api` to `:3000`).
- **Views** — editor view (default) and `Review` view (read-only validation GUI, see `docs/validation-gui.md`).

## Data flow (drawing primitive example)

```
user ──► pxc draw:rect ──► BaseCommand (flags) ──► DrawingEngine.rect() ──► canvas-io.writeFrame()
                                                                                    │
                                                               (fs change)  ────────┤
                                                                                    ▼
                                                          ProjectWatcher → WsBroadcaster → all SPA clients
```

## Conventions (enforced)

- **ESM** everywhere. All imports use `.js` extension (TypeScript emits `.js`, source files are `.ts`/`.tsx`).
- **Immutability** — never mutate input buffers/arrays; return new objects via spread.
- **Deterministic IDs** — `generateSequentialId(prefix, n)` → `layer-001`, `frame-001`, `flag-001`.
- **Files** — 200–400 lines typical, 800 max. Many small files over few large ones.
- **Tests** — colocated per package under `test/`; ≥ 80 % coverage on core.

## Claude Code devkit

Project-specific development workflow ships via `pixelcreator-devkit/` (versioned plugin, v0.2.0):

- **Dev skills** — `/pxdk:plan`, `/pxdk:tdd`, `/pxdk:verify`, `/pxdk:code-review`, `/pxdk:update-codemaps`, `/pxdk:update-docs`, `/pxdk:release`, **`/pxdk:close-task`** (end-of-task pipeline).
- **Artist skills** — `/pxdk:pixel-scene`, `/pxdk:sprite-sheet`, `/pxdk:animate`, `/pxdk:palette-design`.
- **Subagents** — `engine-expert`, `cli-expert`, `studio-expert`, `pxc-artist`.
- **Hooks** — bash safety (PreToolUse), auto-lint (PostToolUse), session context (SessionStart), verify + push reminders (Stop).
- **MCP** — git + filesystem servers.

Recommended pipeline: `/pxdk:plan` → `/pxdk:tdd` → implement → `/pxdk:code-review` → `/pxdk:close-task`.

## Canonical deep reference

`pixelcreator-devkit/rules/architecture-reference.md` is the detailed source (engine-by-engine, route-by-route). Update that file after large refactors; this page is only the entry point.
