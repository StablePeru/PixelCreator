# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.18.0] - 2026-03-21

### Added — Milestone 18: Advanced Export

#### New I/O Module
- `ase-encoder.ts` — Aseprite .ase binary encoder with layers, compressed cels (zlib), tags, palette

#### Spritesheet Engine Enhancement
- `composeSpritesheet` gains `margin` and `padding` — outer border + per-frame pixel extrusion for UV bleeding prevention

#### Export Commands (4 new, 1 modified)
- `export:ase` — Export as Aseprite .ase with layers/frames/tags/palette
- `export:atlas` — Texture atlas for Unity/Godot/Generic with margin/padding
- `export:ico` — ICO (Windows icon) with multiple sizes
- `export:data-url` — Base64 data URL for web embedding
- `export:spritesheet` — Added `--margin`, `--padding` flags

#### Test Coverage
- 11 new tests, 805 total, 0 failures

**Total: 4 new commands, 1 modified, 1 new I/O module, 11 new tests**

## [0.17.0] - 2026-03-21

### Added — Milestone 17: Quality & Polish

#### Bug Fixes
- Fixed flaky E2E test (`animation tag pipeline`) by adding explicit 30s timeout
- Fixed shell injection vulnerability in `project:watch --command` and `canvas:batch-run --command` — unsafe characters (`;&|` etc.) are now rejected

#### Code Quality
- Created `eslint.config.js` for ESLint v9+ with TypeScript support
- Installed `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`
- Eliminated `any` types in `layer:list-tree`, `canvas:batch-run`, `project:watch`

#### CI/CD
- Added `.github/workflows/ci.yml` — GitHub Actions runs build + test on push/PR (Node 20 & 22)

#### NPM Publish Readiness
- Created `.npmignore` — excludes test/, src/, .github/, config files from npm package

#### Test Results
- **794 tests, 0 failures** (previously 1 flaky failure)
- 80 test suites all passing

**Total: 0 new commands, 4 quality improvements, 0 new tests (1 flaky fixed)**

## [0.16.0] - 2026-03-21

### Added — Milestone 16: Scripting & Workflow

#### Snapshot System
- `snapshot-io.ts` — Create, list, restore, delete canvas snapshots
- `project:snapshot` — Save canvas state (`--description`)
- `project:restore` — Restore canvas from snapshot (`--snapshot ID`)
- `project:snapshots` — List all snapshots

#### Batch Operations
- `draw:batch-replace` — Find & replace color across all layers/frames (`--all-frames`, `--all-layers`, `--tolerance`)
- `canvas:batch-run` — Execute command on each canvas (`--all`, `--canvases`, `{{canvas}}` template)

#### Project Utilities
- `project:clean` — Clean temporary data (`--snapshots`, `--clipboard`, `--selections`, `--all`)
- `project:watch` — Watch for file changes and trigger recipe/command (`--recipe`, `--command`, `--debounce`)

#### Storage
- Snapshots stored at `{project}.pxc/snapshots/{id}/` with full canvas copy + metadata JSON

#### Test Coverage
- Unit tests: snapshot-io (9)
- Integration tests: workflow (9)
- Total: 18 new tests

**Total: 7 new commands, 1 new I/O module, 18 new tests**

## [0.15.0] - 2026-03-21

### Added — Milestone 15: Animation v2

#### New Core Engine
- `tween-engine.ts` — `tweenFrames` (pixel cross-fade interpolation), `applyEasing` (linear, ease-in, ease-out, ease-in-out)

#### Animation Engine Enhancements
- `generatePaletteCycleFrames` — Generate animation frames by rotating palette colors
- `reverseFrameRange` — Reverse frame order (durations and labels) within a range

#### Animation Commands (4 new)
- `animation:tween` — Generate interpolated frames between two keyframes (`--steps`, `--layer`)
- `animation:cycle-palette` — Generate palette cycling animation (`--indices`, `--frames`, `--duration`)
- `animation:reverse-frames` — Reverse frame order in range (`--from/--to` or `--tag`)
- `animation:ease` — Apply easing curve to frame durations (`--ease`, `--total-duration`)

