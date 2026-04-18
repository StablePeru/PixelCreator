#!/bin/bash
# Hooded Swordsman - 48x48 character sprite (draw:batch version)
# Comparative dogfooding: same sprite, batch operations
# 12 frames: idle(1-4), walk(5-8), attack(9-12)
# Frames 3=1, 4=2, 8=6 (reuse same JSON)

P="hooded-swordsman-batch.pxc"
C="swordsman"
BATCH_DIR="$(cd "$(dirname "$0")" && pwd)"

batch() {
  pnpm pxc draw:batch -c $C --ops-file "$BATCH_DIR/$1" -f $2 -p $P -o silent 2>/dev/null
}

echo "=== Drawing Hooded Swordsman (batch mode) ==="

echo "Drawing frame-001 (idle-1)..."
batch frame-idle1.json frame-001
echo "  done"

echo "Drawing frame-002 (idle-2)..."
batch frame-idle2.json frame-002
echo "  done"

echo "Drawing frame-003 (idle-3 = idle-1)..."
batch frame-idle1.json frame-003
echo "  done"

echo "Drawing frame-004 (idle-4 = idle-2)..."
batch frame-idle2.json frame-004
echo "  done"

echo "Drawing frame-005 (walk-1)..."
batch frame-walk1.json frame-005
echo "  done"

echo "Drawing frame-006 (walk-2)..."
batch frame-walk2.json frame-006
echo "  done"

echo "Drawing frame-007 (walk-3)..."
batch frame-walk3.json frame-007
echo "  done"

echo "Drawing frame-008 (walk-4 = walk-2)..."
batch frame-walk2.json frame-008
echo "  done"

echo "Drawing frame-009 (attack-1)..."
batch frame-attack1.json frame-009
echo "  done"

echo "Drawing frame-010 (attack-2)..."
batch frame-attack2.json frame-010
echo "  done"

echo "Drawing frame-011 (attack-3)..."
batch frame-attack3.json frame-011
echo "  done"

echo "Drawing frame-012 (attack-4)..."
batch frame-attack4.json frame-012
echo "  done"

echo ""
echo "=== All 12 frames drawn (batch mode) ==="
