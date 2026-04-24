# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added — Second asset pipeline slice: `tileset`

- **Core types** — `AssetSpec` is now a `z.discriminatedUnion('type', [...])` over `CharacterSpritesheetAssetSpec` and the new `TilesetAssetSpec`. The tileset variant carries `tileSize`, optional per-tile metadata (`tiles[].index`, `label`, `properties`), a smaller `TilesetAssetExportConfig` (`engine: godot|generic`, `scale`, `columns`, `spacing`), and `TilesetAssetConstraints` (`maxColors`, `tileSizeMultipleOf`, `requireAllTilesUnique`). Existing character-spritesheet specs on disk keep parsing unchanged.
- **Core engine** — new `packages/core/src/core/asset-tileset-engine.ts` with `validateTilesetAssetSpec`, `buildTilesetAsset`, `scaffoldTilesetAssetSpec`. Validation covers canvas existence + divisibility by tile size, `tileSizeMultipleOf`, `maxColors` (pixel histogram of the flattened canvas), `requireAllTilesUnique` (via `deduplicateTiles`), and out-of-range tile-metadata indices. Build slices the canvas through the existing `tileset-engine`, composes an atlas PNG, and emits a Godot 4 `TileSet` `.tres` (spec-driven: `[gd_resource format=3]` with a `TileSetAtlasSource` sub-resource and explicit `col:row/0 = 0` cell declarations) or a `{name}.tileset.json` manifest for the generic engine. The spec is re-embedded in the output for reproducibility.
- **Core dispatch** — `validateAssetSpec` / `buildAsset` in `asset-engine.ts` now dispatch by `spec.type` to the character or tileset implementation. Character-specific functions were tightened to accept `CharacterSpritesheetAssetSpec` rather than the union; the exported `validateCharacterSpritesheetAssetSpec` / `buildCharacterSpritesheetAsset` remain available for direct use.
- **CLI** — `pxc asset:init` gains `--type character-spritesheet|tileset` (default keeps the existing slice) and a `--tile-size WxH` flag required when `--type=tileset`. `asset:list` now branches display between tileset (`tile=WxH`) and character (`frame=WxH`, animation list). `asset:validate` and `asset:build` need no changes — they already dispatch through the core entry points. Total CLI commands still 246 (this extends existing commands rather than adding new ones).
- **Tests** — new core suite `packages/core/test/core/asset-tileset-engine.test.ts` (17 tests: schema parsing, validation paths, build output shape for both engines, dispatch entry points, scaffold). New E2E suite `packages/cli/test/e2e/asset-tileset-pipeline.test.ts` drives `asset:init --type tileset → asset:validate → asset:build` end-to-end and asserts the resulting Godot `.tres` structure. Existing 65 character asset-engine tests still green.
- **Showcase** — new `showcase/asset-tileset-demo/pipeline.sh` that paints four 16x16 quadrants on a 32x32 canvas, runs `asset:init --type tileset --tile-size 16x16 --engine godot`, validates, and builds into `exports/terrain_tiles/` (atlas PNG + Godot 4 TileSet `.tres`).

### Added — Asset pipeline slice `character-spritesheet` closed

- **CLI** — new `pxc asset:list` command. Lists every spec under `.pxc/assets/`, surfacing `type`, `canvas`, `frameSize`, animation count, export engine/scale, and `maxColors`. Supports `--output json` and `--details` (expands animation names). Malformed specs are reported inline as `INVALID` without aborting the listing. Total CLI commands: 245 → 246.
- **CLI** — `pxc asset:build` gains `--watch` + `--debounce` flags. Watch mode runs an initial in-process build, then watches the spec file and the source canvas directory (recursive) and rebuilds on change with a debounced trigger. Errors in watch mode log but keep the watcher alive. Graceful `SIGINT` / `SIGTERM` shutdown with a `Watch stopped (N rebuilds)` summary.
- **Core** — `validateAssetSpec()` `maxColors` error message now includes an actionable hint pointing at `pxc palette:generate --canvas <name> --name <palette> --max-colors <N>` (or raising the constraint), in addition to the existing count-excess report.
- **Tests** — 9 new E2E tests in `packages/cli/test/e2e/` covering `asset:list`, `maxColors` enforcement (build + validate consistency), and the `asset:build --watch` happy path. Suite total: 1731 → 1778 green.
- **Showcase** — new `showcase/asset-pipeline-demo/pipeline.sh` exercising `asset:init → asset:list → asset:validate → asset:build` end-to-end.

### Added — Validation GUI ("Review" mode) + end-of-task automation

