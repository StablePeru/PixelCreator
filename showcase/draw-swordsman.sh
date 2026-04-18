#!/bin/bash
# Hooded Swordsman - 48x48 character sprite
# Showcase asset for PixelCreator
# 12 frames: idle(0-3), walk(4-7), attack(8-11)

P="hooded-swordsman.pxc"
C="swordsman"

# Color palette
DARK1="#1a1a2e"
DARK2="#16213e"
BLUE="#0f3460"
RED="#e94560"
DKRED="#b8001f"
SKIN="#f5e6ca"
SKINDK="#d4a574"
BROWN="#8b6914"
BLACK="#1a1a1a"
GRAY1="#333333"
GRAY2="#666666"
GRAY3="#999999"
GRAY4="#cccccc"
WHITE="#ffffff"

dr() {
  pnpm pxc draw:rect -c $C --x $1 --y $2 -w $3 -h $4 --color "$5" --fill -f $6 -p $P -o silent 2>/dev/null
}
dp() {
  pnpm pxc draw:pixel -c $C --x $1 --y $2 --color "$3" -f $4 -p $P -o silent 2>/dev/null
}
dl() {
  pnpm pxc draw:line -c $C --x1 $1 --y1 $2 --x2 $3 --y2 $4 --color "$5" -f $6 -p $P -o silent 2>/dev/null
}

echo "=== Drawing Hooded Swordsman ==="

# === FRAME 1 (idle-1): Base standing pose ===
F="frame-001"
echo "Drawing $F (idle-1)..."
dr 21 8 6 2 "$DARK1" $F
dr 19 10 10 2 "$DARK1" $F
dr 18 12 12 4 "$DARK2" $F
dr 20 12 8 2 "$BLUE" $F
dr 21 16 6 3 "$SKIN" $F
dr 21 18 6 1 "$SKINDK" $F
dp 22 17 "$BLACK" $F
dp 25 17 "$BLACK" $F
dp 22 16 "$WHITE" $F
dp 25 16 "$WHITE" $F
dr 19 19 10 3 "$RED" $F
dr 19 21 4 1 "$DKRED" $F
dr 17 20 2 4 "$RED" $F
dr 17 23 1 2 "$DKRED" $F
dr 19 22 10 10 "$DARK2" $F
dr 22 22 4 10 "$DARK1" $F
dr 20 23 2 6 "$BLUE" $F
dr 19 30 10 2 "$BROWN" $F
dp 24 30 "$GRAY4" $F
dp 24 31 "$GRAY4" $F
dr 20 32 4 8 "$DARK1" $F
dr 24 32 4 8 "$DARK1" $F
dr 23 32 2 8 "$BLACK" $F
dr 19 40 5 4 "$GRAY1" $F
dr 24 40 5 4 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 24 43 5 1 "$BLACK" $F
dp 20 40 "$GRAY2" $F
dp 25 40 "$GRAY2" $F
dr 30 28 2 4 "$BROWN" $F
dr 29 27 4 1 "$GRAY3" $F
dr 30 14 2 13 "$GRAY2" $F
dl 31 14 31 26 "$GRAY4" $F
dp 30 32 "$GRAY3" $F
dp 31 32 "$GRAY3" $F
echo "  done"

# === FRAME 2 (idle-2): Breath down 1px ===
F="frame-002"
echo "Drawing $F (idle-2)..."
dr 21 8 6 2 "$DARK1" $F
dr 19 10 10 2 "$DARK1" $F
dr 18 12 12 4 "$DARK2" $F
dr 20 12 8 2 "$BLUE" $F
dr 21 16 6 3 "$SKIN" $F
dr 21 18 6 1 "$SKINDK" $F
dp 22 17 "$BLACK" $F
dp 25 17 "$BLACK" $F
dp 22 16 "$WHITE" $F
dp 25 16 "$WHITE" $F
dr 19 20 10 3 "$RED" $F
dr 19 22 4 1 "$DKRED" $F
dr 17 21 2 4 "$RED" $F
dr 17 24 1 2 "$DKRED" $F
dr 19 23 10 10 "$DARK2" $F
dr 22 23 4 10 "$DARK1" $F
dr 20 24 2 6 "$BLUE" $F
dr 19 31 10 2 "$BROWN" $F
dp 24 31 "$GRAY4" $F
dp 24 32 "$GRAY4" $F
dr 20 33 4 8 "$DARK1" $F
dr 24 33 4 8 "$DARK1" $F
dr 23 33 2 8 "$BLACK" $F
dr 19 41 5 3 "$GRAY1" $F
dr 24 41 5 3 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 24 43 5 1 "$BLACK" $F
dp 20 41 "$GRAY2" $F
dp 25 41 "$GRAY2" $F
dr 30 29 2 4 "$BROWN" $F
dr 29 28 4 1 "$GRAY3" $F
dr 30 15 2 13 "$GRAY2" $F
dl 31 15 31 27 "$GRAY4" $F
dp 30 33 "$GRAY3" $F
dp 31 33 "$GRAY3" $F
echo "  done"