#### Frame Commands (3 new)
- `frame:copy-to` — Copy frames between canvases (`--frame`, `--range`)
- `frame:label` — Set or clear label on a frame (`--label`, `--clear`)
- `frame:labels` — List all labeled frames in a canvas

#### Type Changes
- `FrameInfo` gains optional `label?: string` field (backward compatible)

#### Test Coverage
- Unit tests: tween-engine (14), animation-engine-v2 (11)
- Integration tests: animation-v2 (11)
- Total: 36 new tests

**Total: 7 new commands, 1 new engine, 36 new tests**

## [0.14.0] - 2026-03-21

### Added — Milestone 14: Layer System v2

#### Blend Mode Expansion (8 new, 14 total)
- `color-dodge` — Brightens destination (division-like curve)
- `color-burn` — Darkens destination (inversion curve)
- `hard-light` — Overlay with layer roles reversed
- `soft-light` — Subtle overlay variant
- `difference` — Absolute difference between channels
- `exclusion` — Lower contrast difference
- `addition` — Clamped arithmetic addition (light effects)
- `subtract` — Clamped arithmetic subtraction

#### Layer Groups
- `layer:create-group` — Create layer folder with optional `--parent` for nesting
- `layer:move-to-group` — Move layer into a group (or back to root)
- `layer:ungroup` — Dissolve group, move children to parent
- `layer:list-tree` — Display layer hierarchy as tree
- `flattenLayerTree` — Recursive group compositing in layer-engine

#### Clipping Masks
- `layer:clip` — Enable/disable clipping mask (`--no-clip` to disable)
- `applyClippingMask` — Clips layer to non-transparent pixels of previous layer
- Clipping applied during layer compositing in `flattenLayers`

#### Modified Commands
- `layer:blend` — Now supports all 14 blend modes
- `layer:add` — New flags: `--parent` (group ID), `--clipping`

#### Type Changes (backward compatible)
- `BlendMode` type expanded with 8 new values
- `LayerInfo` gains optional fields: `parentId`, `isGroup`, `clipping` (defaults preserve backward compat)

#### Test Coverage
- Unit tests: layer-engine-advanced (19 tests — blend modes, groups, clipping)
- Integration tests: layer-v2 (13 tests — commands, hierarchy, blend modes)
- Total: 32 new tests, 0 breaking changes

**Total: 5 new commands, 2 modified commands, 8 new blend modes, 32 new tests**

## [0.13.0] - 2026-03-21

### Added — Milestone 13: Interoperability

#### New I/O Modules
- `palette-codec.ts` — GPL, JASC-PAL, HEX palette format parsers/serializers + auto-detection
- `ase-decoder.ts` — Aseprite .ase/.aseprite binary decoder (layers, frames, cels, palette, tags)
- `svg-encoder.ts` — SVG export with pixel-as-rect rendering, grid overlay, background

#### New Core Engine
- `nineslice-engine.ts` — 9-slice decomposition with `computeNineSliceRegions`, `sliceNine`

#### Palette Commands (2 new)
- `palette:export` — Export palette to GPL, JASC-PAL, or HEX format
- `palette:import` — Import palette from GPL, JASC-PAL, or HEX file (auto-detect, `--merge`)

#### Import Commands (2 new)
- `import:ase` — Import Aseprite file with layers, frames, tags, palette (`--flatten`, `--import-palette`)
- `import:palette-image` — Import unique colors from PNG image as palette

#### Export Commands (4 new)
- `export:svg` — Export canvas as SVG (each pixel as rect, `--scale`, `--grid`, `--background`)
- `export:9slice` — Export UI sprite as 9 PNG regions + JSON metadata (`--top/bottom/left/right`)
- `export:palette-image` — Export palette as PNG swatch image (`--columns`, `--cell-size`)
- `export:css` — Export pixel art as CSS box-shadow art (`--scale`, `--selector`)

#### ASE Decoder Features
- Supports RGBA (32-bit), Grayscale (16-bit), and Indexed (8-bit) color depths
- Handles raw, compressed (zlib), and linked cels
- Imports layers with visibility, opacity, and blend mode mapping
- Imports animation tags with direction (forward/reverse/pingpong)
- Palette import with optional color names