- **Core** — new `ValidationFlag` / `ValidationReport` types in `packages/core/src/types/validation.ts`. CRUD functions (`addFlag`, `resolveFlag`, `removeFlag`, `listFlags`) added to `validation-engine.ts` as pure immutable operations. On-disk store at `canvases/{name}/.validation/flags.json` via `readValidationFlags` / `writeValidationFlags` in `project-io.ts`.
- **CLI** — new `validation` topic with 5 commands: `pxc validation:flag`, `pxc validation:list`, `pxc validation:resolve`, `pxc validation:remove`, `pxc validation:report`. All inherit `BaseCommand` and support `--output json`.
- **Studio API** — new `validation` route module (`GET|POST /api/validation`, `PATCH /api/validation/:canvas/:id/resolve`, `DELETE /api/validation/:canvas/:id`, `GET /api/validation/report`, `POST /api/validation/:canvas/init`).
- **Studio WS** — `ProjectWatcher` now emits a dedicated `validation:updated` event when `canvases/{name}/.validation/flags.json` changes, distinct from `canvas:updated`.
- **Studio SPA** — new **Review** tab alongside the Editor: read-only preview with click-drag region selection, side panel to create/resolve/remove flags, "Run auto-validate" button that renders the consolidated report. Uses new `useValidation` hook + `ReviewView` / `ValidationPanel` components.
- **Devkit** — new `/pxdk:close-task` skill (`pixelcreator-devkit/skills/close-task/SKILL.md`, v0.2.0) that runs verify → refreshes codemaps/docs → prunes the closed ROADMAP step → appends to CHANGELOG `[Unreleased]` → commits with a Conventional Commit message → pushes to `origin main`. Triggered by "cierra la tarea", "finaliza", "ship it", and similar phrasing.
- **Devkit hooks** — new `Stop` hook `stop-push-reminder.sh` that flags when local `main` is ahead of `origin/main` so work does not sit unpushed.
- **Docs** — new `ARCHITECTURE.md` at the repo root as a monorepo entry point; new `docs/validation-gui.md` explaining the Review loop and its CLI equivalents.

### Changed

- `README.md` version badge now reflects `v2.0.0-beta.13`.
- `CLAUDE.md` — Claude Code workflow section updated to mention `/pxdk:close-task` and the Review tab; devkit version bumped to `0.2.0`.
- `pixelcreator-devkit/.claude-plugin/plugin.json` bumped to `0.2.0`; `pixelcreator-devkit/CHANGELOG.md` updated.

## [2.0.0-beta.13] - 2026-04-20

### Fixed — TypeScript build errors

- `packages/cli/src/commands/dataset/list.ts` — removed incorrect `Record<string, unknown>` type annotation on `filter` predicate (filter now infers `FeedbackEntry` from `entries`).
- `packages/cli/src/commands/generate/terrain.ts` — cast `mapOptions` via `unknown` to `NoiseToPixelOptions` (direct `as` rejected by TS 5.9).
- `packages/cli/src/commands/generate/noise.ts` — same `as unknown as NoiseToPixelOptions` cast applied to all `mapping` usages.
- `packages/cli/vitest.config.ts` — bumped `hookTimeout` to 30_000ms to accommodate e2e tests whose `beforeEach` spawns ~10 CLI subprocesses on Windows.

### Improved — Studio Panel Styling & ToolBar Polish

**BrushPanel CSS (new)**
- 2-column grid layout for brush preset buttons with active/hover states
- Aligned slider rows: fixed-width label (48px) + flex range + monospace value (32px)
- Pixel Perfect checkbox with proper flex layout
- Removed duplicate "Brushes" header (CollapsiblePanel already provides it)

**SymmetryPanel CSS (new)**
- Segmented button group: 5 equal-width mode buttons with SVG icons + compact labels
- Active mode highlighted with accent-subtle background + accent border
- Axis X/Y number inputs with proper label alignment
- Radial segments select with consistent layout
- Removed duplicate "Symmetry" header

**EffectsPanel CSS (new)**
- Styled effect items with checkbox toggle, clickable name, and delete button
- "+Add" select aligned to the right, duplicate "Effects (N)" text removed
- Danger color on delete hover

**ToolBar enhancements**
- Symmetry button now shows SVG icon (SymmetryOff/H/V/Both/Radial) instead of plain "Sym: Off" text
- Brush info shows shape icon + name + size instead of plain "Brush: Pixel (1px)" text
- Added `.toolbar__info` and `.toolbar__btn--symmetry` CSS classes

**TransformPanel cleanup**
- Removed duplicate "Transform" header and its CSS rule

**Palette Panel FG/BG polish**
- Active color area now has card-style background with border-radius
- Swap button restyled as circular icon button

