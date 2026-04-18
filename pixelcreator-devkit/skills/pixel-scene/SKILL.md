---
name: pixel-scene
description: Turn a natural-language scene description into a pixel-art asset by orchestrating a sequence of pxc CLI commands. Produces a standalone .pxc project + PNG under showcase/. Triggers on requests like "draw a forest scene in 64x64", "make a pixel castle at dusk".
---

# Pixel-Scene Skill

Compose a pixel-art scene from a description by driving the `pxc` CLI via the **pxc-artist** subagent.

## Workflow

### 1. Interpret the request

Extract:
- **Subject** (tree, castle, character, landscape, etc.).
- **Canvas size** (default 64×64 if unspecified).
- **Style / mood** (cute, dark, vibrant, retro, etc.).
- **Palette hint** (if provided, else pick an aesthetic-matching ramp).

### 2. Plan asset + palette

Sketch mentally (or via ASCII):
- Background → midground → foreground layers.
- Lighting direction (top-left default).
- 3-5 key shapes that define the silhouette.

Pick a palette approach:
- `pxc palette:ramp` — cohesive single-hue ramp.
- `pxc palette:harmony` — complementary / analogous / triadic.
- Manual HEX list — explicit user intent.

### 3. Delegate execution

Hand off to the **pxc-artist** subagent with a concrete command plan:

```
Project: showcase/<slug>.pxc
Canvas: main (<W>x<H>)
Palette: <name> (<colors>)

Layers (bottom → top):
  1. background — <engine calls>
  2. midground — <engine calls>
  3. foreground — <engine calls>
  4. details — <engine calls>

Export: showcase/<slug>.png
```

The subagent runs the `pnpm pxc ...` commands with `--output json` and stops on any failure.

### 4. Review output

- Ask the user to inspect `showcase/<slug>.png`.
- If refinement is needed, propose targeted `pxc draw:*` tweaks (not a full redo).
- Optionally export a `.pxc` snapshot for versioning (`pxc project:snapshot`).

## Command playbook

Typical sequence (adapt sizes/coords to the scene):

```bash
pnpm pxc project:init   --project showcase/<slug>.pxc --output json
pnpm pxc canvas:create  --project showcase/<slug>.pxc --name main --size 64x64 --output json
pnpm pxc palette:ramp   --project showcase/<slug>.pxc --name pal --base "#3a7d44" --steps 6 --output json
pnpm pxc layer:add      --project showcase/<slug>.pxc --canvas main --name background --output json
pnpm pxc draw:gradient  --project showcase/<slug>.pxc --canvas main --layer background --from 0,0 --to 0,63 --colors "#1a2a3a,#3a5a7a" --output json
pnpm pxc layer:add      --project showcase/<slug>.pxc --canvas main --name midground --output json
# ... subject drawing with draw:circle/draw:polygon/draw:bezier ...
pnpm pxc export:png     --project showcase/<slug>.pxc --canvas main --out showcase/<slug>.png --output json
```

## Rules

- Always work inside `showcase/`.
- Use a unique `<slug>` per scene (kebab-case, matches subject).
- Prefer built-in generators (`generate:noise`, `generate:brick`) for textures rather than manual pixel storms.
- Respect pixel-art conventions: limited palette (8-16 colors), consistent light direction, clean silhouettes.
- Never edit existing projects in the repo root — `.pxc/` directories there are the user's work.

Scene to create: $ARGUMENTS