#### Test Coverage
- Unit tests: palette-codec (19), svg-encoder (7), nineslice-engine (9)
- Integration tests: interop (17)
- Total: 49 new tests, 0 breaking changes, 0 new dependencies

**Total: 8 new commands, 4 new I/O/engine modules, 49 new tests**

## [0.12.0] - 2026-03-21

### Added — Milestone 12: Advanced Drawing Primitives

#### New Utility Module
- `point-parser.ts` — `parsePoint`, `parsePoints`, `parseRect` for CLI coordinate parsing

#### Core Engine Enhancements (9 new functions, 2 modified)
- `drawStamp(buffer, x, y, color, size, shape)` — circle/square brush stamp
- `drawThickLine(buffer, x1, y1, x2, y2, color, thickness)` — Bresenham + stamp
- `drawThickRect(buffer, x, y, w, h, color, fill, thickness)` — thick outline via thick lines
- `drawPolyline(buffer, points, color, thickness)` — connected line segments
- `drawPolygon(buffer, points, color, fill, thickness)` — scan-line fill + closed outline
- `drawBezierQuadratic(buffer, start, control, end, color, thickness, segments)` — quadratic curve
- `drawBezierCubic(buffer, start, cp1, cp2, end, color, thickness, segments)` — cubic curve
- `drawRadialGradient(buffer, cx, cy, radius, colorStart, colorEnd, region)` — radial gradient
- `drawPatternFill(buffer, pattern, region, offsetX, offsetY)` — tiled pattern fill
- Modified `drawCircle` — optional `thickness` parameter for thick outlines (annular ring)
- Modified `drawEllipse` — optional `thickness` parameter for thick outlines

#### New Draw Commands (6)
- `draw:polygon` — Draw closed polygon with `--points`, `--fill`, `--thickness`
- `draw:polyline` — Draw open polyline with `--points`, `--thickness`
- `draw:bezier` — Draw bezier curve (quadratic with `--cp1`, cubic with `--cp1 --cp2`)
- `draw:radial-gradient` — Draw radial gradient with `--cx`, `--cy`, `--radius`, `--from`, `--to`
- `draw:pattern-fill` — Fill region with repeating pattern (`--pattern` or `--pattern-layer`)
- `draw:stamp` — Stamp brush shape (`--shape circle|square`, `--size`)

#### Modified Commands (4)
- `draw:line` — Added `--thickness` flag (default 1, backward compatible)
- `draw:rect` — Added `--thickness` flag for outline mode
- `draw:circle` — Added `--thickness` flag for outline mode
- `draw:ellipse` — Added `--thickness` flag for outline mode

#### Test Coverage
- Unit tests: point-parser (8), drawing-engine-advanced (51)
- Integration tests: draw-advanced (14)
- Total: 65 new tests, 0 breaking changes

**Total: 6 new commands, 4 modified commands, 9 new core functions, 65 new tests**

## [0.11.0] - 2026-03-21

### Added — Milestone 11: Selection & Clipboard

#### New Types
- `SelectionMask`, `SelectionShape`, `SelectionInfo`, `ClipboardData` in `src/types/selection.ts`

#### Core Engine (1 new)
- `selection-engine.ts` — `createRectSelection`, `createEllipseSelection`, `createColorSelection`, `createAllSelection`, `invertSelection`, `mergeSelections`, `getSelectionBounds`, `getSelectionPixelCount`, `clearSelection`, `extractSelection`, `pasteBuffer`, `moveSelection`, `selectionToPixelBuffer`, `pixelBufferToSelection`

#### I/O Enhancements
- Selection persistence: `readSelection`, `writeSelection`, `deleteSelection` — masks stored as grayscale PNGs in `selections/` directory
- Clipboard persistence: `readClipboard`, `writeClipboard`, `clearClipboard` — JSON metadata + PNG content in `clipboard/` directory