# === FRAME 3 (idle-3): Same as 1 ===
F="frame-003"
echo "Drawing $F (idle-3)..."
dr 21 8 6 2 "$DARK1" $F
dr 19 10 10 2 "$DARK1" $F
dr 18 12 12 4 "$DARK2" $F
dr 20 12 8 2 "$BLUE" $F
dr 21 16 6 3 "$SKIN" $F
dr 21 18 6 1 "$SKINDK" $F
dp 22 17 "$BLACK" $F
dp 25 17 "$BLACK" $F
dp 22 16 "$WHITE" $F
dp 25 16 "$WHITE" $F
dr 19 19 10 3 "$RED" $F
dr 19 21 4 1 "$DKRED" $F
dr 17 20 2 4 "$RED" $F
dr 17 23 1 2 "$DKRED" $F
dr 19 22 10 10 "$DARK2" $F
dr 22 22 4 10 "$DARK1" $F
dr 20 23 2 6 "$BLUE" $F
dr 19 30 10 2 "$BROWN" $F
dp 24 30 "$GRAY4" $F
dp 24 31 "$GRAY4" $F
dr 20 32 4 8 "$DARK1" $F
dr 24 32 4 8 "$DARK1" $F
dr 23 32 2 8 "$BLACK" $F
dr 19 40 5 4 "$GRAY1" $F
dr 24 40 5 4 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 24 43 5 1 "$BLACK" $F
dp 20 40 "$GRAY2" $F
dp 25 40 "$GRAY2" $F
dr 30 28 2 4 "$BROWN" $F
dr 29 27 4 1 "$GRAY3" $F
dr 30 14 2 13 "$GRAY2" $F
dl 31 14 31 26 "$GRAY4" $F
dp 30 32 "$GRAY3" $F
dp 31 32 "$GRAY3" $F
echo "  done"

# === FRAME 4 (idle-4): Same as 2 ===
F="frame-004"
echo "Drawing $F (idle-4)..."
dr 21 8 6 2 "$DARK1" $F
dr 19 10 10 2 "$DARK1" $F
dr 18 12 12 4 "$DARK2" $F
dr 20 12 8 2 "$BLUE" $F
dr 21 16 6 3 "$SKIN" $F
dr 21 18 6 1 "$SKINDK" $F
dp 22 17 "$BLACK" $F
dp 25 17 "$BLACK" $F
dp 22 16 "$WHITE" $F
dp 25 16 "$WHITE" $F
dr 19 20 10 3 "$RED" $F
dr 19 22 4 1 "$DKRED" $F
dr 17 21 2 4 "$RED" $F
dr 17 24 1 2 "$DKRED" $F
dr 19 23 10 10 "$DARK2" $F
dr 22 23 4 10 "$DARK1" $F
dr 20 24 2 6 "$BLUE" $F
dr 19 31 10 2 "$BROWN" $F
dp 24 31 "$GRAY4" $F
dp 24 32 "$GRAY4" $F
dr 20 33 4 8 "$DARK1" $F
dr 24 33 4 8 "$DARK1" $F
dr 23 33 2 8 "$BLACK" $F
dr 19 41 5 3 "$GRAY1" $F
dr 24 41 5 3 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 24 43 5 1 "$BLACK" $F
dp 20 41 "$GRAY2" $F
dp 25 41 "$GRAY2" $F
dr 30 29 2 4 "$BROWN" $F
dr 29 28 4 1 "$GRAY3" $F
dr 30 15 2 13 "$GRAY2" $F
dl 31 15 31 27 "$GRAY4" $F
dp 30 33 "$GRAY3" $F
dp 31 33 "$GRAY3" $F
echo "  done"

