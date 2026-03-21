# PixelCreator

CLI-first professional pixel art tool for game development.

## Features

- **141 commands** across 14 topics — full pixel art workflow from the terminal
- **Directory-based .pxc project format** — git-friendly, human-readable
- **Drawing primitives** — pixel, line, rect, circle, ellipse, polygon, bezier, fill, gradient, outline, stamp, pattern fill, thickness
- **Layer system** — 14 blend modes, layer groups, clipping masks, transforms, color effects
- **Animation** — tweening, palette cycling, easing, tags, GIF/APNG/spritesheet, onion skin
- **Tileset & tilemap** — tile deduplication, tilemap rendering, Tiled editor export
- **Selection & clipboard** — rect, ellipse, color selection, cut/copy/paste/move
- **Templates & recipes** — reusable canvas templates, automated command sequences
- **JSON output** — every command supports `--output json` for scripting and pipelines

## Quick Start

```bash
npm install -g pixelcreator

pxc project:init mysprite
pxc canvas:create player --width 32 --height 32
pxc draw:rect player --x 0 --y 0 --width 32 --height 32 --color "#3a86ff" --fill
pxc export:png player
```

## Command Topics

| Topic | Description |
|-------|-------------|
| `animation` | Timeline, tags, onion skin, animation export |
| `canvas` | Create, resize, crop, flip, rotate, scale, clone |
| `draw` | Pixel, line, rect, circle, ellipse, polygon, bezier, gradient, stamp, pattern fill |
| `export` | PNG, GIF, APNG, SVG, CSS, spritesheet, 9-slice, palette image |
| `frame` | Add, duplicate, remove, reorder frames |
| `import` | PNG, GIF, Aseprite (.ase), spritesheet, palette image |
| `layer` | Groups, 14 blend modes, clipping masks, merge, color effects |
| `palette` | Create, edit, sort, ramp, extract, import/export (GPL/JASC/HEX) |
| `project` | Init, info, settings, validation, tags |
| `recipe` | Create and run automated command sequences |
| `select` | Rect, ellipse, color selection, clipboard ops |
| `template` | Reusable canvas templates |
| `tileset` | Tileset/tilemap management, Tiled export |
| `validate` | Palette and size validation |

Run `pxc --help` or `pxc <topic> --help` for details.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

See [CLAUDE.md](CLAUDE.md) for the full development guide.

## License

[MIT](LICENSE)