#### Select Commands (11 new)
- `select:rect` — Create rectangular selection (`--add` for union)
- `select:ellipse` — Create elliptical selection (`--add` for union)
- `select:color` — Select by color match / magic wand (`--tolerance`, `--contiguous`)
- `select:all` — Select entire canvas
- `select:none` — Clear active selection (deselect)
- `select:invert` — Invert current selection
- `select:info` — Display selection info (bounds, pixel count, percentage)
- `select:cut` — Cut selected pixels to clipboard
- `select:copy` — Copy selected pixels to clipboard
- `select:paste` — Paste clipboard onto canvas (`--x`, `--y`, `--in-place`)
- `select:move` — Move selected pixels by offset (`--dx`, `--dy`)

#### Test Coverage
- Unit tests: selection-engine (37 tests)
- I/O tests: selection-io (8 tests)
- Integration tests: selection-commands (20 tests)
- Total: 65 new tests

**Total: 11 new commands, 14 core functions, 65 new tests**

## [0.10.0] - 2026-03-19

### Added — Milestone 10: Recipe Automation, Frame Sequence Export, GIF Import & Onion Skin

#### Recipe System
- `RecipeStep`, `RecipeData` types in `src/types/recipe.ts`
- `recipe-engine.ts` — `validateRecipe`, `resolveRecipeVariables`, `buildCommandArgs`
- Recipe I/O in project-io: `readRecipeJSON`, `writeRecipeJSON`, `deleteRecipeFile`
- `recipes: string[]` added to `ProjectData`

#### Recipe Commands (5 new)
- `recipe:create` — Create recipe from scratch or from JSON file
- `recipe:list` — List all recipes in project
- `recipe:info` — Show recipe details (steps, variables)
- `recipe:delete` — Delete a recipe
- `recipe:run` — Execute recipe steps as CLI commands (supports --var, --dry-run, --stop-on-error)

#### Export Commands (1 new)
- `export:sequence` — Export frames as numbered PNG sequence (--prefix, --padding, --scale, --tag)

#### Import Commands (1 new)
- `import:gif` — Import animated GIF as new canvas with frame timing (omggif decoder)

#### Animation Commands (1 new)
- `animation:onion-skin` — Generate onion skin overlay (before/after frames, tint colors, opacity)

#### Core Engine Enhancements
- `compositeOnionSkin()` in animation-engine — composites before/after frames with decreasing opacity and optional tint
- `decodeGif()` in gif-decoder — GIF frame extraction with disposal method handling

#### Bug Fixes
- Fixed 3 E2E test timeouts by adding explicit 30000ms timeout to long-running pipeline tests

#### Dependencies
- Added `omggif` ^1.0.10 for GIF decoding

**Total: 8 new commands, 6 core functions, ~47 new tests**

## [0.9.0] - 2026-03-19

### Added — Milestone 9: Color Effects, Gradient, Outline, Dithering & Layer Operations

#### Core Engine Enhancements
- `rgbToHsl` / `hslToRgb` private helpers in transform-engine
- `invertColors(buffer)` — invert RGB channels preserving alpha
- `desaturate(buffer, amount)` — luminance-weighted desaturation (0-100%)
- `hueShift(buffer, degrees)` — HSL hue rotation (-360..360°)
- `posterize(buffer, levels)` — reduce color levels (2-256)
- `bayerMatrix(size)` private helper — recursive Bayer threshold matrix generation
- `ditherBuffer(buffer, palette, method, matrixSize)` — ordered (Bayer) and Floyd-Steinberg error-diffusion dithering
- `drawGradient(buffer, x1, y1, x2, y2, colorStart, colorEnd, region?)` — linear gradient with optional region constraint
- `generateOutline(buffer, color, thickness, includeCorners)` — auto-outline around non-transparent content

#### New Commands (9)
- `layer:invert` — invert layer colors
- `layer:desaturate` — desaturate layer by percentage
- `layer:hue-shift` — shift layer hue by degrees
- `layer:posterize` — reduce layer color levels
- `layer:dither` — apply dithering using a palette (ordered/floyd-steinberg)
- `layer:merge-visible` — merge all visible layers into one (with --keep option)
- `draw:gradient` — draw linear gradient on a layer frame
- `draw:outline` — generate outline around non-transparent content
- `export:layers` — export each layer as separate PNG (with --flatten, --scale, --prefix)