# === FRAME 5 (walk-1): Right foot forward ===
F="frame-005"
echo "Drawing $F (walk-1)..."
dr 22 8 6 2 "$DARK1" $F
dr 20 10 10 2 "$DARK1" $F
dr 19 12 12 4 "$DARK2" $F
dr 21 12 8 2 "$BLUE" $F
dr 22 16 6 3 "$SKIN" $F
dr 22 18 6 1 "$SKINDK" $F
dp 23 17 "$BLACK" $F
dp 26 17 "$BLACK" $F
dp 23 16 "$WHITE" $F
dp 26 16 "$WHITE" $F
dr 20 19 10 3 "$RED" $F
dr 20 21 4 1 "$DKRED" $F
dr 18 20 2 5 "$RED" $F
dr 18 24 1 2 "$DKRED" $F
dr 20 22 10 10 "$DARK2" $F
dr 23 22 4 10 "$DARK1" $F
dr 21 23 2 6 "$BLUE" $F
dr 20 30 10 2 "$BROWN" $F
dp 25 30 "$GRAY4" $F
dr 25 32 4 10 "$DARK1" $F
dr 20 32 4 8 "$DARK1" $F
dr 25 42 5 2 "$GRAY1" $F
dr 25 43 5 1 "$BLACK" $F
dr 19 40 5 4 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 31 28 2 4 "$BROWN" $F
dr 30 27 4 1 "$GRAY3" $F
dr 31 14 2 13 "$GRAY2" $F
dl 32 14 32 26 "$GRAY4" $F
echo "  done"

# === FRAME 6 (walk-2): Contact/passing ===
F="frame-006"
echo "Drawing $F (walk-2)..."
dr 22 7 6 2 "$DARK1" $F
dr 20 9 10 2 "$DARK1" $F
dr 19 11 12 4 "$DARK2" $F
dr 21 11 8 2 "$BLUE" $F
dr 22 15 6 3 "$SKIN" $F
dr 22 17 6 1 "$SKINDK" $F
dp 23 16 "$BLACK" $F
dp 26 16 "$BLACK" $F
dp 23 15 "$WHITE" $F
dp 26 15 "$WHITE" $F
dr 20 18 10 3 "$RED" $F
dr 20 20 4 1 "$DKRED" $F
dr 17 19 2 4 "$RED" $F
dr 17 22 1 2 "$DKRED" $F
dr 20 21 10 10 "$DARK2" $F
dr 23 21 4 10 "$DARK1" $F
dr 21 22 2 6 "$BLUE" $F
dr 20 29 10 2 "$BROWN" $F
dp 25 29 "$GRAY4" $F
dr 21 31 6 9 "$DARK1" $F
dr 23 31 2 9 "$BLACK" $F
dr 20 40 8 4 "$GRAY1" $F
dr 20 43 8 1 "$BLACK" $F
dr 31 27 2 4 "$BROWN" $F
dr 30 26 4 1 "$GRAY3" $F
dr 31 13 2 13 "$GRAY2" $F
dl 32 13 32 25 "$GRAY4" $F
echo "  done"

# === FRAME 7 (walk-3): Left foot forward ===
F="frame-007"
echo "Drawing $F (walk-3)..."
dr 22 8 6 2 "$DARK1" $F
dr 20 10 10 2 "$DARK1" $F
dr 19 12 12 4 "$DARK2" $F
dr 21 12 8 2 "$BLUE" $F
dr 22 16 6 3 "$SKIN" $F
dr 22 18 6 1 "$SKINDK" $F
dp 23 17 "$BLACK" $F
dp 26 17 "$BLACK" $F
dp 23 16 "$WHITE" $F
dp 26 16 "$WHITE" $F
dr 20 19 10 3 "$RED" $F
dr 26 21 4 1 "$DKRED" $F
dr 29 20 2 4 "$RED" $F
dr 30 23 1 2 "$DKRED" $F
dr 20 22 10 10 "$DARK2" $F
dr 23 22 4 10 "$DARK1" $F
dr 21 23 2 6 "$BLUE" $F
dr 20 30 10 2 "$BROWN" $F
dp 25 30 "$GRAY4" $F
dr 20 32 4 10 "$DARK1" $F
dr 25 32 4 8 "$DARK1" $F
dr 19 42 5 2 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 25 40 5 4 "$GRAY1" $F
dr 25 43 5 1 "$BLACK" $F
dr 31 28 2 4 "$BROWN" $F
dr 30 27 4 1 "$GRAY3" $F
dr 31 14 2 13 "$GRAY2" $F
dl 32 14 32 26 "$GRAY4" $F
echo "  done"

