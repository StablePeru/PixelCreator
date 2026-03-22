# PixelCreator — Development Guide

## Monorepo Structure
pnpm workspace with 3 packages:
- `packages/core/` (`@pixelcreator/core`) — Engines, I/O, types, utilities
- `packages/cli/` (`@pixelcreator/cli`) — 175 oclif commands across 18 topics
- `packages/studio/` (`@pixelcreator/studio`) — Web GUI (Hono API + React frontend + WebSocket)

## Build & Test
- `pnpm -r build` — Build all packages (core → cli → studio)
- `pnpm -r test` — Run all tests across packages
- `pnpm -r lint` — Lint all packages
- `pnpm --filter @pixelcreator/core test` — Run core tests only
- `pnpm --filter @pixelcreator/studio test` — Run studio tests only
- `pnpm --filter @pixelcreator/cli test` — Run CLI tests only
- `pnpm pxc <command>` — Run CLI in dev mode (ts-node)
- Run single test: `cd packages/core && pnpm vitest run test/core/drawing-engine.test.ts`

## Architecture
- **CLI Framework**: Oclif v4 with topic:command pattern (e.g., `draw:pixel`)
- **Binary**: `pxc` — all commands under `packages/cli/src/commands/{topic}/{command}.ts`
- **Studio**: Hono REST API + WebSocket + React SPA at `packages/studio/`

### Command Topics (18 topics, 175 commands)
| Topic | # | Description |
|-------|---|-------------|
| `animation` | 12 | Timeline, tags, timing, onion skin, export |
| `canvas` | 19 | Create, crop, flip, resize, stats, compare |
| `dataset` | 4 | AI training dataset: rate, list, export, stats |
| `draw` | 18 | Pixel, line, rect, circle, fill, gradient, polygon, bezier |
| `export` | 18 | PNG, GIF, APNG, spritesheet, SVG, ASE, HTML, ICO |
| `frame` | 8 | Add, duplicate, remove, reorder, label |
| `import` | 5 | PNG, GIF, ASE, palette image, spritesheet |
| `layer` | 23 | Blend modes, groups, merge, transforms |
| `palette` | 12 | Create, sort, ramp, harmony, constraints |
| `plugin` | 6 | Init, install, toggle, uninstall |
| `project` | 12 | Init, settings, snapshots, watch, benchmark |
| `recipe` | 5 | Automation recipes |
| `select` | 11 | Rect, ellipse, color, clipboard ops |
| `studio` | 1 | Start web GUI server |
| `template` | 5 | Create, apply, manage templates |
| `tileset` | 12 | Tiles, tilemaps, Tiled export |
| `validate` | 2 | Palette/size validation |
| `view` | 2 | Terminal preview, web preview |

### Core Engines (`packages/core/src/core/` — 19 modules)
- `animation-engine.ts` — frame sequences, timing, onion skin, palette cycling
- `buffer-pool.ts` — reusable pixel buffer pool
- `color-analysis-engine.ts` — histogram, palette generation, color harmony
- `composite-cache.ts` — LRU cache for layer composites
- `drawing-engine.ts` — pixel, line, rect, circle, ellipse, fill, gradient, polygon, bezier, stamp
- `frame-renderer.ts` — multi-layer flatten with scale
- `hook-manager.ts` — plugin lifecycle hooks
- `layer-engine.ts` — alpha compositing, 14 blend modes, groups, clipping masks
- `nineslice-engine.ts` — 9-slice UI sprite decomposition
- `palette-engine.ts` — color sorting, ramp generation, HSL conversion
- `plugin-loader.ts` — plugin discovery and management
- `recipe-engine.ts` — recipe validation, variable resolution
- `selection-engine.ts` — rect/ellipse/color selection, clipboard ops
- `spritesheet-engine.ts` — layout (horizontal/vertical/grid), decompose
- `template-engine.ts` — template create/apply
- `tileset-engine.ts` — tile hashing, slicing, dedup, tilemap rendering
- `transform-engine.ts` — flip, rotate, scale, brightness, contrast, hue-shift, dither
- `tween-engine.ts` — frame interpolation, easing
- `validation-engine.ts` — size rule validation