#### Test Coverage
- Unit tests: transform-engine-color (16), transform-engine-dither (6), drawing-engine-gradient (6), drawing-engine-outline (6)
- Integration tests: color-adjust-extended (8), draw-commands (12), layer-operations (8)
- Total: ~48 new tests

## [0.8.0] - 2026-03-19

### Added — Milestone 8: Blend Modes, Templates, Spritesheet Import & Utilities

#### Core Engine Enhancements
- `BlendMode` expanded: normal, multiply, screen, overlay, darken, lighten
- `blendChannel()` in layer-engine — per-channel blend mode dispatch
- `flattenLayers` and `mergeLayerBuffers` now apply blend modes during compositing
- `decomposeSpritesheet()` in spritesheet-engine — inverse of composeSpritesheet
- `template-engine.ts` — `createTemplateFromCanvas`, `applyTemplate`
- Template I/O in project-io: `readTemplateJSON`, `writeTemplateJSON`, `deleteTemplateFile`

#### New Types
- `TemplateData`, `TemplateLayerDef` in `src/types/template.ts`

#### Blend & Layer Commands (1 new)
- `layer:blend` — Set blend mode (normal, multiply, screen, overlay, darken, lighten)

#### Template Commands (5 new)
- `template:create` — Create template from canvas or from scratch
- `template:list` — List all templates in project
- `template:info` — Show template details (layers, dimensions, palette)
- `template:apply` — Create new canvas from template with optional size override
- `template:delete` — Delete a template

#### Import Commands (1 new)
- `import:spritesheet` — Import spritesheet PNG as canvas with multiple frames

#### Canvas Commands (1 new)
- `canvas:extract` — Extract region from canvas as new canvas

#### Export Commands (1 new)
- `export:batch` — Batch export multiple canvases to PNG

#### Utility Commands (3 new)
- `project:description` — View or set project description
- `palette:constraints` — View or update palette constraints (maxColors, locked, allowAlpha)
- `tileset:tile-props` — View or edit tile properties (string, number, boolean types)

**Total: 13 new commands, 8 core functions, ~55 new tests**

## [0.7.0] - 2026-03-19

### Added — Milestone 7: Transformations, Validation & Project Utilities

#### Core Engines (2 new)
- `transform-engine` — flipBufferH/V, rotateBuffer90, scaleBufferNearest, adjustBrightness, adjustContrast
- `validation-engine` — validateSizeRules (exact, min, max, multiple-of with pattern matching)

#### Canvas Transformation Commands (3 new)
- `canvas:flip` — Flip canvas horizontally or vertically (supports --layer, --frame targeting)
- `canvas:rotate` — Rotate canvas by 90°, 180°, or 270° (auto-swaps dimensions for 90/270)
- `canvas:scale` — Scale canvas via --factor or --width/--height (nearest-neighbor interpolation)

#### Layer Transformation Commands (2 new)
- `layer:flip` — Flip a single layer horizontally or vertically
- `layer:rotate` — Rotate a single layer by 90°, 180°, or 270° (square canvas only for 90/270)

#### Color Adjustment Commands (2 new)
- `layer:brightness` — Adjust layer brightness (-255 to +255)
- `layer:contrast` — Adjust layer contrast (-100 to +100)

#### Validation & Utility Commands (4 new)
- `validate:size` — Validate canvas sizes against project size rules
- `project:tags` — View/add/remove project tags (key:value pairs)
- `canvas:stats` — Analyze pixel/color distribution (opaque/transparent counts, color histogram, content bounds)
- `tileset:delete-tilemap` — Delete a tilemap from a tileset

**Total: 13 new commands, 7 core functions, ~50 new tests**

## [0.6.0] - 2026-03-19

### Added — Milestone 6: Project Configuration, Advanced Palette & Canvas Utilities

#### Project Configuration Commands (2 new)
- `project:settings` — View/update project settings (defaultTileSize, defaultPalette, pixelPerfect)
- `project:validation` — View/update validation settings (paletteEnforcement, sizeRules CRUD)

