#!/bin/bash
# ============================================================================
# Asset Pipeline Demo — character-spritesheet slice
# Exercises: asset:init → asset:list → asset:validate → asset:build
# Plus: asset:build --watch (separate, interactive — see NOTE below)
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

P="asset-demo.pxc"
C="hero"
A="hero"

echo "=== Asset Pipeline Demo ==="
rm -rf "$P"

# 1. Project + canvas with 4 frames.
pnpm pxc project:init -n asset-demo --path . -o silent
pnpm pxc canvas:create -n "$C" -w 16 -h 16 -p "$P" -o silent
pnpm pxc frame:add -c "$C" --count 3 -p "$P" -o silent

# 2. Draw a minimal distinguishable pixel per frame so validation passes.
for i in 1 2 3 4; do
  pnpm pxc draw:rect -c "$C" -f "frame-00$i" --x 4 --y 4 --width 8 --height 8 \
    --color "#$((i*20))4040" --fill -p "$P" -o silent
done

# 3. Create a tag covering all frames (required by requireAllFramesFilled default).
pnpm pxc animation:create-tag -c "$C" --name idle --from 0 --to 3 -p "$P" -o silent

# 4. Initialize an asset spec from the canvas.
pnpm pxc asset:init -n "$A" -c "$C" --engine godot -p "$P"

# 5. List specs — shows the new command in action.
echo ""
echo "=== asset:list ==="
pnpm pxc asset:list --details -p "$P"

# 6. Validate the spec.
echo ""
echo "=== asset:validate ==="
pnpm pxc asset:validate -n "$A" -p "$P"

# 7. Build. Output under $P/exports/$A/.
echo ""
echo "=== asset:build ==="
pnpm pxc asset:build -n "$A" -p "$P"

echo ""
echo "Artifacts:"
ls -la "$P/exports/$A"

# NOTE: asset:build --watch is interactive (runs until Ctrl+C). To try it:
#   pnpm pxc asset:build -n $A --watch -p $P
# Then edit $P/assets/$A.asset.json in another terminal — each save triggers
# a debounced rebuild. Covered end-to-end by test/e2e/asset-build-watch.test.ts.
