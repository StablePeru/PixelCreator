---
name: sprite-sheet
description: Generate a complete sprite sheet (multiple frames/poses/directions for a character or object) via pxc CLI. Produces .pxc project with frames + exported sprite sheet PNG + metadata JSON. Triggers on "make a sprite sheet for X", "character with walk cycle".
---

# Sprite-Sheet Skill

Produce a cohesive sprite sheet by orchestrating `pxc` via the **pxc-artist** subagent.

## Inputs to clarify

1. **Subject** — character, enemy, item, etc.
2. **Frame size** — e.g., 16×16, 32×32, 48×48.
3. **Poses / frames needed** — idle (1-2), walk (4 or 8), attack (2-4), jump, etc.
4. **Directions** — down / up / left / right, or a single facing.
5. **Layout** — horizontal strip, vertical strip, or grid (rows × cols).
6. **Palette** — consistent across all frames. Limit 8-16 colors.

## Workflow

### 1. Plan the grid

Compute total sheet size: `(frames_per_row × frame_W) × (rows × frame_H)`.

Example for 32×32 frames, walk-cycle 4 frames × 4 directions:
- Sheet: 128×128 (4×4 grid).

### 2. Create base project + palette

```bash
pnpm pxc project:init    --project showcase/<slug>.pxc --output json
pnpm pxc canvas:create   --project showcase/<slug>.pxc --name sprite --size <FW>x<FH> --output json
pnpm pxc palette:create  --project showcase/<slug>.pxc --name pal --colors "<hex,hex,...>" --output json
```

### 3. Draw frames one by one

For each frame:
1. `pxc frame:add` (or `frame:duplicate` + `frame:clone` from a base pose).
2. Draw the pose using `draw:*` commands.
3. Use `pxc layer:add` to separate concerns (silhouette, shading, outline).

### 4. Export sprite sheet

```bash
pnpm pxc export:spritesheet \
  --project showcase/<slug>.pxc \
  --canvas sprite \
  --layout grid \
  --cols 4 --rows 4 \
  --out showcase/<slug>.sheet.png \
  --metadata showcase/<slug>.sheet.json \
  --output json
```

### 5. Optional engine metadata

If the user targets Godot/Unity, emit engine-specific metadata:
```bash
pnpm pxc gamedev:godot-tres  --project showcase/<slug>.pxc --canvas sprite --out showcase/<slug>.tres
pnpm pxc gamedev:unity-sprite --project showcase/<slug>.pxc --canvas sprite --out showcase/<slug>.unity.json
```

## Consistency rules

- **Same palette across all frames** — enforce with a `palette:constraints` check.
- **Same silhouette anchor** — the character's feet/base should sit on the same row across frames.
- **Consistent light direction** — top-left is the default, don't flip mid-cycle.
- **Minimal anti-aliasing** — pixel art is intentionally hard-edged.

## Output

Report:
- Sheet path + dimensions.
- Frame count, rows × cols.
- Metadata JSON path.
- Preview command: `pxc view:terminal --project showcase/<slug>.pxc --canvas sprite`.

Subject + layout: $ARGUMENTS