#### Advanced Palette Commands (3 new)
- `palette:sort` — Sort palette colors by hue, luminance, saturation, index, or name
- `palette:ramp` — Create/delete palette ramps (generate interpolated colors or use existing indices)
- `palette:extract` — Extract unique colors from canvas into new/existing palette

#### Canvas Utilities (3 new)
- `canvas:rename` — Rename a canvas (updates directory and project manifest)
- `canvas:clone` — Clone a canvas with all layers and frames
- `canvas:crop` — Crop canvas to content bounds with optional padding

#### Drawing Commands (1 new)
- `draw:sample` — Sample pixel color from canvas (supports --flatten, palette match)

#### Export Commands (2 new)
- `export:profile` — CRUD for export profiles (png, gif, apng, spritesheet targets)
- `export:run` — Execute export profile on canvas (supports all target formats)

#### Core Engine Enhancements
- `palette-engine.ts` — `sortPaletteColors`, `generateRamp`, `samplePixelColor`, `extractUniqueColors`
- `drawing-engine.ts` — `computeContentBounds`, `extractRegion`
- `project-io.ts` — `renameCanvasDirectory`, `copyCanvasDirectory`
- `SizeRule.type` field added to project types (exact, multiple-of, max, min)

## [0.5.0] - 2026-03-19

### Added — Milestone 5: Layer Management, Drawing Primitives & Canvas/Palette Operations

#### Layer Management Commands (5 new)
- `layer:edit` — Edit layer properties (name, opacity, visible, locked)
- `layer:reorder` — Reorder a layer within a canvas
- `layer:remove` — Remove a layer with PNG cleanup (--force for last layer)
- `layer:duplicate` — Duplicate a layer with all frame data
- `layer:merge` — Merge two layers (top into bottom) with alpha compositing

#### Drawing Primitives (2 new)
- `draw:circle` — Midpoint circle algorithm with fill support
- `draw:ellipse` — Midpoint ellipse algorithm with fill support

#### Canvas Operations (3 new)
- `canvas:list` — List all canvases with dimensions, layer/frame counts
- `canvas:delete` — Delete canvas with directory cleanup (requires --force)
- `canvas:resize` — Resize canvas (crop/extend) with 9-point anchor system

#### Palette Operations (2 new)
- `palette:info` — Show palette details (colors, constraints, ramps)
- `palette:edit` — Add/remove colors, rename, set groups, update description

#### Core Engine
- `drawCircle` / `drawEllipse` in drawing-engine.ts
- `mergeLayerBuffers` / `resizeBuffer` / `Anchor` type in layer-engine.ts
- `deleteLayerDirectory` / `deleteCanvasDirectory` in project-io.ts

#### Testing
- ~40 new tests: unit tests for shapes/merge/resize + integration tests for all 12 commands
- All commands support `--output json` for automation

## [0.4.0] - 2026-03-19

### Added — Milestone 4: Animation Tag Management

#### Tag CRUD Commands (4 new)
- `animation:create-tag` — Create animation tag with name, from, to, direction, repeat
- `animation:list-tags` — List all animation tags in a canvas
- `animation:edit-tag` — Partial update of tag properties (name, range, direction, repeat)
- `animation:remove-tag` — Remove tag without affecting frames

#### Bug Fix
- `frame:add` now adjusts animation tag boundaries when frames are inserted within or before a tag range

#### Testing
- 19 new tests: tag CRUD operations, JSON output validation, tag expansion on frame:add
- E2E pipeline test for full animation tag workflow

## [0.3.0] - 2026-03-19

### Added — Milestone 3: Tileset System

#### Types & Core Engine
- `TilesetData`, `TileInfo`, `TilemapData`, `TilemapCell` types in `src/types/tileset.ts`
- `tileset-engine.ts` — Pure functions: `hashTileBuffer`, `sliceTiles`, `deduplicateTiles`, `buildTilemapFromIndexMap`, `composeTilesetImage`, `renderTilemap`, `generateTiledMetadata`
- Tileset I/O functions in `project-io.ts`: `readTilesetJSON`, `writeTilesetJSON`, `getTilePath`, `readTileImage`, `writeTileImage`, `ensureTilesetStructure`

