# PixelCreator Architecture Reference

Authoritative, detailed snapshot of the PixelCreator monorepo. Loaded on demand by skills when they need full topology — not included in every prompt.

**Last refreshed**: 2026-04-18 · **Version**: v2.0.0-beta.12

## Monorepo

| Package | Workspace alias | Role |
|---------|-----------------|------|
| `packages/core/` | `@pixelcreator/core` | Engines, I/O, types, utilities |
| `packages/cli/` | `@pixelcreator/cli` | 232 oclif commands across 23 topics (`pxc` binary) |
| `packages/studio/` | `@pixelcreator/studio` | Hono REST API + React SPA + WebSocket |

Dependency chain: core → cli / studio (both depend on core, not on each other).

## CLI Topics (23 topics · 232 commands)

| Topic | # | Description |
|-------|---|-------------|
| `animation` | 12 | Timeline, tags, timing, onion skin, export |
| `brush` | 6 | Presets: list, create, delete, show, import, export |
| `canvas` | 21 | Create, crop, flip, resize, stats, compare, symmetry |
| `dataset` | 4 | AI training dataset: rate, list, export, stats |
| `draw` | 23 | Pixel, line, rect, circle, fill, gradient, polygon, bezier, stroke, symmetric, batch |
| `effect` | 10 | Drop-shadow, outer-glow, outline, color-overlay, add, remove, list, toggle, edit, reorder |
| `gamedev` | 8 | Godot (.tres/.tscn), Unity (sprite JSON), generic metadata |
| `generate` | 8 | Noise (simplex/fBm/turbulence), checkerboard, stripes, grid-dots, brick, noise-map, terrain, preview |
| `guide` | 6 | Add, remove, list, clear, move, snap |
| `export` | 18 | PNG, GIF, APNG, spritesheet, SVG, ASE, HTML, ICO |
| `frame` | 8 | Add, duplicate, remove, reorder, label |
| `import` | 5 | PNG, GIF, ASE, palette image, spritesheet |
| `layer` | 27 | Blend modes, groups, merge, transforms, reference layers |
| `palette` | 12 | Create, sort, ramp, harmony, constraints |
| `plugin` | 6 | Init, install, toggle, uninstall |
| `project` | 14 | Init, settings, snapshots, watch, benchmark, preferences |
| `recipe` | 5 | Automation recipes |
| `select` | 11 | Rect, ellipse, color, clipboard ops |
| `studio` | 1 | Start web GUI server |
| `template` | 5 | Create, apply, manage |
| `tileset` | 12 | Tiles, tilemaps, Tiled export |
| `validate` | 3 | Palette/size/accessibility |
| `view` | 2 | Terminal preview, web preview |

## Core Engines (`packages/core/src/core/` — 25)

- `accessibility-engine.ts` — CVD simulation (protanopia, deuteranopia, tritanopia, achromatopsia), WCAG contrast.
- `animation-engine.ts` — frame sequences, timing, onion skin, palette cycling.
- `brush-engine.ts` — brush masks, symmetry, stroke interpolation, pixel-perfect filtering.
- `buffer-pool.ts` — reusable pixel buffer pool.
- `color-analysis-engine.ts` — histogram, palette generation, color harmony.
- `composite-cache.ts` — LRU cache for layer composites.
- `drawing-engine.ts` — pixel, line, rect, circle, ellipse, fill, gradient, polygon, bezier, stamp, symmetric draw, brush stroke.
- `effects-engine.ts` — non-destructive effects: drop shadow, outer glow, outline, color overlay, box blur.
- `frame-renderer.ts` — multi-layer flatten with scale (excludes reference layers).
- `gamedev-engine.ts` — Godot .tres/.tscn, Unity sprite JSON, generic metadata, spritesheet generation.
- `guide-engine.ts` — guide lines CRUD, snap-to-guide calculation, validation.
- `hook-manager.ts` — plugin lifecycle hooks.
- `layer-engine.ts` — alpha compositing, 14 blend modes, groups, clipping masks.
- `nineslice-engine.ts` — 9-slice UI sprite decomposition.
- `palette-engine.ts` — color sorting, ramp generation, HSL conversion.
- `plugin-loader.ts` — plugin discovery and management.
- `procedural-engine.ts` — Simplex noise 2D, fBm, turbulence, checkerboard, stripes, grid-dots, brick.
- `recipe-engine.ts` — recipe validation, variable resolution.
- `selection-engine.ts` — rect/ellipse/color selection, clipboard ops.
- `spritesheet-engine.ts` — layout (horizontal/vertical/grid), decompose.
- `template-engine.ts` — template create/apply.
- `tileset-engine.ts` — tile hashing, slicing, dedup, tilemap rendering.
- `transform-engine.ts` — flip, rotate, scale, brightness, contrast, hue-shift, dither.
- `tween-engine.ts` — frame interpolation, easing.
- `validation-engine.ts` — size rule validation.