# === FRAME 8 (walk-4): Contact/passing (same as 6) ===
F="frame-008"
echo "Drawing $F (walk-4)..."
dr 22 7 6 2 "$DARK1" $F
dr 20 9 10 2 "$DARK1" $F
dr 19 11 12 4 "$DARK2" $F
dr 21 11 8 2 "$BLUE" $F
dr 22 15 6 3 "$SKIN" $F
dr 22 17 6 1 "$SKINDK" $F
dp 23 16 "$BLACK" $F
dp 26 16 "$BLACK" $F
dp 23 15 "$WHITE" $F
dp 26 15 "$WHITE" $F
dr 20 18 10 3 "$RED" $F
dr 20 20 4 1 "$DKRED" $F
dr 17 19 2 4 "$RED" $F
dr 17 22 1 2 "$DKRED" $F
dr 20 21 10 10 "$DARK2" $F
dr 23 21 4 10 "$DARK1" $F
dr 21 22 2 6 "$BLUE" $F
dr 20 29 10 2 "$BROWN" $F
dp 25 29 "$GRAY4" $F
dr 21 31 6 9 "$DARK1" $F
dr 23 31 2 9 "$BLACK" $F
dr 20 40 8 4 "$GRAY1" $F
dr 20 43 8 1 "$BLACK" $F
dr 31 27 2 4 "$BROWN" $F
dr 30 26 4 1 "$GRAY3" $F
dr 31 13 2 13 "$GRAY2" $F
dl 32 13 32 25 "$GRAY4" $F
echo "  done"

# === FRAME 9 (attack-1): Wind-up ===
F="frame-009"
echo "Drawing $F (attack-1)..."
dr 20 9 6 2 "$DARK1" $F
dr 18 11 10 2 "$DARK1" $F
dr 17 13 12 4 "$DARK2" $F
dr 19 13 8 2 "$BLUE" $F
dr 20 17 6 3 "$SKIN" $F
dr 20 19 6 1 "$SKINDK" $F
dp 21 18 "$BLACK" $F
dp 24 18 "$BLACK" $F
dp 21 17 "$WHITE" $F
dp 24 17 "$WHITE" $F
dr 18 20 10 3 "$RED" $F
dr 18 22 4 1 "$DKRED" $F
dr 16 21 2 4 "$RED" $F
dr 18 23 10 10 "$DARK2" $F
dr 21 23 4 10 "$DARK1" $F
dr 19 24 2 6 "$BLUE" $F
dr 18 31 10 2 "$BROWN" $F
dp 23 31 "$GRAY4" $F
dr 18 33 4 8 "$DARK1" $F
dr 25 33 4 8 "$DARK1" $F
dr 17 41 5 3 "$GRAY1" $F
dr 25 41 5 3 "$GRAY1" $F
dr 17 43 5 1 "$BLACK" $F
dr 25 43 5 1 "$BLACK" $F
dr 14 5 2 10 "$GRAY2" $F
dl 15 5 15 14 "$GRAY4" $F
dr 14 15 4 1 "$GRAY3" $F
dr 15 16 2 4 "$BROWN" $F
echo "  done"