### I/O Layer (`packages/core/src/io/` — 12 modules)
- `png-codec.ts` — PixelBuffer class, PNG read/write
- `project-io.ts` — project/canvas/palette/tileset/template/recipe/selection/clipboard I/O
- `gif-encoder.ts` / `gif-decoder.ts` — GIF encoding/decoding
- `apng-encoder.ts` — APNG encoding
- `ase-encoder.ts` / `ase-decoder.ts` — Aseprite format
- `palette-codec.ts` — GPL, JASC-PAL, HEX formats
- `svg-encoder.ts` — SVG export
- `snapshot-io.ts` — canvas snapshots
- `html-renderer.ts` — interactive HTML export
- `terminal-renderer.ts` — ANSI terminal rendering

### Studio (`packages/studio/`)
- **Backend**: Hono REST API (50+ endpoints) + WebSocket for real-time updates
- **Frontend**: React SPA with Vite — canvas viewer, drawing tools, layer panel, timeline, palette picker
- **Features**: 12 drawing tools, undo/redo, layer management, animation playback, tileset editor, export/import dialogs, AI dataset feedback, agent activity panel, command palette, 4 themes

### Utilities (`packages/core/src/utils/`)
- `output-formatter.ts` — `formatOutput`/`makeResult` for JSON/text/silent output
- `id-generator.ts` — `generateId(prefix)`, `generateSequentialId(prefix, index)`
- `point-parser.ts` — `parsePoint`, `parsePoints`, `parseRect`

### Types (`packages/core/src/types/`)
- `common.ts` — RGBA, Point, Size, Rect, OutputFormat, CommandResult, color utilities
- `project.ts` — ProjectData, ProjectSettings, ValidationSettings, ExportProfile
- `canvas.ts` — CanvasData, LayerInfo, FrameInfo, AnimationTag, BlendMode
- `palette.ts` — PaletteData, PaletteColor, PaletteConstraints, PaletteRamp
- `tileset.ts` — TilesetData, TileInfo, TilemapData, TilemapCell
- `template.ts` — TemplateData, TemplateLayerDef
- `recipe.ts` — RecipeData, RecipeStep
- `selection.ts` — SelectionMask, SelectionShape, ClipboardData
- `plugin.ts` — PluginManifest, HookManager types

## Code Conventions
- ESM with `.js` extensions in imports
- All CLI commands extend `BaseCommand` from `packages/cli/src/commands/base-command.ts`
- Core imports via `@pixelcreator/core` barrel export
- Base flags: `--project`, `--output` (text/json/silent), `--verbose`, `--dry-run`, `--no-color`
- IDs generated via `generateSequentialId(prefix, index)` — deterministic (layer-001, frame-001)
- Layer frame storage: `canvases/{name}/layers/{layerId}/{frameId}.png`
- Coverage tracked for core package (`packages/core/src/core/`, `src/io/`, `src/utils/`)
- Test structure: `packages/core/test/`, `packages/cli/test/`, `packages/studio/test/`

## Dependencies
- **Runtime (core)**: pngjs, gifenc, omggif, upng-js, zod
- **Runtime (cli)**: @oclif/core, @oclif/plugin-help, @pixelcreator/core, @pixelcreator/studio
- **Runtime (studio)**: hono, @hono/node-server, ws, react, react-dom, zod, @pixelcreator/core
- **Node**: >= 20.0.0
- **Package manager**: pnpm (workspace)

## Current Status: v2.0.0-beta.4
175 commands across 18 topics, 19 core engines, 12 I/O modules, 50+ REST API endpoints, React GUI with 12 drawing tools, 112 test files, 1020 tests (0 failures). Monorepo with 3 packages.