## I/O (`packages/core/src/io/` — 12)

- `png-codec.ts` — `PixelBuffer` class, PNG read/write.
- `project-io.ts` — project/canvas/palette/tileset/template/recipe/selection/clipboard I/O.
- `gif-encoder.ts` / `gif-decoder.ts` — GIF encoding/decoding.
- `apng-encoder.ts` — APNG encoding.
- `ase-encoder.ts` / `ase-decoder.ts` — Aseprite format.
- `palette-codec.ts` — GPL, JASC-PAL, HEX.
- `svg-encoder.ts` — SVG export.
- `snapshot-io.ts` — canvas snapshots.
- `html-renderer.ts` — interactive HTML export.
- `terminal-renderer.ts` — ANSI terminal rendering.

## Studio (`packages/studio/`)

- **Backend**: Hono REST API (98+ endpoints) + WebSocket.
- **Frontend**: React SPA (Vite), 43 components, SVG icon system.
- **Design System**: CSS custom properties (22 theme vars), Inter + JetBrains Mono, custom form controls.
- **Themes**: dark, light, high-contrast, aseprite.
- **Features**: 12 drawing tools, undo/redo, layer management, animation playback, tileset editor, export/import dialogs with live preview, AI dataset feedback, agent activity panel, AI Agent Mode (session control, approve/reject, feedback), command palette, collapsible sidebar panels, toast notifications.

## Utilities (`packages/core/src/utils/`)

- `output-formatter.ts` — `formatOutput` / `makeResult` for JSON/text/silent.
- `id-generator.ts` — `generateId(prefix)` / `generateSequentialId(prefix, index)`.
- `point-parser.ts` — `parsePoint` / `parsePoints` / `parseRect`.

## Types (`packages/core/src/types/`)

- `brush.ts` — BrushPreset, BrushShape, SymmetryConfig, SymmetryMode, BrushStroke.
- `common.ts` — RGBA, Point, Size, Rect, OutputFormat, CommandResult, color utilities.
- `guide.ts` — GuideInfo, GuideConfig, GuideOrientation, StudioPreferences.
- `project.ts` — ProjectData, ProjectSettings, ValidationSettings, ExportProfile.
- `canvas.ts` — CanvasData, LayerInfo, FrameInfo, AnimationTag, BlendMode.
- `palette.ts` — PaletteData, PaletteColor, PaletteConstraints, PaletteRamp.
- `tileset.ts` — TilesetData, TileInfo, TilemapData, TilemapCell.
- `template.ts` — TemplateData, TemplateLayerDef.
- `recipe.ts` — RecipeData, RecipeStep.
- `selection.ts` — SelectionMask, SelectionShape, ClipboardData.
- `plugin.ts` — PluginManifest, HookManager types.
- `agent.ts` — AgentSession, AgentOperation, OperationFeedback, AgentSessionSummary.

## Dependencies

- **core** runtime: pngjs, gifenc, omggif, upng-js, zod.
- **cli** runtime: @oclif/core, @oclif/plugin-help, @pixelcreator/core, @pixelcreator/studio.
- **studio** runtime: hono, @hono/node-server, ws, react, react-dom, zod, @pixelcreator/core.
- **Node** ≥ 20.0.0. **Package manager** pnpm (workspace).

## Storage layout (`.pxc/`)

- `canvases/{canvasName}/layers/{layerId}/{frameId}.png` — layer frame bitmaps.
- `project.json` — project settings, canvas list, palettes.
- `snapshots/` — optional canvas snapshots.

## Test structure

- `packages/core/test/` — engine + I/O + utils tests.
- `packages/cli/test/commands/` — command tests (hyphenated filename: `<topic>-<command>.test.ts`).
- `packages/studio/test/` — route + web tests.
- Coverage target: 80%+ overall (track core package explicitly).
