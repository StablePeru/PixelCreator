# PixelCreator — Development Guide

## Build & Test
- `pnpm build` — Compile TypeScript with tsup, generate oclif manifest
- `pnpm dev` — Watch mode build (tsup --watch)
- `pnpm test` — Run all tests with vitest
- `pnpm test:coverage` — Run tests with v8 coverage report
- `pnpm test:watch` — Watch mode for tests
- `pnpm lint` / `pnpm lint:fix` — ESLint check / auto-fix
- `pnpm format` — Prettier formatting
- `pnpm pxc <command>` — Run CLI in dev mode (ts-node)
- Run single test: `pnpm vitest run test/core/drawing-engine.test.ts`

## Architecture
- **CLI Framework**: Oclif v4 with topic:command pattern (e.g., `draw:pixel`)
- **Binary**: `pxc` — all commands under `src/commands/{topic}/{command}.ts`

### Command Topics (14 topics, 134 commands)
| Topic | # | Commands |
|-------|---|----------|
| `animation` | 8 | create-tag, edit-tag, export, list-tags, onion-skin, preview, remove-tag, set-timing |
| `canvas` | 13 | clone, create, crop, delete, extract, flip, info, list, rename, resize, rotate, scale, stats |
| `draw` | 16 | bezier, circle, ellipse, fill, gradient, line, outline, pattern-fill, pixel, polygon, polyline, radial-gradient, rect, replace-color, sample, stamp |
| `export` | 13 | 9slice, apng, batch, css, gif, layers, palette-image, png, profile, run, sequence, spritesheet, svg |
| `frame` | 5 | add, duplicate, list, remove, reorder |
| `import` | 5 | ase, gif, palette-image, png, spritesheet |
| `layer` | 23 | add, blend, brightness, clip, contrast, create-group, desaturate, dither, duplicate, edit, flip, hue-shift, invert, list, list-tree, merge, merge-visible, move-to-group, posterize, remove, reorder, rotate, ungroup |
| `palette` | 10 | constraints, create, edit, export, extract, import, info, list, ramp, sort |
| `project` | 6 | description, info, init, settings, tags, validation |
| `recipe` | 5 | create, delete, info, list, run |
| `select` | 11 | all, color, copy, cut, ellipse, info, invert, move, none, paste, rect |
| `template` | 5 | apply, create, delete, info, list |
| `tileset` | 12 | add-tile, create, create-tilemap, delete-tilemap, export, export-tilemap, info, list, remove-tile, render-tilemap, set-cell, tile-props |
| `validate` | 2 | palette, size |

### Core Engines (`src/core/` — 13 engines)
- `animation-engine.ts` — frame sequence resolution, timing, onion skin compositing
- `drawing-engine.ts` — pixel, line, rect, circle, ellipse, fill, gradient, outline, polygon, polyline, bezier, radial gradient, pattern fill, stamp, thickness
- `frame-renderer.ts` — multi-layer flatten with blend modes for export paths
- `layer-engine.ts` — alpha compositing, 14 blend modes, layer groups, clipping masks, merge, resize
- `palette-engine.ts` — color sorting (hue/luminance/saturation), ramp generation, HSL conversion
- `recipe-engine.ts` — recipe validation, variable resolution, command argument building
- `spritesheet-engine.ts` — spritesheet layout (horizontal/vertical/grid), decompose
- `template-engine.ts` — create template from canvas, apply template to new canvas
- `tileset-engine.ts` — tile hashing, slicing, deduplication, tilemap rendering, Tiled export
- `transform-engine.ts` — flip, rotate, scale, brightness, contrast, invert, desaturate, hue-shift, posterize, dither
- `nineslice-engine.ts` — 9-slice UI sprite decomposition
- `selection-engine.ts` — rect/ellipse/color selection, clipboard operations, mask manipulation
- `validation-engine.ts` — size rule validation (exact, min, max, multiple-of)