# === FRAME 10 (attack-2): Swing mid ===
F="frame-010"
echo "Drawing $F (attack-2)..."
dr 23 8 6 2 "$DARK1" $F
dr 21 10 10 2 "$DARK1" $F
dr 20 12 12 4 "$DARK2" $F
dr 22 12 8 2 "$BLUE" $F
dr 23 16 6 3 "$SKIN" $F
dr 23 18 6 1 "$SKINDK" $F
dp 24 17 "$BLACK" $F
dp 27 17 "$BLACK" $F
dp 24 16 "$WHITE" $F
dp 27 16 "$WHITE" $F
dr 21 19 10 3 "$RED" $F
dr 15 20 6 2 "$RED" $F
dr 13 21 3 1 "$DKRED" $F
dr 21 22 10 10 "$DARK2" $F
dr 24 22 4 10 "$DARK1" $F
dr 22 23 2 6 "$BLUE" $F
dr 21 30 10 2 "$BROWN" $F
dp 26 30 "$GRAY4" $F
dr 20 32 4 9 "$DARK1" $F
dr 26 32 4 9 "$DARK1" $F
dr 19 41 5 3 "$GRAY1" $F
dr 26 41 5 3 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 26 43 5 1 "$BLACK" $F
dr 29 20 14 2 "$GRAY2" $F
dl 29 19 42 19 "$GRAY4" $F
dr 28 19 1 4 "$GRAY3" $F
dr 27 20 1 2 "$BROWN" $F
echo "  done"

# === FRAME 11 (attack-3): Follow-through ===
F="frame-011"
echo "Drawing $F (attack-3)..."
dr 24 9 6 2 "$DARK1" $F
dr 22 11 10 2 "$DARK1" $F
dr 21 13 12 4 "$DARK2" $F
dr 23 13 8 2 "$BLUE" $F
dr 24 17 6 3 "$SKIN" $F
dr 24 19 6 1 "$SKINDK" $F
dp 25 18 "$BLACK" $F
dp 28 18 "$BLACK" $F
dp 25 17 "$WHITE" $F
dp 28 17 "$WHITE" $F
dr 22 20 10 3 "$RED" $F
dr 16 21 6 2 "$RED" $F
dr 14 22 3 1 "$DKRED" $F
dr 22 23 10 10 "$DARK2" $F
dr 25 23 4 10 "$DARK1" $F
dr 23 24 2 6 "$BLUE" $F
dr 22 31 10 2 "$BROWN" $F
dp 27 31 "$GRAY4" $F
dr 22 33 4 8 "$DARK1" $F
dr 27 33 4 8 "$DARK1" $F
dr 21 41 5 3 "$GRAY1" $F
dr 27 41 5 3 "$GRAY1" $F
dr 21 43 5 1 "$BLACK" $F
dr 27 43 5 1 "$BLACK" $F
dl 33 22 40 36 "$GRAY2" $F
dl 34 22 41 36 "$GRAY4" $F
dr 32 20 2 3 "$GRAY3" $F
dr 31 21 1 2 "$BROWN" $F
echo "  done"

# === FRAME 12 (attack-4): Recovery ===
F="frame-012"
echo "Drawing $F (attack-4)..."
dr 22 8 6 2 "$DARK1" $F
dr 20 10 10 2 "$DARK1" $F
dr 19 12 12 4 "$DARK2" $F
dr 21 12 8 2 "$BLUE" $F
dr 22 16 6 3 "$SKIN" $F
dr 22 18 6 1 "$SKINDK" $F
dp 23 17 "$BLACK" $F
dp 26 17 "$BLACK" $F
dp 23 16 "$WHITE" $F
dp 26 16 "$WHITE" $F
dr 20 19 10 3 "$RED" $F
dr 20 21 4 1 "$DKRED" $F
dr 17 20 2 4 "$RED" $F
dr 17 23 1 2 "$DKRED" $F
dr 20 22 10 10 "$DARK2" $F
dr 23 22 4 10 "$DARK1" $F
dr 21 23 2 6 "$BLUE" $F
dr 20 30 10 2 "$BROWN" $F
dp 25 30 "$GRAY4" $F
dr 20 32 4 8 "$DARK1" $F
dr 25 32 4 8 "$DARK1" $F
dr 23 32 2 8 "$BLACK" $F
dr 19 40 5 4 "$GRAY1" $F
dr 25 40 5 4 "$GRAY1" $F
dr 19 43 5 1 "$BLACK" $F
dr 25 43 5 1 "$BLACK" $F
dr 32 24 2 10 "$GRAY2" $F
dl 33 24 33 33 "$GRAY4" $F
dr 31 34 4 1 "$GRAY3" $F
dr 32 35 2 3 "$BROWN" $F
echo "  done"

echo ""
echo "=== All 12 frames drawn ==="
