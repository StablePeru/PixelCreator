#!/bin/bash
# ============================================================================
# Forest Archer v2 — Circle/Ellipse Dogfooding
# 48x48 · 8 frames · idle(4) + walk(4) · 16-color earth/forest palette
# Uses circle + ellipse for head, hair, shoulders, belt buckle, boots
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

P="forest-archer-v2.pxc"
C="archer"
FRAMES_DIR="$(cd "$(dirname "$0")" && pwd)/frames"

echo "=== Forest Archer v2 — Circle/Ellipse Dogfooding ==="
echo "Working dir: $(pwd)"
echo ""

# ── 1. Create project ───────────────────────────────────────────────────────
echo "[1/8] Creating project..."
rm -rf "$P"
pnpm pxc project:init -n forest-archer-v2 --path . -o silent

# ── 2. Create palette ───────────────────────────────────────────────────────
echo "[2/8] Creating 16-color palette..."
pnpm pxc palette:create -n archer-pal \
  --colors "#c87533,#8b4513,#f5d0a9,#d4a574,#4a8c50,#2d5016,#6db86b,#6b4226,#3e2a1f,#c4a035,#5c4033,#2a1f14,#a0522d,#d4d4c0,#1a1a1a,#ffffff" \
  -p "$P" -o silent

# ── 3. Create canvas with 8 frames ──────────────────────────────────────────
echo "[3/8] Creating 48x48 canvas with 8 frames..."
pnpm pxc canvas:create -n "$C" -w 48 -h 48 --palette archer-pal -p "$P" -o silent
pnpm pxc frame:add -c "$C" --count 7 -p "$P" -o silent

# ── 4. Set frame timings ────────────────────────────────────────────────────
echo "[4/8] Setting frame timings..."
pnpm pxc animation:set-timing -c "$C" --range "0-3" -d 200 -p "$P" -o silent
pnpm pxc animation:set-timing -c "$C" --range "4-7" -d 150 -p "$P" -o silent

# ── 5. Draw all frames via batch + stdin ─────────────────────────────────────
echo "[5/8] Drawing 8 frames via draw:batch + stdin (circle/ellipse edition)..."
for i in $(seq 1 4); do
  FNUM=$(printf "%03d" "$i")
  echo "  Drawing idle-$i → frame-$FNUM"
  cat "$FRAMES_DIR/idle-$i.json" | pnpm pxc draw:batch -c "$C" --ops-file - -f "frame-$FNUM" -p "$P" -o silent
done
for i in $(seq 1 4); do
  FNUM=$(printf "%03d" "$((i + 4))")
  echo "  Drawing walk-$i → frame-$FNUM"
  cat "$FRAMES_DIR/walk-$i.json" | pnpm pxc draw:batch -c "$C" --ops-file - -f "frame-$FNUM" -p "$P" -o silent
done

# ── 6. Create animation tags ────────────────────────────────────────────────
echo "[6/8] Tagging animations..."
pnpm pxc animation:create-tag -c "$C" -n idle --from 0 --to 3 -p "$P" -o silent
pnpm pxc animation:create-tag -c "$C" -n walk --from 4 --to 7 -p "$P" -o silent

# ── 7. Export GIFs ───────────────────────────────────────────────────────────
echo "[7/8] Exporting GIFs..."
mkdir -p "$P/exports/forest-archer-v2"
pnpm pxc export:gif -c "$C" --dest "$P/exports/forest-archer-v2/archer-idle.gif" --tag idle --loop 0 -p "$P" -o silent
pnpm pxc export:gif -c "$C" --dest "$P/exports/forest-archer-v2/archer-walk.gif" --tag walk --loop 0 -p "$P" -o silent

# ── 8. Export spritesheet ────────────────────────────────────────────────────
echo "[8/8] Exporting spritesheet..."
pnpm pxc export:spritesheet -c "$C" --dest "$P/exports/forest-archer-v2/archer-spritesheet.png" --layout grid --columns 4 -p "$P" -o silent

echo ""
echo "=== Pipeline v2 complete ==="
echo "Exports in: $P/exports/forest-archer-v2/"
ls -la "$P/exports/forest-archer-v2/" 2>/dev/null || echo "(no exports dir yet)"
