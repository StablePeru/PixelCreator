---
name: palette-design
description: Design a palette that fits a mood/style and apply it to a canvas (quantize existing pixels, generate ramps, validate accessibility). Triggers on "design a palette for X", "reduce this to N colors", "make it feel <mood>".
---

# Palette-Design Skill

Design and apply a palette using PixelCreator's `palette-engine` + `color-analysis-engine` + `accessibility-engine`, driven by the **pxc-artist** subagent.

## Inputs

1. **Mood / style** — warm, cold, retro-GB, sunset, underwater, CGA, etc.
2. **Size** — target color count (typical: 4, 8, 16, 32).
3. **Base colors** (optional) — user-provided anchors.
4. **Accessibility constraints** — WCAG AA/AAA contrast? colorblind-safe?
5. **Apply target** (optional) — a canvas to quantize to the new palette.

## Workflow

### 1. Generate candidate palettes

Options (pick one or more, present to user):

**Ramp** — single-hue to shaded monochrome.
```bash
pnpm pxc palette:ramp \
  --name <name> --base "#3a7d44" --steps 8 --output json
```

**Harmony** — complementary / analogous / triadic / tetradic.
```bash
pnpm pxc palette:harmony \
  --name <name> --base "#f08050" --kind complementary --steps 4 --output json
```

**Sorted HSL** — manual seeds then sort.
```bash
pnpm pxc palette:sort \
  --name <name> --by hsl --output json
```

**Analyze existing canvas** — extract dominant colors.
```bash
pnpm pxc palette:analyze \
  --project <path> --canvas <name> --top 8 --output json
```

### 2. Validate accessibility

```bash
pnpm pxc validate:accessibility \
  --project <path> --palette <name> \
  --target wcag-aa --output json
```

Flags any foreground/background pair that fails contrast. Optionally simulate CVD (protanopia, deuteranopia, tritanopia, achromatopsia):

```bash
pnpm pxc validate:cvd \
  --project <path> --palette <name> --mode protanopia --output json
```

### 3. Apply to canvas (optional)

Quantize an existing canvas to the new palette:
```bash
pnpm pxc palette:quantize \
  --project <path> --canvas <name> \
  --palette <name> --dither floyd-steinberg --output json
```

### 4. Export palette

```bash
pnpm pxc palette:export \
  --project <path> --name <name> \
  --format gpl \
  --out showcase/<name>.gpl --output json
```

Formats supported: `gpl` (GIMP/Aseprite), `jasc-pal`, `hex`, `png` (swatch strip).

## Design heuristics

- **Retro-GB (4 colors)**: `#0f380f,#306230,#8bac0f,#9bbc0f`.
- **NES (limited palette)**: pick 4 subsets, one per "attribute".
- **Sunset warm**: 3 warm hues × 3 shades = 9 colors.
- **Cool night**: blues + purples + 1-2 accent warm pixels for highlights.
- **PICO-8**: 16 fixed colors — reference it rather than reinvent.

## Output

Report:
- Palette name + colors with HEX + ASCII swatch row.
- Accessibility verdict per pair.
- If applied: before/after pixel stats (color count delta, dither applied).
- Export path.

Palette request: $ARGUMENTS
