---
name: animate
description: Animate a set of frames into a GIF/APNG/spritesheet via pxc CLI — handles timing, onion skin, tween interpolation, and export. Triggers on "animate this", "make it a GIF", "loop this walk cycle".
---

# Animate Skill

Compose an animation from frames using `pxc` animation + export pipeline.

## Inputs

1. **Source**: existing `.pxc` project with multiple frames, or produce via `sprite-sheet` skill first.
2. **FPS / timing** — per-frame ms or uniform FPS (default 10 FPS = 100ms/frame).
3. **Format** — GIF, APNG, or MP4 (GIF is default for web).
4. **Loop** — infinite, or N cycles.
5. **Onion skin** (authoring only) — show previous/next frames semi-transparent while editing.
6. **Tween** — optional, for smoothing between keyframes.

## Workflow

### 1. Validate frames

```bash
pnpm pxc frame:list --project <path> --canvas <name> --output json
```

Ensure: at least 2 frames, consistent size, consistent palette.

### 2. Configure timing

Per-frame timing:
```bash
pnpm pxc animation:timing \
  --project <path> --canvas <name> \
  --frame <id> --ms 120 --output json
```

Uniform timing:
```bash
pnpm pxc animation:timing \
  --project <path> --canvas <name> \
  --all --ms 100 --output json
```

### 3. (Optional) Tag sequences

If the project has multiple animations (walk, attack, idle), tag them:
```bash
pnpm pxc animation:tag \
  --project <path> --canvas <name> \
  --name walk --from 1 --to 4 --output json
```

### 4. (Optional) Tween between keyframes

```bash
pnpm pxc animation:tween \
  --project <path> --canvas <name> \
  --from-frame 1 --to-frame 4 --steps 3 --easing linear --output json
```

### 5. Preview in terminal

```bash
pnpm pxc view:terminal --project <path> --canvas <name> --animate
```

### 6. Export

```bash
# GIF
pnpm pxc export:gif \
  --project <path> --canvas <name> \
  --out showcase/<slug>.gif \
  --loop infinite --output json

# APNG (higher quality)
pnpm pxc export:apng \
  --project <path> --canvas <name> \
  --out showcase/<slug>.apng --output json

# Spritesheet (if the target is a game engine)
pnpm pxc export:spritesheet \
  --project <path> --canvas <name> \
  --layout horizontal --out showcase/<slug>.sheet.png --output json
```

## Quality checks

- **File size** — GIFs > 500 KB are suspicious for a small pixel animation; reduce palette or frame count.
- **Smoothness** — too few frames → choppy; too many → wasted bytes.
- **Loop continuity** — first and last frame should blend if looping infinitely.
- **Color drift** — all frames must share the project palette; run `palette:constraints` to verify.

## Output

Report:
- Final file path + size.
- Frame count + effective FPS.
- Loop behavior.
- Quick preview: `pnpm pxc view:web --project <path>` (opens browser).

Animation target + format: $ARGUMENTS