#### Tileset Commands (10 new)
- `tileset:create` — Create tileset from canvas or PNG file with automatic deduplication
- `tileset:info` — Show tileset information (tile count, size, tilemaps, source)
- `tileset:list` — List all tilesets in the project
- `tileset:add-tile` — Add individual tile from PNG file
- `tileset:remove-tile` — Remove tile with tilemap index updates
- `tileset:create-tilemap` — Create empty tilemap with optional fill
- `tileset:set-cell` — Set tilemap cell with flip support
- `tileset:render-tilemap` — Render tilemap to PNG with optional scaling
- `tileset:export` — Export tileset as spritesheet + metadata (generic or Tiled TSJ)
- `tileset:export-tilemap` — Export tilemap as CSV, Tiled TMJ, or generic JSON

#### Testing
- 44 new tests across 4 test files (core engine, management, tilemap ops, export)
- Full E2E pipeline test: create → tilemap → set cells → render → export
- All commands support `--output json` for automation

## [0.2.0] - 2026-03-19

### Added — Milestone 2: Animation & Spritesheet

#### Frame Management
- `frame:remove` — Remove frames by index or range, with PNG cleanup and reindexing
- `frame:duplicate` — Duplicate frames with pixel data copying
- `frame:reorder` — Move frames between positions with automatic reindexing

#### Animation Engine
- `animation:set-timing` — Set frame duration (ms) or FPS, targeting single frame, range, or tag
- `animation:export` — Export animation as GIF, APNG, spritesheet, or individual frames
- `animation:preview` — Quick preview generation with FPS override support

#### Export Formats
- `export:gif` — Direct GIF89a export with transparency and per-frame timing
- `export:apng` — Direct APNG export preserving full RGBA

#### Core Engines
- Animation engine: frame sequence resolution (forward/reverse/pingpong), repeat, FPS override
- Frame renderer: centralized multi-layer flatten + scale for all export paths
- Spritesheet engine: extracted layout logic (horizontal/vertical/grid) with metadata generation
- GIF encoder (gifenc): palette quantization, transparency mapping, ms→centisecond timing
- APNG encoder (upng-js): lossless RGBA encoding with per-frame delays

#### Infrastructure
- Refactored `export:spritesheet` to use shared spritesheet-engine
- Added `reindexFrames` two-pass rename to prevent collisions
- 115 tests with 92%+ coverage on core engines

## [0.1.0] - 2026-03-19

### Added — Milestone 1: Walking Skeleton

#### Project Management
- `project:init` — Create .pxc project directory structure
- `project:info` — Display project summary (name, canvas/palette/tileset counts)

#### Canvas & Layer
- `canvas:create` — Create canvas with dimensions, optional palette and background color
- `canvas:info` — Display canvas details (size, layers, frames, animation tags)
- `layer:add` — Add layers with type and opacity settings
- `layer:list` — List all layers in a canvas

#### Drawing Primitives
- `draw:pixel` — Set individual pixels by coordinates and color
- `draw:line` — Bresenham line drawing algorithm
- `draw:rect` — Rectangle drawing (filled or outlined)
- `draw:fill` — Flood fill (contiguous and non-contiguous modes)
- `draw:replace-color` — Replace all instances of a color with another

#### Palette System
- `palette:create` — Create palette from comma-separated hex color list
- `palette:list` — List all palettes in project

#### Animation
- `frame:add` — Add frames with optional copy-from support
- `frame:list` — List all frames with timing info

#### Export Pipeline
- `export:png` — Export single frame as PNG (flattened or single layer, with scaling)
- `export:spritesheet` — Export all frames as spritesheet (horizontal/vertical/grid layouts) with JSON metadata

#### Import
- `import:png` — Import PNG file as new canvas

#### Validation
- `validate:palette` — Check all pixels in canvas against palette, report violations

#### Infrastructure
- .pxc directory-based project format (git-friendly, JSON + PNG)
- `--output json` flag on all commands for machine-readable output
- Layer compositing engine with alpha blending
- 63 tests with 84%+ coverage on core engines