### I/O Layer (`src/io/` — 8 modules)
- `png-codec.ts` — PixelBuffer class, PNG read/write via pngjs
- `project-io.ts` — project/canvas/palette/tileset/template/recipe/selection/clipboard file I/O
- `gif-encoder.ts` — GIF89a encoding via gifenc
- `gif-decoder.ts` — GIF frame extraction via omggif
- `apng-encoder.ts` — APNG encoding via upng-js
- `palette-codec.ts` — GPL, JASC-PAL, HEX palette format parsers/serializers
- `ase-decoder.ts` — Aseprite .ase/.aseprite binary decoder
- `svg-encoder.ts` — SVG export with pixel-as-rect rendering

### Utilities (`src/utils/`)
- `output-formatter.ts` — `formatOutput`/`makeResult`/`makeErrorResult` for JSON/text/silent output
- `id-generator.ts` — `generateId(prefix)` (timestamp+random), `generateSequentialId(prefix, index)`
- `point-parser.ts` — `parsePoint`, `parsePoints`, `parseRect` for CLI coordinate parsing

### Types (`src/types/`)
- `common.ts` — RGBA, Point, Size, Rect, OutputFormat, CommandResult, color utilities
- `project.ts` — ProjectData, ProjectSettings, ValidationSettings, ExportProfile
- `canvas.ts` — CanvasData, LayerInfo, FrameInfo, AnimationTag, BlendMode
- `palette.ts` — PaletteData, PaletteColor, PaletteConstraints, PaletteRamp
- `tileset.ts` — TilesetData, TileInfo, TilemapData, TilemapCell
- `template.ts` — TemplateData, TemplateLayerDef
- `recipe.ts` — RecipeData, RecipeStep
- `selection.ts` — SelectionMask, SelectionShape, SelectionInfo, ClipboardData
- Ambient declarations: `gifenc.d.ts`, `omggif.d.ts`, `upng-js.d.ts`

## Code Conventions
- ESM with `.js` extensions in imports
- All commands extend `BaseCommand` from `src/commands/base-command.ts`
- Base flags: `--project`, `--output` (text/json/silent), `--verbose`, `--dry-run`, `--no-color`
- All commands support `--output json` via `formatOutput`/`makeResult` pattern
- Project path resolved via `getProjectPath(flags.project)` (auto-detect or --project flag)
- IDs generated via `generateId(prefix)` — timestamp+random
- Layer frame storage: one PNG per layer per frame at `canvases/{name}/layers/{layerId}/{frameId}.png`
- Coverage tracked for `src/core/`, `src/io/`, `src/utils/` (commands excluded)
- Test structure mirrors src: `test/core/`, `test/io/`, `test/utils/`, `test/commands/`, `test/e2e/`

## Project Format (.pxc)
Directory-based format: `{name}.pxc/` containing:
```
project.json                    — root manifest (ProjectData)
palettes/
  {name}.palette.json           — palette definition
canvases/
  {name}/
    canvas.json                 — canvas metadata (CanvasData)
    layers/
      {layerId}/
        {frameId}.png           — per-layer per-frame pixel data
tilesets/
  {name}.tileset.json           — tileset definition + tiles/ directory
templates/
  {name}.template.json          — template definition
recipes/
  {name}.recipe.json            — automation recipe
selections/
  {canvasName}.selection.png    — active selection mask (grayscale)
clipboard/
  clipboard.json                — clipboard metadata
  content.png                   — clipboard pixel data
exports/                        — export output directory
```

## Dependencies
- **Runtime**: @oclif/core, @oclif/plugin-help, pngjs, gifenc, omggif, upng-js, zod
- **Node**: >= 20.0.0
- **Package manager**: pnpm

## Current Status: v0.14.0 — Milestone 14 Complete
134 commands across 14 topics, 13 core engines, ~75 test suites. See CHANGELOG.md for milestone details.
