#!/bin/bash
# ============================================================================
# Asset Pipeline Demo — biome-blend slice (M6)
# Exercises: asset:init --type biome-blend → asset:list → asset:validate → asset:build
# Outputs: 47 blob-47 transition tiles (grass → sand) composed into an atlas PNG
# plus a Godot 4 TileSet .tres under $P/exports/$A/.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

P="asset-biome-blend-demo.pxc"
SRC="grass"
TGT="sand"
A="grass_to_sand"

echo "=== Asset Pipeline Demo — Biome Blend (grass → sand) ==="
rm -rf "$P"

# 1. Project + two 16x16 bioma canvases.
pnpm pxc project:init -n asset-biome-blend-demo --path . -o silent
pnpm pxc canvas:create -n "$SRC" -w 16 -h 16 -p "$P" -o silent
pnpm pxc canvas:create -n "$TGT" -w 16 -h 16 -p "$P" -o silent

# 2. Paint each canvas with a flat bioma color.
pnpm pxc draw:rect -c "$SRC" --x 0 --y 0 --width 16 --height 16 --color "#3cb43c" --fill -p "$P" -o silent
pnpm pxc draw:rect -c "$TGT" --x 0 --y 0 --width 16 --height 16 --color "#e6c88c" --fill -p "$P" -o silent

# 3. Initialize a biome-blend asset spec (Godot target, default dither strength 0.5).
pnpm pxc asset:init -n "$A" --type biome-blend \
  --source-canvas "$SRC" --target-canvas "$TGT" \
  --tile-size 16x16 --blend-mode dither --strength 0.5 \
  --engine godot -p "$P"

# 4. List specs.
echo ""
echo "=== asset:list ==="
pnpm pxc asset:list -p "$P"

# 5. Validate.
echo ""
echo "=== asset:validate ==="
pnpm pxc asset:validate -n "$A" -p "$P"

# 6. Build. Artifacts land in $P/exports/$A/.
echo ""
echo "=== asset:build ==="
pnpm pxc asset:build -n "$A" -p "$P"

echo ""
echo "Artifacts:"
ls -la "$P/exports/$A"
echo ""
echo "Open $P/exports/$A/${A}.tres in Godot 4 to import the biome-blend TileSet."
echo "(47 blob-47 transition tiles. Re-run with --include-inverse for 94 tiles.)"
