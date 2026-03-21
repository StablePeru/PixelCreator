# PixelCreator

CLI-first professional pixel art tool for game development.

## Features

- **167 commands** across 15 topics — full pixel art workflow from the terminal
- **Directory-based .pxc project format** — git-friendly, human-readable
- **Drawing primitives** — pixel, line, rect, circle, ellipse, polygon, bezier, gradient, stamp, pattern fill, configurable thickness
- **Layer system** — 14 blend modes, layer groups, clipping masks, transforms, color effects
- **Animation** — tweening, palette cycling, easing, tags, GIF/APNG/spritesheet, onion skin
- **Selection & clipboard** — rect, ellipse, color selection, cut/copy/paste/move
- **Tileset & tilemap** — tile deduplication, tilemap rendering, Tiled editor export
- **Import/Export** — PNG, GIF, APNG, SVG, Aseprite (.ase), ICO, CSS, data URL, texture atlas (Unity/Godot)
- **Palette tools** — GPL/JASC/HEX import/export, auto-generation, color harmony, histograms
- **Automation** — recipes, templates, watch mode, snapshots, batch operations
- **JSON output** — every command supports `--output json` for scripting and pipelines

## Requirements

- Node.js >= 20.0.0
- npm, pnpm, or yarn

## Installation

```bash
npm install -g pixelcreator
```

## Quick Start

```bash
# Create a project
pxc project:init mysprite

# Create a canvas and draw
pxc canvas:create player --width 32 --height 32
pxc draw:rect player --x 0 --y 0 --width 32 --height 32 --color "#3a86ff" --fill
pxc draw:circle player --cx 16 --cy 16 --radius 8 --color "#ff006e" --fill

# Add animation frames
pxc frame:add --canvas player
pxc draw:rect player --x 2 --y 2 --width 28 --height 28 --color "#fb5607" --fill --frame frame-002

# Export
pxc export:png player --dest player.png
pxc export:gif --canvas player --dest player.gif
pxc export:spritesheet --canvas player --dest sheet.png
pxc export:ase --canvas player --dest player.ase
```

## Command Topics

| Topic | # | Description |
|-------|---|-------------|
| `animation` | 12 | Tweening, palette cycling, easing, tags, onion skin, export |
| `canvas` | 19 | Create, resize, crop, flip, rotate, scale, clone, histogram, compare |
| `draw` | 18 | Pixel, line, rect, circle, ellipse, polygon, bezier, gradient, stamp |
| `export` | 17 | PNG, GIF, APNG, SVG, ASE, ICO, CSS, atlas (Unity/Godot), spritesheet |
| `frame` | 8 | Add, duplicate, remove, reorder, copy, label |
| `import` | 5 | PNG, GIF, Aseprite (.ase), spritesheet, palette image |
| `layer` | 23 | Groups, 14 blend modes, clipping, merge, color effects, transforms |
| `palette` | 12 | Create, edit, sort, ramp, generate, harmony, import/export (GPL/JASC/HEX) |
| `project` | 11 | Init, info, settings, snapshots, watch mode, clean |
| `recipe` | 5 | Create and run automated command sequences |
| `select` | 11 | Rect, ellipse, color selection, cut/copy/paste/move |
| `template` | 5 | Reusable canvas templates |
| `tileset` | 12 | Tileset/tilemap management, Tiled export |
| `validate` | 2 | Palette and size validation |

Run `pxc --help` or `pxc <topic> --help` for command details.

## Supported Formats

| Format | Import | Export |
|--------|--------|--------|
| PNG | Yes | Yes |
| GIF (animated) | Yes | Yes |
| APNG | — | Yes |
| Aseprite (.ase) | Yes | Yes |
| SVG | — | Yes |
| ICO | — | Yes |
| CSS (box-shadow) | — | Yes |
| Data URL (base64) | — | Yes |
| Spritesheet + JSON | Yes | Yes |
| Texture Atlas (Unity) | — | Yes |
| Texture Atlas (Godot) | — | Yes |
| 9-slice | — | Yes |
| Palette (GPL) | Yes | Yes |
| Palette (JASC-PAL) | Yes | Yes |
| Palette (HEX) | Yes | Yes |
| Palette (PNG swatch) | Yes | Yes |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

See [CLAUDE.md](CLAUDE.md) for the full development guide.

## License

[MIT](LICENSE)
