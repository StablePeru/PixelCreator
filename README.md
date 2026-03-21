<h1 align="center">PixelCreator</h1>

<p align="center">
  <strong>CLI-first professional pixel art tool for game development</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node >= 20">
  <img src="https://img.shields.io/badge/commands-170-orange.svg" alt="170 commands">
  <img src="https://img.shields.io/badge/tests-904%20passing-brightgreen.svg" alt="904 tests">
  <img src="https://img.shields.io/badge/version-1.3.0-purple.svg" alt="v1.3.0">
</p>

<p align="center">
  Create, animate, and export pixel art entirely from the command line.<br>
  Git-friendly project format. JSON output for scripting. Zero GUI required.
</p>

---

## Why PixelCreator?

- **Full workflow in the terminal** --- from `project:init` to `export:gif` in a single pipeline
- **Git-friendly `.pxc` format** --- directory-based projects with JSON metadata + PNG layers, perfect for version control
- **170 commands** across 16 topics --- drawing, layers, animation, tilesets, templates, recipes, selections, and more
- **Scriptable** --- every command supports `--output json` for automation, CI/CD, and tool integration
- **Extensible** --- plugin system with project-level and user-level plugins

## Installation

```bash
npm install -g pixelcreator
```

Requires **Node.js 20** or later.

## Quick Start

```bash
# Create a new project
pxc project:init my-game-sprites

# Create a 32x32 canvas with a palette
pxc palette:create --name gameboy --colors "#0f380f,#306230,#8bac0f,#9bbc0f"
pxc canvas:create player --width 32 --height 32 --palette gameboy

# Draw a character
pxc draw:rect player --x 12 --y 4 --width 8 --height 8 --color "#306230" --fill
pxc draw:rect player --x 8 --y 12 --width 16 --height 12 --color "#8bac0f" --fill
pxc draw:pixel player --x 13 --y 6 --color "#0f380f"
pxc draw:pixel player --x 18 --y 6 --color "#0f380f"

# Add animation frames
pxc frame:add --canvas player --copy-from 0
pxc draw:rect player --x 8 --y 24 --width 6 --height 4 --color "#306230" --fill --frame frame-002
pxc animation:create-tag --canvas player --name walk --from 0 --to 1 --direction pingpong

# Preview in terminal
pxc view:preview --canvas player --truecolor

# Export everywhere
pxc export:png player --dest player.png
pxc export:gif --canvas player --dest player.gif
pxc export:spritesheet --canvas player --dest sheet.png --layout horizontal
pxc export:ase --canvas player --dest player.ase
pxc export:svg --canvas player --dest player.svg --scale 10
pxc export:atlas --canvas player --dest ./atlas --format unity
pxc export:html --canvas player --dest preview.html --animated --grid
```

## Features

### Drawing
Pixel, line, rect, circle, ellipse, polygon, polyline, bezier curves, gradient (linear + radial), flood fill, pattern fill, stamp brush, outline generation. All shapes support configurable `--thickness`.

### Layers
14 blend modes (normal, multiply, screen, overlay, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, addition, subtract, darken, lighten). Layer groups with hierarchical compositing. Clipping masks. Color effects: brightness, contrast, invert, desaturate, hue-shift, posterize, dithering.

### Animation
Frame timeline with tags (forward/reverse/pingpong). Tweening with cross-fade interpolation. Palette cycling. Easing curves (linear, ease-in, ease-out, ease-in-out). Onion skin preview. Copy frames between canvases.

### Selection & Clipboard
Rectangular, elliptical, and color-based selections (magic wand). Cut, copy, paste, move. Selection union with `--add`.

### Tilesets & Tilemaps
Create tilesets from canvases with automatic deduplication. Tilemap CRUD with flip support. Render tilemaps to PNG. Export to Tiled editor format (TSJ/TMJ).

### Templates & Recipes
Save canvas configurations as reusable templates. Define multi-step command sequences as recipes with variables and dry-run support.

### Palette Tools
Import/export GPL (GIMP), JASC-PAL, HEX (Lospec) formats. Auto-generate palettes from canvas. Color harmony generation (complementary, triadic, analogous). Histograms and color analysis.

### Visual Preview
Terminal preview with ANSI colors (256 + truecolor). Interactive HTML export with zoom, grid, and animation playback. Local web server for browser preview.

### Automation
Watch mode for auto-execution on file changes. Canvas snapshots for manual undo. Batch color replacement across all layers/frames. Batch command execution across canvases. Project cleanup utilities.

## Command Topics

