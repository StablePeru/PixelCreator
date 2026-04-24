#!/bin/bash
# ============================================================================
# Asset Pipeline Demo — tileset slice
# Exercises: asset:init --type tileset → asset:list → asset:validate → asset:build
# Outputs: a PNG atlas and a Godot 4 TileSet .tres under $P/exports/$A/.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

P="asset-tileset-demo.pxc"
C="terrain"
A="terrain_tiles"

echo "=== Asset Pipeline Demo — Tileset ==="
rm -rf "$P"

# 1. Project + 32x32 canvas (splits into a 2x2 grid of 16x16 tiles).
pnpm pxc project:init -n asset-tileset-demo --path . -o silent
pnpm pxc canvas:create -n "$C" -w 32 -h 32 -p "$P" -o silent

# 2. Paint four distinct 16x16 quadrants so each tile is unique.
pnpm pxc draw:rect -c "$C" --x 0  --y 0  --width 16 --height 16 --color "#ff6040" --fill -p "$P" -o silent
pnpm pxc draw:rect -c "$C" --x 16 --y 0  --width 16 --height 16 --color "#40ff60" --fill -p "$P" -o silent
pnpm pxc draw:rect -c "$C" --x 0  --y 16 --width 16 --height 16 --color "#4060ff" --fill -p "$P" -o silent
pnpm pxc draw:rect -c "$C" --x 16 --y 16 --width 16 --height 16 --color "#ffc040" --fill -p "$P" -o silent

# 3. Initialize a tileset asset spec targeting Godot.
pnpm pxc asset:init -n "$A" -c "$C" --type tileset --tile-size 16x16 --engine godot -p "$P"

# 4. List specs (character-spritesheet and tileset share the command surface).
echo ""
echo "=== asset:list ==="
pnpm pxc asset:list --details -p "$P"

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
echo "Open $P/exports/$A/${A}.tres in Godot 4 to import the TileSet."