---

### Added — Professional Studio UI Redesign

**Design System Foundation**
- CSS design tokens: spacing scale (4–32px), radius scale, typography tokens, animation timing variables
- Google Fonts integration: Inter (UI) + JetBrains Mono (code/values) with `font-display: swap`
- Expanded theme system: 13 → 22 CSS variables per theme (added `bg-input`, `bg-elevated`, `accent-hover`, `accent-subtle`, 3 shadow levels, `focus-ring`)
- Accent color changed from green (#6ebe3a) to professional blue (#4fc3f7) across all themes

**Custom Form Controls (CSS-only)**
- Custom range sliders: circular thumb with accent color, hover scale effect, focus ring
- Custom checkboxes: styled with CSS checkmark, checked animation, hover/focus states
- Custom select dropdowns: SVG chevron arrow, hover/focus states
- Custom text/number inputs: focus border animation with accent color
- Unified `.btn` class with `--primary`, `--ghost`, `--danger`, `--icon` variants

**SVG Icon System (30+ icons)**
- New `Icons.tsx` component with 30+ inline SVG icons (stroke-based, `currentColor` for theme-awareness)
- 12 tool icons: Pencil, Line, Rect, Circle, Fill, Eraser, Marquee, Wand, Move, Polygon, Gradient, Bezier
- 18+ action icons: Undo, Redo, Export, Import, Plus, Settings, Eye/EyeOff, Lock/Unlock, Copy, Trash, Play/Pause/Stop/Step, ChevronDown/Right, Close, Check, Cross, Info, Warning, Loop, Dataset
- 5 symmetry mode icons, 4 brush shape icons
- Replaced all Unicode characters and HTML entities across 8 components

**Collapsible Sidebar Panels**
- New `CollapsiblePanel.tsx` wrapper component with animated chevron, `max-height` CSS transitions
- Panel open/closed state persisted in localStorage
- Less-used panels (Accessibility, Procedural, Game Export, Reference) collapsed by default
- Scrollable panel container with custom thin scrollbar (webkit + Firefox)

**Layout & Structure Improvements**
- TopBar: buttons grouped logically with vertical dividers (undo/redo | actions | info)
- ToolBar: tools grouped by category — Drawing (6) | Selection (3) | Shape (3) with separators
- Sidebar: improved header with inline add button, border-left accent on active canvas
- Sidebar width increased from 220px to 240px

**Visual Polish & Micro-interactions**
- Toolbar buttons: hover lift (`translateY(-1px)`), active inset shadow, focus-visible ring
- Sidebar items: hover indent effect, active state with `accent-subtle` background + left border
- Layer rows: active state with accent-subtle background + 3px left border accent
- Frame thumbnails: hover lift + shadow, active glow ring
- Dialog modals: entrance animation (scale + translateY + opacity fade)
- Toast notifications: slide-in animation from top, color-coded left border by type
- Canvas area: subtle inner shadow for depth
- StatusBar: top shadow for elevation
- Global `focus-visible` ring on all interactive elements

**Component count: 41 → 43** (added `Icons.tsx`, `CollapsiblePanel.tsx`)

---

## [2.0.0-beta.12] - 2026-03-28

### Added — Project Professionalization & Infrastructure

**Core Engines (6 new — 25 total)**
- `brush-engine.ts` — brush masks, symmetry calculation, stroke interpolation, pixel-perfect filtering
- `effects-engine.ts` — non-destructive layer effects: drop shadow, outer glow, outline, color overlay, box blur
- `guide-engine.ts` — guide lines CRUD, snap-to-guide calculation, validation
- `accessibility-engine.ts` — CVD simulation (protanopia, deuteranopia, tritanopia, achromatopsia), WCAG contrast
- `procedural-engine.ts` — Simplex noise 2D, fBm, turbulence, checkerboard, stripes, grid-dots, brick patterns
- `gamedev-engine.ts` — Godot .tres/.tscn, Unity sprite JSON, generic metadata export

**Type Definitions (5 new)**
- `brush.ts`, `guide.ts`, `accessibility.ts`, `procedural.ts`, `gamedev.ts`

**CLI Commands (50+ new across 10 topics)**
- brush (6), effect (10), guide (6), generate (8), gamedev (8)
- canvas symmetry/CVD (3), draw symmetric/stroke (5), layer reference (4)
- palette accessibility/contrast (2), project preferences (2), validate/export accessibility

**Studio Routes (6 new — 22 total)**
- brush, guide, effect, accessibility, generate, gamedev

**Studio UI (13 new components)**
- BrushPanel, SymmetryPanel, EffectsPanel, EffectEditor, AccessibilityPanel
- GamedevExportPanel, ProceduralPanel, ReferencePanel, Minimap
- CanvasCreateDialog, PreferencesDialog, ProjectInitDialog, ToastContainer

**Infrastructure**
- Docker support: multi-stage Dockerfile, docker-compose.yml, .dockerignore
- Claude Code integration: 11 slash commands + 9 rule files
- Pre-commit hooks: husky + lint-staged (ESLint + Prettier on staged files)
- CI improvements: type-check (tsc --noEmit), coverage threshold (80%), dependabot
- GitHub templates: bug report, feature request, PR template, SECURITY.md
- VSCode workspace: settings, recommended extensions, debug configurations
- CONTRIBUTING.md with development guidelines
- .env.example with environment documentation

### Fixed
- Resolved all 27 lint warnings in CLI package (unused vars, explicit any)
- Fixed TypeScript errors in Studio app.ts (Hono context types)

### Improved
- Core test coverage: 79.83% → 80.87% (frame-renderer 55% → 100%, palette-engine 71% → 98%)
- Total tests: 1318 → 1331 (134 test files, 0 failures)

## [2.0.0-beta.11] - 2026-03-28

### Added — Milestone 23: Live Export Preview + AI Agent Mode

**Core Types**
- New `agent.ts` — `AgentSession`, `AgentOperation`, `OperationFeedback`, `AgentSessionSummary` types for AI-assisted drawing with real-time feedback

**Studio API (15 new endpoints — 98+ total)**
- Export preview: `GET /api/export/preview/{png,gif,apng,spritesheet,svg}/:canvas` — inline Content-Disposition for in-browser preview
- Agent session lifecycle: `POST /api/agent/session/{start,pause,resume,end}`, `GET /api/agent/session`
- Agent operation control: `POST /api/agent/session/{approve,reject,feedback}/:operationId`
- Agent timeline: `GET /api/agent/session/{timeline,pending}`
- Dataset integration: `POST /api/dataset/rate-session` — convert session feedback to dataset entries

**Studio Server**
- Extended `AgentBridge` with full session management: start/pause/resume/end lifecycle, operation queue, approve/reject with Promise-based blocking, feedback attachment
- Middleware interception: draw/transform operations are queued when session is paused, auto-approved when running
- Session summary with approve/reject/auto counts and feedback statistics

**Studio GUI (5 new components)**
- `ExportPreview` — live preview in export dialog with debounced rendering, animated GIF/APNG support, SVG rendering, checkerboard transparency background
- `ExportDialog` — redesigned with side-by-side layout (controls + live preview)
- `AgentModePanel` — full Agent Mode panel: session controls, pending operation card with Approve/Reject buttons, contextual feedback input with tags, session stats
- `AgentTimeline` — chronological timeline of agent operations with status icons, auto-scroll, feedback indicators
- `useAgentSession` hook — React hook with WebSocket subscriptions + polling fallback for real-time session state synchronization

**Studio UX**
- `Ctrl+Shift+A` keyboard shortcut to toggle Agent Mode panel
- Canvas "AGENT MODE" badge overlay with green glow border when session is active
- Export dialog now shows exact output preview before downloading (all 5 formats)
- Agent feedback captured with 6 tags (composition, colors, animation, style, detail, proportions)
- `addSessionFeedback()` in dataset engine converts session approve/reject into ML training data

**Tests (22 new — 1318 total)**
- 7 export preview route tests (all formats + error handling)
- 15 agent session tests (lifecycle, approve/reject, feedback, operation registration)

## [2.0.0-beta.10] - 2026-03-22

### Added — Milestone 22: Game Engine Export (Godot & Unity)

**Core Engine**
- New `gamedev-engine.ts` — Godot .tres (SpriteFrames, TileSet), .tscn scene, Unity sprite JSON, generic metadata
- Frame metadata extraction, animation export, spritesheet generation
- `exportToGameEngine` one-call full export + `writeExportFiles`

**CLI (8 new — 231 total across 23 topics)**
- New `gamedev` topic: export-godot, export-unity, export-generic, godot-spriteframes, godot-tileset, unity-spritesheet, info, preview

**Studio (3 endpoints + GamedevExportPanel GUI)**

**Tests (13 new — 1296 total)**

## [2.0.0-beta.9] - 2026-03-22

### Added — Milestone 21: Procedural Generation Engine

**Core Engine**
- New `procedural-engine.ts` — Simplex Noise 2D (pure implementation, 0 deps), fBm, Turbulence
- 4 pattern generators: Checkerboard, Stripes (h/v/diagonal), Grid Dots, Brick
- 3 noise-to-pixel mapping modes: Grayscale, Palette (N colors), Threshold (binary)
- `generateNoiseMap` returns raw Float64Array for decoupled mapping
- Seeded PRNG (mulberry32) for deterministic reproducibility

**CLI (8 new — 223 total across 22 topics)**
- New `generate` topic: `generate:noise`, `generate:checkerboard`, `generate:stripes`, `generate:grid-dots`, `generate:brick`, `generate:noise-map`, `generate:terrain`, `generate:preview`
- Terrain presets: island (fBm + radial falloff), cave (turbulence + threshold), clouds (fBm + palette)

**Studio (3 endpoints + ProceduralPanel GUI)**

**Tests (28 new — 1283 total)**

## [2.0.0-beta.8] - 2026-03-22

### Added — Milestone 20: Color Accessibility & Advanced Color Tools

**Core Engine**
- New `accessibility-engine.ts` — CVD simulation (Brettel/Vienot matrices), WCAG contrast, palette accessibility analysis
- 4 simulation types: protanopia, deuteranopia, tritanopia, achromatopsia
- Types: `VisionDeficiency`, `ContrastResult`, `PaletteAccessibilityReport`

**CLI (6 new — 215 total)**
- `draw:contrast-check`, `palette:contrast`, `palette:accessibility`, `canvas:simulate-cvd`, `validate:accessibility`, `export:accessibility-report`

**Studio (3 endpoints + AccessibilityPanel GUI)**

**Tests (48 new — 1255 total)**

## [2.0.0-beta.7] - 2026-03-22

### Added — Milestone 19: Non-Destructive Layer Effects System

**Core Engine**
- New `effects-engine.ts` with 4 non-destructive layer effects computed during compositing
- **Drop Shadow**: offset, color, blur (box blur 2-pass), opacity
- **Outer Glow**: silhouette expansion with distance falloff, color, intensity
- **Outline/Stroke**: edge detection with thickness, position (outside/inside/center)
- **Color Overlay**: tint non-transparent pixels with blend mode support
- Utility functions: `boxBlur`, `expandSilhouette`, `detectEdges`
- Integrated into `flattenLayerTree` pipeline between clipping and compositing
- Effects stored as `effects?: LayerEffect[]` on `LayerInfo` — fully backward compatible
- New types: `EffectType`, `LayerEffect`, `DropShadowParams`, `OuterGlowParams`, `OutlineParams`, `ColorOverlayParams`

**CLI Commands (10 new — 209 total across 21 topics)**
- New `effect` topic: `effect:drop-shadow`, `effect:outer-glow`, `effect:outline`, `effect:color-overlay`
- Management commands: `effect:add`, `effect:remove`, `effect:list`, `effect:toggle`, `effect:edit`, `effect:reorder`

**Studio API (5 new endpoints)**
- `GET /api/canvas/:name/layer/:id/effects` — list effects
- `POST /api/canvas/:name/layer/:id/effect` — add effect
- `PUT /api/canvas/:name/layer/:id/effect/:effectId` — update params
- `DELETE /api/canvas/:name/layer/:id/effect/:effectId` — remove effect
- `PUT /api/canvas/:name/layer/:id/effect/:effectId/toggle` — toggle enabled

**Studio GUI**
- `EffectsPanel` — collapsible panel with add/remove/toggle, expandable effect rows
- `EffectEditor` — type-specific controls: sliders, color pickers, selects for all 4 effect types

**Tests (59 new — 1207 total)**
- 38 core tests: effects-engine (30), effects-integration (8)
- 11 CLI tests: effect-management
- 10 Studio tests: effect routes

## [2.0.0-beta.6] - 2026-03-22

### Added — Milestone 18: Studio Workflow & Guide System

**Core Engine**
- New `guide-engine.ts` with guide CRUD, snap-to-guide calculation, validation
- New `GuideConfig`, `GuideInfo`, `StudioPreferences` types
- Extended `flattenLayers`/`flattenLayerTree` with `includeReference` option — reference layers excluded from exports by default
- Extended `renderFrames` to filter out reference layers
- Added `guides` field to `CanvasData`, `referenceSource` to `LayerInfo`, `preferences` to `ProjectSettings`

**CLI Commands (12 new — 199 total across 20 topics)**
- New `guide` topic: `guide:add`, `guide:remove`, `guide:list`, `guide:clear`, `guide:move`, `guide:snap`
- New `layer` commands: `layer:add-reference`, `layer:toggle-reference`, `layer:fit-reference`, `layer:set-reference-opacity`
- New `project` commands: `project:preferences`, `project:preferences-list`

**Studio API (11 new endpoints)**
- Guide CRUD: `GET/POST /api/canvas/:name/guides`, `PUT/DELETE /api/canvas/:name/guides/:id`, `PUT /api/canvas/:name/guides/config`
- Project workflow: `POST /api/project/init`, `GET/PUT /api/project/preferences`
- Reference layers: `POST /api/canvas/:name/layer/reference`, `PUT /api/canvas/:name/layer/:id/reference`

**Studio GUI (7 new components)**
- `ToastContainer` + `useToast` hook — toast notification system (success/error/info/warning, auto-dismiss)
- `PreferencesDialog` — grid, guides, snap, canvas defaults (Ctrl+, shortcut)
- `ProjectInitDialog` — create projects from GUI
- `CanvasCreateDialog` — create canvases from GUI with name, size, background
- `ReferencePanel` — reference layer opacity, visibility controls
- `Minimap` — canvas overview with viewport navigation
- TopBar and Sidebar enhanced with "New Canvas" and "Preferences" buttons

**Tests (53 new — 1148 total)**
- 25 core tests: guide-engine (18), layer-engine-reference (7)
- 20 CLI tests: guide-management (12), reference-layer (8)
- 10 Studio tests: guide routes (8), project/reference routes (2)

## [2.0.0-beta.5] - 2026-03-22

### Added — Milestone 17: Symmetry Drawing & Custom Brush System

**Core Engine**
- New `brush-engine.ts` with brush mask generation (circle/square/diamond/custom), stroke interpolation, pixel-perfect filtering, symmetry point calculation (horizontal/vertical/both/radial), and symmetric stroke application
- 8 built-in brush presets: Pixel, Round 3, Round 5, Square 2, Square 4, Diamond 3, Dither 2x2, Spray 5
- Extended `drawing-engine.ts` with `drawWithBrush()`, `drawSymmetricPixel()`, `drawSymmetricLine()`
- New `SymmetryConfig` and `BrushPreset` types in `brush.ts`
- Added `symmetry` field to `CanvasData`, `brushPresets` to `ProjectSettings`

**CLI Commands (12 new — 187 total across 19 topics)**
- New `brush` topic: `brush:list`, `brush:create`, `brush:delete`, `brush:show`, `brush:import`, `brush:export`
- New `draw` commands: `draw:stroke`, `draw:symmetric-pixel`, `draw:symmetric-line`, `draw:symmetric-fill`
- New `canvas` commands: `canvas:symmetry`, `canvas:symmetry-guide`

**Studio API (8 new endpoints)**
- `GET/POST/DELETE /api/brush/presets` — CRUD for brush presets
- `GET /api/brush/presets/:id/mask` — brush mask as PNG
- `POST /api/draw/stroke` — brush stroke with optional symmetry
- `POST /api/draw/symmetric` — symmetric pixel/line/fill
- `GET/PUT /api/canvas/:name/symmetry` — symmetry config

**Studio GUI**
- `BrushPanel` component with preset grid, size/opacity/spacing sliders, pixel-perfect toggle
- `SymmetryPanel` component with mode selector, axis controls, radial segments
- `BrushContext` with state management and API persistence
- CanvasView symmetry guide lines (dashed magenta overlay)
- PencilTool enhanced with brush/symmetry awareness
- ToolBar brush size indicator and symmetry quick-toggle button
- Keyboard shortcuts: `S` (cycle symmetry), `[`/`]` (brush size)

**Tests (75 new — 1095 total)**
- 45 core tests: brush-engine (36), drawing-engine-symmetry (10)
- 15 CLI tests: brush-management (8), draw-symmetric (9)
- 12 Studio tests: brush routes (6), draw-symmetric routes (7)

## [2.0.0-beta.4] - 2026-03-22

### Major — PixelCreator Studio (Web GUI) + Monorepo

Complete rewrite as pnpm workspace monorepo with 3 packages:
- `@pixelcreator/core` — shared engines, I/O, types
- `@pixelcreator/cli` — 175 CLI commands across 18 topics
- `@pixelcreator/studio` — web-based GUI with real-time preview

### Added — Milestones 24-39 (v2.0 development)

**M0: Release Engineering**
- Git tags for v1.1.0, v1.2.0, v1.3.0
- GitHub Actions release workflow (`.github/workflows/release.yml`)
- Release script (`scripts/release.sh`)
- CI hardened with lint step

**M1: Monorepo + Core Extraction**
- pnpm workspace with `packages/core/`, `packages/cli/`, `packages/studio/`
- Barrel export `@pixelcreator/core` with all engines, I/O, types, utils
- 850+ import rewrites in 170 command files
- All 904 existing tests passing after migration

**M2: API Server Foundation**
- Hono REST API server in `packages/studio/`
- 50+ REST endpoints for project, canvas, draw, palette, layer, frame, animation, selection, clipboard, transform, export, import, tileset, dataset, agent
- WebSocket server for real-time file change notifications
- File watcher with debounce on `.pxc` project directory
- `pxc studio:serve` CLI command

**M3: Live Canvas Preview MVP**
- React SPA with Vite (dark theme, `#1a1a2e`)
- Canvas renderer with HTML5 Canvas API, `image-rendering: pixelated`
- Zoom (1x-32x scroll wheel), pan (shift+drag), pixel grid
- Checkerboard transparency background
- WebSocket auto-reconnect with exponential backoff
- Sidebar with canvas list, TopBar with project info

**M4: Palette & Color Picker**
- Palette panel with swatch grid, foreground/background selection
- HSL/RGB color picker with hex input
- Color history (last 16 colors)
- Color harmony display (complementary, triadic, analogous, split-complementary)
- Palette CRUD API (create, update colors, sort, ramp, delete)
- Eyedropper (canvas pixel sampling)

**M5: Interactive Drawing Tools**
- 6 tools: Pencil (B), Line (L), Rect (R), Circle (C), Fill (G), Eraser (E)
- Tool preview overlay during drag
- Keyboard shortcuts for all tools
- ToolBar component with options (fill toggle, thickness slider)

**M6: Undo/Redo & History**
- Buffer-level undo via `PixelBuffer.clone()` before each operation
- In-memory history stack (50 entries max)
- `Ctrl+Z` undo, `Ctrl+Shift+Z` redo
- History API endpoints (undo, redo, status)
- `withHistory()` helper wraps all draw operations

**M7: Layer Management UI**
- Layer panel with thumbnails, visibility toggle, lock toggle
- Blend mode dropdown (14 modes), opacity slider
- Layer CRUD API (add, edit, delete, duplicate, reorder)
- Active layer tracking — drawing targets selected layer
- Layer thumbnail PNG endpoint

**M8: Animation Timeline**
- Timeline component with frame thumbnails
- Playback controls (play/pause/stop/step, FPS slider, loop)
- Animation tag bars visualization
- Onion skin toggle
- Frame CRUD API (add, delete, duplicate, timing)
- Animation tag CRUD API

**M9: Selection & Transform**
- Selection tools: Marquee Rect (M), Magic Wand (W), Move (V)
- Selection API (rect, ellipse, color, all, none, invert)
- Clipboard API (copy, cut, paste)
- Transform API (flip H/V, rotate 90/180/270, brightness, contrast, invert, desaturate, hue-shift)
- Transform panel with quick action buttons

**M10: Advanced Drawing Tools**
- Polygon (P), Gradient (D), Bezier (N) tools
- API endpoints: polygon, gradient, radial-gradient, bezier, outline, stamp
- 12 total drawing tools

**M11: Export & Import UI**
- Export dialog (PNG, GIF, APNG, spritesheet, SVG) with format-specific options
- Import dialog with drag-and-drop (PNG, GIF)
- Export API with Content-Disposition download headers
- Import API with multipart file upload

**M12: Tileset & Tilemap Editor**
- Tileset creation from canvas (auto-slice + deduplication)
- Tilemap editor with click-to-place grid
- Tileset/tilemap CRUD API (9 endpoints)
- Tileset image and tilemap render as PNG

**M13: Agent Integration Panel**
- AgentBridge with command logging middleware
- Agent panel (bottom-right) with real-time command log
- Color-coded entries by topic, auto-scroll
- Command palette (`Ctrl+Shift+P`) with search + execute

**M14: AI Training Dataset System**
- Like/Dislike feedback with reason + 6 tags
- Snapshot capture at time of rating
- Dataset API (rate, list, stats, export, delete)
- JSONL export with base64 PNG images for AI fine-tuning
- CSV export summary
- Dataset browser dialog with filters and stats
- 4 CLI commands: `dataset:rate`, `dataset:list`, `dataset:export`, `dataset:stats`

**M15: Theme & UX Polish**
- 4 themes: Dark, Light, High Contrast, Aseprite Classic
- Theme persistence via localStorage
- Status bar with contextual info
- Keyboard shortcut reference (`Ctrl+K`)
- Global CSS transitions

**M16: Performance Optimization**
- Batch draw endpoint (`POST /api/draw/batch`)
- Server-side frame cache (LRU with ETag)
- Client-side request batching (pencil/eraser)
- Single history entry for batch operations

### Stats
- 175 commands across 18 topics
- 19 core engines + 12 I/O modules
- 50+ REST API endpoints + WebSocket
- React SPA with 25+ components, 12 drawing tools
- 112 test files, 1020 tests (0 failures)

---

## [1.3.0] - 2026-03-21

### Added — Milestone 23: Visual Preview (TUI + Web)

- `terminal-renderer.ts` — ANSI 256/truecolor pixel rendering with half-block chars (▀▄)
- `html-renderer.ts` — Standalone HTML with embedded PNG, zoom, grid, animation playback
- `view:preview` — Preview pixel art in terminal with ANSI colors (`--truecolor`)
- `view:web` — Local HTTP server with browser preview (`--port`)
- `export:html` — Export as interactive HTML (`--animated`, `--grid`, `--scale`)
- New `view` topic registered
- 19 new tests, 904 total, 0 failures. 0 new dependencies.

## [1.2.0] - 2026-03-21

### Added — Milestone 22: Performance & Scale

- `buffer-pool.ts` — PixelBuffer pool with acquire/release, reuse stats
- `composite-cache.ts` — LRU cache for composites with hit/miss tracking
- PixelBuffer: `getPixelU32/setPixelU32` (packed 32-bit), `copyFrom` (bulk memcpy), `equals`
- `flattenLayerTree` optimized: only clone prevBuffer when needed for clipping
- `project:benchmark` — Canvas performance benchmarks
- 22 new tests, 885 total, 0 failures

## [1.1.0] - 2026-03-21

### Added — Milestone 21: Plugin System

#### New Core Modules
- `hook-manager.ts` — Singleton hook registry with pre:command, post:command, on:error lifecycle hooks
- `plugin-loader.ts` — Plugin discovery (project + user level), manifest validation, install/uninstall, scaffold generator

#### New Types
- `plugin.ts` — PluginManifest, PluginInfo, HookName, HookFn, HookContext

#### Plugin Commands (6 new)
- `plugin:init` — Create plugin scaffold (manifest.json + index.js)
- `plugin:install` — Install plugin from local directory into project
- `plugin:list` — List all installed plugins
- `plugin:info` — Show plugin details (commands, hooks, version)
- `plugin:toggle` — Enable/disable plugin (marker file system)
- `plugin:uninstall` — Remove plugin from project

#### Plugin Storage
- Project-level: `{project}.pxc/plugins/{name}/`
- User-level: `~/.pxc/plugins/{name}/`
- Each plugin: `manifest.json` + `index.js`

#### Test Coverage
- Unit tests: hook-manager (8), plugin-loader (10)
- Integration tests: plugin-commands (8)
- Total: 26 new tests, 863 total, 0 failures

**Total: 6 new commands, 2 new core modules, 26 new tests**

## [1.0.0] - 2026-03-21

### v1.0.0 — Stable Release

PixelCreator reaches its first stable release after 20 milestones.

- **161 commands** across 14 topics
- **15 core engines**, **10 I/O modules**, **14 blend modes**
- **Layer groups** with hierarchical compositing and clipping masks
- **Texture atlas** for Unity/Godot, Aseprite .ase import/export
- **837 tests, 0 failures**, CI/CD via GitHub Actions
- Fixed 9 flaky tests (timeout config), 7 ESLint errors, documentation accuracy
- Expanded README with formats table, workflow examples, installation guide

## [0.19.0] - 2026-03-21

### Added — Milestone 19: Pixel Art Utilities

#### New Core Engine
- `color-analysis-engine.ts` — colorHistogram, topColors, generatePalette, colorHarmony, rgbToHsl/hslToRgb, compareBuffers

#### Transform Engine Enhancement
- `scaleBufferBilinear` — bilinear interpolation resize (vs existing nearest-neighbor)

#### Canvas Commands (5 new)
- `canvas:histogram` — Color histogram with top N most used colors
- `canvas:compare` — Pixel-by-pixel comparison of two canvases with diff PNG output
- `canvas:resize-bilinear` — Resize canvas with bilinear interpolation (`--factor` or `--width/--height`)
- `canvas:color-count` — Count unique colors in canvas
- `canvas:reduce-colors` — Reduce canvas to N colors via quantization

#### Palette Commands (2 new)
- `palette:generate` — Auto-generate optimal palette from canvas colors
- `palette:harmony` — Generate color harmony palette (complementary/triadic/analogous/split-complementary)

#### Draw Commands (1 new)
- `draw:color-info` — Display RGB, HSL, hex info for any color (standalone utility)

#### Test Coverage
- Unit tests: color-analysis-engine (20)
- Integration tests: pixel-art-utils (12)
- Total: 32 new tests, 837 total, 0 failures

**Total: 8 new commands, 1 new engine, 32 new tests**

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