| Topic | # | Description |
|-------|--:|-------------|
| `animation` | 12 | Tweening, palette cycling, easing, tags, onion skin |
| `canvas` | 19 | Create, resize, crop, flip, rotate, scale, histogram, compare |
| `draw` | 18 | Primitives, polygon, bezier, gradient, stamp, pattern fill |
| `export` | 18 | PNG, GIF, APNG, SVG, ASE, ICO, CSS, HTML, atlas, spritesheet |
| `frame` | 8 | Add, duplicate, remove, reorder, copy, label |
| `import` | 5 | PNG, GIF, Aseprite (.ase), spritesheet, palette image |
| `layer` | 23 | Groups, 14 blend modes, clipping, merge, color effects |
| `palette` | 12 | Create, sort, generate, harmony, import/export formats |
| `plugin` | 6 | Init, install, list, info, toggle, uninstall |
| `project` | 12 | Init, settings, snapshots, watch, benchmark, clean |
| `recipe` | 5 | Create and run automated command sequences |
| `select` | 11 | Rect, ellipse, color selection, clipboard operations |
| `template` | 5 | Reusable canvas templates |
| `tileset` | 12 | Tileset/tilemap management, Tiled export |
| `validate` | 2 | Palette and size validation |
| `view` | 2 | Terminal preview, web server preview |

Run `pxc --help` or `pxc <topic> --help` for details.

## Supported Formats

| Format | Import | Export | Notes |
|--------|:------:|:------:|-------|
| PNG | :white_check_mark: | :white_check_mark: | Single frame or per-layer |
| GIF (animated) | :white_check_mark: | :white_check_mark: | With frame timing |
| APNG | | :white_check_mark: | Lossless animated PNG |
| Aseprite (.ase) | :white_check_mark: | :white_check_mark: | Layers, frames, tags, palette |
| SVG | | :white_check_mark: | Pixel-perfect scalable |
| HTML | | :white_check_mark: | Interactive with zoom/grid/animation |
| ICO | | :white_check_mark: | Multi-resolution icons |
| CSS (box-shadow) | | :white_check_mark: | Web pixel art |
| Data URL | | :white_check_mark: | Base64 for embedding |
| Spritesheet + JSON | :white_check_mark: | :white_check_mark: | With margin/padding |
| Texture Atlas (Unity) | | :white_check_mark: | TexturePacker format |
| Texture Atlas (Godot) | | :white_check_mark: | .tres resource |
| 9-slice | | :white_check_mark: | UI sprite regions |
| GPL (GIMP Palette) | :white_check_mark: | :white_check_mark: | |
| JASC-PAL | :white_check_mark: | :white_check_mark: | |
| HEX (Lospec) | :white_check_mark: | :white_check_mark: | |
| Palette Image (PNG) | :white_check_mark: | :white_check_mark: | Color swatch grid |

## Project Format

PixelCreator uses a directory-based `.pxc` format designed for version control:

```
myproject.pxc/
  project.json                  # Project manifest
  palettes/
    gameboy.palette.json        # Palette definitions
  canvases/
    player/
      canvas.json               # Canvas metadata, layers, frames, tags
      layers/
        layer-001/
          frame-001.png         # Per-layer per-frame pixel data
          frame-002.png
  tilesets/                     # Tileset definitions + tiles
  templates/                    # Reusable canvas templates
  recipes/                      # Automation scripts
  plugins/                      # Project-level plugins
  snapshots/                    # Canvas state snapshots
  exports/                      # Export output
```

## Architecture

```
src/
  commands/     # 170 oclif commands across 16 topics
  core/         # 15 pure-function engines (drawing, layers, animation, ...)
  io/           # 12 I/O modules (PNG, GIF, APNG, ASE, SVG, HTML, ...)
  types/        # TypeScript interfaces matching JSON schemas
  utils/        # Output formatting, ID generation, point parsing
```

- **Framework**: [oclif](https://oclif.io) v4 with topic:command pattern
- **Language**: TypeScript (strict mode, ESM)
- **Build**: tsup (no bundling, ESM output)
- **Tests**: vitest with 904 tests across 92 suites
- **CI/CD**: GitHub Actions (Node 20 + 22)

## Development

```bash
git clone https://github.com/StablePeru/PixelCreator.git
cd PixelCreator
pnpm install
pnpm build
pnpm test        # 904 tests
pnpm lint        # ESLint v9+
pnpm dev         # Watch mode
```

See [CLAUDE.md](CLAUDE.md) for the full development guide.

## License

[MIT](LICENSE) --- built by [stabl](https://github.com/StablePeru)
