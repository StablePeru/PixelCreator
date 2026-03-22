#!/usr/bin/env bash
set -e

# Forest Asset Pack — "Bosque Encantado"
# Script que genera un paquete completo de pixel art usando PixelCreator CLI

PXC="pnpm pxc"
P="-p ./forest-pack.pxc"

echo "=== PASO 1: Proyecto + Paleta ==="

$PXC project:init --name forest-pack

$PXC palette:create --name forest-colors \
  --colors "#0a1e0a,#1a3a1a,#2d5a1e,#4a8c28,#6ebe3a,#a4de6a,#3e2415,#5c3a1e,#8b6438,#6b6b6b,#9e9e9e,#c8c8c8,#e84040,#f0c040,#87ceeb,#1a1a2e" \
  $P

echo "=== PASO 2: Ranger (16x16, 4 frames walk) ==="

$PXC canvas:create --name ranger --width 16 --height 16 $P

# --- FRAME 1 (frame-001) - Pose parado ---
# Sombrero
$PXC draw:rect --canvas ranger --x 5 --y 1 --width 6 --height 2 --color "#5c3a1e" --fill $P
# Cabeza
$PXC draw:rect --canvas ranger --x 6 --y 3 --width 4 --height 3 --color "#d4a574" --fill $P
# Ojos
$PXC draw:pixel --canvas ranger --x 7 --y 4 --color "#1a1a2e" $P
$PXC draw:pixel --canvas ranger --x 9 --y 4 --color "#1a1a2e" $P
# Cuerpo (túnica verde)
$PXC draw:rect --canvas ranger --x 5 --y 6 --width 6 --height 4 --color "#2d5a1e" --fill $P
# Cinturón
$PXC draw:line --canvas ranger --x1 5 --y1 9 --x2 10 --y2 9 --color "#5c3a1e" $P
# Pierna izquierda
$PXC draw:rect --canvas ranger --x 6 --y 10 --width 2 --height 4 --color "#3e2415" --fill $P
# Pierna derecha
$PXC draw:rect --canvas ranger --x 8 --y 10 --width 2 --height 4 --color "#3e2415" --fill $P
# Botas
$PXC draw:pixel --canvas ranger --x 6 --y 13 --color "#1a1a2e" $P
$PXC draw:pixel --canvas ranger --x 7 --y 13 --color "#1a1a2e" $P
$PXC draw:pixel --canvas ranger --x 8 --y 13 --color "#1a1a2e" $P
$PXC draw:pixel --canvas ranger --x 9 --y 13 --color "#1a1a2e" $P

# --- FRAME 2 (stride izquierda) ---
$PXC frame:add --canvas ranger --copy-from 0 $P
# Borrar piernas
$PXC draw:rect --canvas ranger --x 5 --y 10 --width 6 --height 5 --color "#00000000" --fill --frame frame-002 $P
# Pierna izquierda adelante
$PXC draw:rect --canvas ranger --x 5 --y 10 --width 2 --height 4 --color "#3e2415" --fill --frame frame-002 $P
# Pierna derecha atrás
$PXC draw:rect --canvas ranger --x 9 --y 10 --width 2 --height 3 --color "#3e2415" --fill --frame frame-002 $P
# Botas
$PXC draw:pixel --canvas ranger --x 5 --y 13 --color "#1a1a2e" --frame frame-002 $P
$PXC draw:pixel --canvas ranger --x 6 --y 13 --color "#1a1a2e" --frame frame-002 $P
$PXC draw:pixel --canvas ranger --x 9 --y 12 --color "#1a1a2e" --frame frame-002 $P
$PXC draw:pixel --canvas ranger --x 10 --y 12 --color "#1a1a2e" --frame frame-002 $P

# --- FRAME 3 (pies juntos centro) ---
$PXC frame:add --canvas ranger --copy-from 0 $P
# Borrar piernas
$PXC draw:rect --canvas ranger --x 5 --y 10 --width 6 --height 5 --color "#00000000" --fill --frame frame-003 $P
# Piernas juntas centradas
$PXC draw:rect --canvas ranger --x 7 --y 10 --width 2 --height 4 --color "#3e2415" --fill --frame frame-003 $P
# Botas
$PXC draw:pixel --canvas ranger --x 7 --y 13 --color "#1a1a2e" --frame frame-003 $P
$PXC draw:pixel --canvas ranger --x 8 --y 13 --color "#1a1a2e" --frame frame-003 $P

# --- FRAME 4 (stride derecha) ---
$PXC frame:add --canvas ranger --copy-from 0 $P
# Borrar piernas
$PXC draw:rect --canvas ranger --x 5 --y 10 --width 6 --height 5 --color "#00000000" --fill --frame frame-004 $P
# Pierna derecha adelante
$PXC draw:rect --canvas ranger --x 9 --y 10 --width 2 --height 4 --color "#3e2415" --fill --frame frame-004 $P
# Pierna izquierda atrás
$PXC draw:rect --canvas ranger --x 5 --y 10 --width 2 --height 3 --color "#3e2415" --fill --frame frame-004 $P
# Botas
$PXC draw:pixel --canvas ranger --x 9 --y 13 --color "#1a1a2e" --frame frame-004 $P
$PXC draw:pixel --canvas ranger --x 10 --y 13 --color "#1a1a2e" --frame frame-004 $P
$PXC draw:pixel --canvas ranger --x 5 --y 12 --color "#1a1a2e" --frame frame-004 $P
$PXC draw:pixel --canvas ranger --x 6 --y 12 --color "#1a1a2e" --frame frame-004 $P

# Animación
$PXC animation:create-tag --canvas ranger --name walk --from 0 --to 3 --direction forward $P
$PXC animation:set-timing --canvas ranger --tag walk --fps 6 $P

echo "=== PASO 3: Espíritu del Bosque (16x16, 4 frames float) ==="

$PXC canvas:create --name spirit --width 16 --height 16 $P

# --- FRAME 1 (frame-001) - Neutral ---
$PXC draw:circle --canvas spirit --cx 8 --cy 6 --radius 4 --color "#a4de6a" --fill $P
$PXC draw:circle --canvas spirit --cx 8 --cy 6 --radius 2 --color "#6ebe3a" --fill $P
$PXC draw:pixel --canvas spirit --x 7 --y 5 --color "#0a1e0a" $P
$PXC draw:pixel --canvas spirit --x 9 --y 5 --color "#0a1e0a" $P
$PXC draw:pixel --canvas spirit --x 8 --y 7 --color "#2d5a1e" $P
# Tentáculos
$PXC draw:line --canvas spirit --x1 6 --y1 10 --x2 6 --y2 13 --color "#a4de6a" $P
$PXC draw:line --canvas spirit --x1 8 --y1 10 --x2 8 --y2 14 --color "#a4de6a" $P
$PXC draw:line --canvas spirit --x1 10 --y1 10 --x2 10 --y2 13 --color "#a4de6a" $P
# Chispas
$PXC draw:pixel --canvas spirit --x 3 --y 3 --color "#a4de6a" $P
$PXC draw:pixel --canvas spirit --x 12 --y 4 --color "#a4de6a" $P
$PXC draw:pixel --canvas spirit --x 2 --y 8 --color "#6ebe3a" $P

# --- FRAME 2 - Flotar arriba ---
$PXC frame:add --canvas spirit $P
$PXC draw:circle --canvas spirit --cx 8 --cy 5 --radius 4 --color "#a4de6a" --fill --frame frame-002 $P
$PXC draw:circle --canvas spirit --cx 8 --cy 5 --radius 2 --color "#6ebe3a" --fill --frame frame-002 $P
$PXC draw:pixel --canvas spirit --x 7 --y 4 --color "#0a1e0a" --frame frame-002 $P
$PXC draw:pixel --canvas spirit --x 9 --y 4 --color "#0a1e0a" --frame frame-002 $P
$PXC draw:pixel --canvas spirit --x 8 --y 6 --color "#2d5a1e" --frame frame-002 $P
$PXC draw:line --canvas spirit --x1 6 --y1 9 --x2 5 --y2 12 --color "#a4de6a" --frame frame-002 $P
$PXC draw:line --canvas spirit --x1 8 --y1 9 --x2 8 --y2 13 --color "#a4de6a" --frame frame-002 $P
$PXC draw:line --canvas spirit --x1 10 --y1 9 --x2 11 --y2 12 --color "#a4de6a" --frame frame-002 $P
$PXC draw:pixel --canvas spirit --x 4 --y 2 --color "#a4de6a" --frame frame-002 $P
$PXC draw:pixel --canvas spirit --x 13 --y 3 --color "#a4de6a" --frame frame-002 $P
$PXC draw:pixel --canvas spirit --x 1 --y 7 --color "#6ebe3a" --frame frame-002 $P

# --- FRAME 3 - Neutral variante ---
$PXC frame:add --canvas spirit $P
$PXC draw:circle --canvas spirit --cx 8 --cy 6 --radius 4 --color "#a4de6a" --fill --frame frame-003 $P
$PXC draw:circle --canvas spirit --cx 8 --cy 6 --radius 2 --color "#6ebe3a" --fill --frame frame-003 $P
$PXC draw:pixel --canvas spirit --x 7 --y 5 --color "#0a1e0a" --frame frame-003 $P
$PXC draw:pixel --canvas spirit --x 9 --y 5 --color "#0a1e0a" --frame frame-003 $P
$PXC draw:pixel --canvas spirit --x 8 --y 7 --color "#2d5a1e" --frame frame-003 $P
$PXC draw:line --canvas spirit --x1 6 --y1 10 --x2 7 --y2 13 --color "#a4de6a" --frame frame-003 $P
$PXC draw:line --canvas spirit --x1 8 --y1 10 --x2 8 --y2 14 --color "#a4de6a" --frame frame-003 $P
$PXC draw:line --canvas spirit --x1 10 --y1 10 --x2 9 --y2 13 --color "#a4de6a" --frame frame-003 $P
$PXC draw:pixel --canvas spirit --x 13 --y 2 --color "#a4de6a" --frame frame-003 $P
$PXC draw:pixel --canvas spirit --x 2 --y 5 --color "#a4de6a" --frame frame-003 $P
$PXC draw:pixel --canvas spirit --x 14 --y 9 --color "#6ebe3a" --frame frame-003 $P

# --- FRAME 4 - Flotar abajo ---
$PXC frame:add --canvas spirit $P
$PXC draw:circle --canvas spirit --cx 8 --cy 7 --radius 4 --color "#a4de6a" --fill --frame frame-004 $P
$PXC draw:circle --canvas spirit --cx 8 --cy 7 --radius 2 --color "#6ebe3a" --fill --frame frame-004 $P
$PXC draw:pixel --canvas spirit --x 7 --y 6 --color "#0a1e0a" --frame frame-004 $P
$PXC draw:pixel --canvas spirit --x 9 --y 6 --color "#0a1e0a" --frame frame-004 $P
$PXC draw:pixel --canvas spirit --x 8 --y 8 --color "#2d5a1e" --frame frame-004 $P
$PXC draw:line --canvas spirit --x1 6 --y1 11 --x2 6 --y2 13 --color "#a4de6a" --frame frame-004 $P
$PXC draw:line --canvas spirit --x1 8 --y1 11 --x2 8 --y2 14 --color "#a4de6a" --frame frame-004 $P
$PXC draw:line --canvas spirit --x1 10 --y1 11 --x2 10 --y2 13 --color "#a4de6a" --frame frame-004 $P
$PXC draw:pixel --canvas spirit --x 3 --y 4 --color "#a4de6a" --frame frame-004 $P
$PXC draw:pixel --canvas spirit --x 11 --y 2 --color "#a4de6a" --frame frame-004 $P
$PXC draw:pixel --canvas spirit --x 1 --y 10 --color "#6ebe3a" --frame frame-004 $P

# Animación pingpong
$PXC animation:create-tag --canvas spirit --name float --from 0 --to 3 --direction pingpong $P
$PXC animation:set-timing --canvas spirit --tag float --fps 4 $P

echo "=== PASO 4a: Pino (16x32) ==="

$PXC canvas:create --name pine-tree --width 16 --height 32 $P

# Tronco
$PXC draw:rect --canvas pine-tree --x 6 --y 22 --width 4 --height 10 --color "#5c3a1e" --fill $P
$PXC draw:line --canvas pine-tree --x1 8 --y1 22 --x2 8 --y2 31 --color "#8b6438" $P
# Follaje (triángulos de abajo a arriba)
$PXC draw:polygon --canvas pine-tree --points "1,22 8,14 15,22" --color "#2d5a1e" --fill $P
$PXC draw:polygon --canvas pine-tree --points "2,18 8,10 14,18" --color "#4a8c28" --fill $P
$PXC draw:polygon --canvas pine-tree --points "3,14 8,6 13,14" --color "#6ebe3a" --fill $P
$PXC draw:polygon --canvas pine-tree --points "5,10 8,2 11,10" --color "#6ebe3a" --fill $P
# Acentos oscuros
$PXC draw:pixel --canvas pine-tree --x 4 --y 20 --color "#1a3a1a" $P
$PXC draw:pixel --canvas pine-tree --x 12 --y 20 --color "#1a3a1a" $P
$PXC draw:pixel --canvas pine-tree --x 5 --y 16 --color "#1a3a1a" $P
$PXC draw:pixel --canvas pine-tree --x 11 --y 16 --color "#1a3a1a" $P
# Highlights en puntas
$PXC draw:pixel --canvas pine-tree --x 8 --y 2 --color "#a4de6a" $P
$PXC draw:pixel --canvas pine-tree --x 8 --y 6 --color "#a4de6a" $P

echo "=== PASO 4b: Roble (24x24) ==="

$PXC canvas:create --name oak-tree --width 24 --height 24 $P

# Tronco
$PXC draw:rect --canvas oak-tree --x 10 --y 14 --width 4 --height 10 --color "#5c3a1e" --fill $P
$PXC draw:line --canvas oak-tree --x1 11 --y1 14 --x2 11 --y2 23 --color "#3e2415" $P
$PXC draw:line --canvas oak-tree --x1 12 --y1 15 --x2 12 --y2 23 --color "#8b6438" $P
# Raíces
$PXC draw:pixel --canvas oak-tree --x 9 --y 22 --color "#5c3a1e" $P
$PXC draw:pixel --canvas oak-tree --x 14 --y 22 --color "#5c3a1e" $P
$PXC draw:pixel --canvas oak-tree --x 8 --y 23 --color "#5c3a1e" $P
$PXC draw:pixel --canvas oak-tree --x 15 --y 23 --color "#5c3a1e" $P
# Copa (círculos superpuestos)
$PXC draw:circle --canvas oak-tree --cx 12 --cy 8 --radius 8 --color "#2d5a1e" --fill $P
$PXC draw:circle --canvas oak-tree --cx 9 --cy 5 --radius 3 --color "#4a8c28" --fill $P
$PXC draw:circle --canvas oak-tree --cx 14 --cy 6 --radius 3 --color "#4a8c28" --fill $P
$PXC draw:circle --canvas oak-tree --cx 12 --cy 10 --radius 3 --color "#4a8c28" --fill $P
# Highlights
$PXC draw:circle --canvas oak-tree --cx 10 --cy 4 --radius 1 --color "#6ebe3a" --fill $P
$PXC draw:circle --canvas oak-tree --cx 15 --cy 5 --radius 1 --color "#6ebe3a" --fill $P
# Sombra inferior
$PXC draw:pixel --canvas oak-tree --x 8 --y 14 --color "#0a1e0a" $P
$PXC draw:pixel --canvas oak-tree --x 9 --y 14 --color "#0a1e0a" $P
$PXC draw:pixel --canvas oak-tree --x 14 --y 14 --color "#0a1e0a" $P
$PXC draw:pixel --canvas oak-tree --x 15 --y 14 --color "#0a1e0a" $P

echo "=== PASO 4c: Arbusto (16x12) ==="

$PXC canvas:create --name bush --width 16 --height 12 $P

$PXC draw:ellipse --canvas bush --cx 8 --cy 7 --rx 7 --ry 4 --color "#2d5a1e" --fill $P
$PXC draw:circle --canvas bush --cx 5 --cy 5 --radius 2 --color "#4a8c28" --fill $P
$PXC draw:circle --canvas bush --cx 10 --cy 5 --radius 2 --color "#4a8c28" --fill $P
$PXC draw:circle --canvas bush --cx 8 --cy 4 --radius 2 --color "#6ebe3a" --fill $P
# Hojas brillantes
$PXC draw:pixel --canvas bush --x 4 --y 4 --color "#a4de6a" $P
$PXC draw:pixel --canvas bush --x 9 --y 3 --color "#a4de6a" $P
$PXC draw:pixel --canvas bush --x 12 --y 5 --color "#a4de6a" $P
# Sombra base
$PXC draw:line --canvas bush --x1 3 --y1 10 --x2 13 --y2 10 --color "#0a1e0a" $P

echo "=== PASO 4d: Roca (16x12) ==="

$PXC canvas:create --name rock --width 16 --height 12 $P

# Cuerpo principal
$PXC draw:polygon --canvas rock --points "2,11 1,7 4,3 10,2 14,4 15,8 13,11" --color "#9e9e9e" --fill $P
# Cara highlight (arriba-derecha)
$PXC draw:polygon --canvas rock --points "4,3 10,2 14,4 9,5" --color "#c8c8c8" --fill $P
# Cara sombra (abajo-izquierda)
$PXC draw:polygon --canvas rock --points "2,11 1,7 4,7 5,11" --color "#6b6b6b" --fill $P
# Grietas
$PXC draw:line --canvas rock --x1 7 --y1 4 --x2 8 --y2 8 --color "#6b6b6b" $P
$PXC draw:line --canvas rock --x1 11 --y1 5 --x2 10 --y2 9 --color "#6b6b6b" $P
# Musgo
$PXC draw:pixel --canvas rock --x 3 --y 9 --color "#2d5a1e" $P
$PXC draw:pixel --canvas rock --x 4 --y 10 --color "#2d5a1e" $P
$PXC draw:pixel --canvas rock --x 12 --y 10 --color "#4a8c28" $P

echo "=== PASO 4e: Flor (8x8) ==="

$PXC canvas:create --name flower --width 8 --height 8 $P

# Tallo
$PXC draw:line --canvas flower --x1 4 --y1 4 --x2 4 --y2 7 --color "#2d5a1e" $P
# Hojas
$PXC draw:pixel --canvas flower --x 3 --y 5 --color "#4a8c28" $P
$PXC draw:pixel --canvas flower --x 5 --y 6 --color "#4a8c28" $P
# Pétalos
$PXC draw:pixel --canvas flower --x 4 --y 1 --color "#e84040" $P
$PXC draw:pixel --canvas flower --x 3 --y 2 --color "#e84040" $P
$PXC draw:pixel --canvas flower --x 5 --y 2 --color "#e84040" $P
$PXC draw:pixel --canvas flower --x 3 --y 3 --color "#e84040" $P
$PXC draw:pixel --canvas flower --x 5 --y 3 --color "#e84040" $P
# Centro
$PXC draw:pixel --canvas flower --x 4 --y 2 --color "#f0c040" $P
$PXC draw:pixel --canvas flower --x 4 --y 3 --color "#f0c040" $P

echo "=== PASO 4f: Seta (8x10) ==="

$PXC canvas:create --name mushroom --width 8 --height 10 $P

# Tallo
$PXC draw:rect --canvas mushroom --x 3 --y 5 --width 2 --height 5 --color "#c8c8c8" --fill $P
$PXC draw:pixel --canvas mushroom --x 3 --y 6 --color "#9e9e9e" $P
$PXC draw:pixel --canvas mushroom --x 3 --y 7 --color "#9e9e9e" $P
$PXC draw:pixel --canvas mushroom --x 3 --y 8 --color "#9e9e9e" $P
# Sombrero rojo
$PXC draw:ellipse --canvas mushroom --cx 4 --cy 3 --rx 4 --ry 3 --color "#e84040" --fill $P
# Spots blancos
$PXC draw:pixel --canvas mushroom --x 2 --y 2 --color "#c8c8c8" $P
$PXC draw:pixel --canvas mushroom --x 5 --y 1 --color "#c8c8c8" $P
$PXC draw:pixel --canvas mushroom --x 4 --y 3 --color "#c8c8c8" $P
# Base sombrero
$PXC draw:line --canvas mushroom --x1 1 --y1 5 --x2 7 --y2 5 --color "#3e2415" $P
# Hierba base
$PXC draw:pixel --canvas mushroom --x 1 --y 9 --color "#2d5a1e" $P
$PXC draw:pixel --canvas mushroom --x 6 --y 9 --color "#4a8c28" $P

echo "=== PASO 5a: Bosque Día (128x64) ==="

$PXC canvas:create --name day-forest --width 128 --height 64 $P

# Capas adicionales
$PXC layer:add --canvas day-forest --name distant-trees $P
$PXC layer:add --canvas day-forest --name ground $P
$PXC layer:add --canvas day-forest --name details $P

# --- CIELO (layer-001 background) ---
$PXC draw:gradient --canvas day-forest --x1 0 --y1 0 --x2 0 --y2 63 --from "#5ba3d9" --to "#87ceeb" --layer layer-001 $P

# --- ÁRBOLES DISTANTES (layer-002) ---
$PXC draw:polygon --canvas day-forest --points "5,40 10,25 15,40" --color "#1a3a1a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "12,40 18,22 24,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "20,40 27,20 34,40" --color "#1a3a1a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "30,40 36,24 42,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "38,40 45,18 52,40" --color "#1a3a1a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "48,40 55,22 62,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "58,40 64,20 70,40" --color "#1a3a1a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "66,40 73,24 80,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "76,40 82,19 88,40" --color "#1a3a1a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "84,40 91,23 98,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "94,40 100,21 106,40" --color "#1a3a1a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "102,40 109,25 116,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas day-forest --points "112,40 119,22 126,40" --color "#1a3a1a" --fill --layer layer-002 $P

# --- SUELO (layer-003) ---
$PXC draw:rect --canvas day-forest --x 0 --y 40 --width 128 --height 24 --color "#2d5a1e" --fill --layer layer-003 $P
# Camino de tierra
$PXC draw:polygon --canvas day-forest --points "50,63 55,42 73,42 78,63" --color "#8b6438" --fill --layer layer-003 $P
# Bordes del camino
$PXC draw:line --canvas day-forest --x1 50 --y1 63 --x2 55 --y2 42 --color "#5c3a1e" --layer layer-003 $P
$PXC draw:line --canvas day-forest --x1 78 --y1 63 --x2 73 --y2 42 --color "#5c3a1e" --layer layer-003 $P

# --- DETALLES (layer-004) ---
# Hierba
$PXC draw:pixel --canvas day-forest --x 10 --y 45 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 11 --y 44 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 25 --y 50 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 26 --y 49 --color "#4a8c28" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 90 --y 47 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 91 --y 46 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 105 --y 52 --color "#4a8c28" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 106 --y 51 --color "#6ebe3a" --layer layer-004 $P
# Flores
$PXC draw:pixel --canvas day-forest --x 15 --y 48 --color "#e84040" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 40 --y 55 --color "#f0c040" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 95 --y 50 --color "#e84040" --layer layer-004 $P
$PXC draw:pixel --canvas day-forest --x 110 --y 58 --color "#f0c040" --layer layer-004 $P
# Rocas pequeñas
$PXC draw:rect --canvas day-forest --x 30 --y 53 --width 3 --height 2 --color "#9e9e9e" --fill --layer layer-004 $P
$PXC draw:rect --canvas day-forest --x 85 --y 56 --width 2 --height 2 --color "#6b6b6b" --fill --layer layer-004 $P
# Sol
$PXC draw:circle --canvas day-forest --cx 115 --cy 8 --radius 5 --color "#f0c040" --fill --layer layer-004 $P
$PXC draw:circle --canvas day-forest --cx 115 --cy 8 --radius 3 --color "#ffffff" --fill --layer layer-004 $P

echo "=== PASO 5b: Bosque Noche (128x64) ==="

$PXC canvas:create --name night-forest --width 128 --height 64 $P

$PXC layer:add --canvas night-forest --name distant-trees $P
$PXC layer:add --canvas night-forest --name ground $P
$PXC layer:add --canvas night-forest --name details $P

# --- CIELO NOCTURNO (layer-001) ---
$PXC draw:gradient --canvas night-forest --x1 0 --y1 0 --x2 0 --y2 63 --from "#0a0a1e" --to "#1a1a2e" --layer layer-001 $P
# Estrellas
$PXC draw:pixel --canvas night-forest --x 5 --y 3 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 15 --y 8 --color "#c8c8c8" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 28 --y 2 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 40 --y 12 --color "#c8c8c8" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 55 --y 5 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 70 --y 3 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 85 --y 10 --color "#c8c8c8" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 95 --y 6 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 110 --y 4 --color "#c8c8c8" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 120 --y 8 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 45 --y 15 --color "#ffffff" --layer layer-001 $P
$PXC draw:pixel --canvas night-forest --x 78 --y 7 --color "#ffffff" --layer layer-001 $P

# --- ÁRBOLES DISTANTES OSCUROS (layer-002) ---
$PXC draw:polygon --canvas night-forest --points "5,40 10,25 15,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "12,40 18,22 24,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "20,40 27,20 34,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "30,40 36,24 42,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "38,40 45,18 52,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "48,40 55,22 62,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "58,40 64,20 70,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "66,40 73,24 80,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "76,40 82,19 88,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "84,40 91,23 98,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "94,40 100,21 106,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "102,40 109,25 116,40" --color "#0a1e0a" --fill --layer layer-002 $P
$PXC draw:polygon --canvas night-forest --points "112,40 119,22 126,40" --color "#0a1e0a" --fill --layer layer-002 $P

# --- SUELO NOCTURNO (layer-003) ---
$PXC draw:rect --canvas night-forest --x 0 --y 40 --width 128 --height 24 --color "#0a1e0a" --fill --layer layer-003 $P
# Camino oscuro
$PXC draw:polygon --canvas night-forest --points "50,63 55,42 73,42 78,63" --color "#3e2415" --fill --layer layer-003 $P
$PXC draw:line --canvas night-forest --x1 50 --y1 63 --x2 55 --y2 42 --color "#3e2415" --layer layer-003 $P
$PXC draw:line --canvas night-forest --x1 78 --y1 63 --x2 73 --y2 42 --color "#3e2415" --layer layer-003 $P

# --- DETALLES NOCTURNOS (layer-004) ---
# Luna (crescent)
$PXC draw:circle --canvas night-forest --cx 20 --cy 10 --radius 6 --color "#f0c040" --fill --layer layer-004 $P
$PXC draw:circle --canvas night-forest --cx 20 --cy 10 --radius 4 --color "#ffffcc" --fill --layer layer-004 $P
$PXC draw:circle --canvas night-forest --cx 22 --cy 9 --radius 5 --color "#0a0a1e" --fill --layer layer-004 $P
# Luciérnagas
$PXC draw:pixel --canvas night-forest --x 10 --y 35 --color "#f0c040" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 25 --y 42 --color "#a4de6a" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 35 --y 38 --color "#f0c040" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 50 --y 45 --color "#a4de6a" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 80 --y 37 --color "#f0c040" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 100 --y 43 --color "#a4de6a" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 115 --y 39 --color "#f0c040" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 42 --y 50 --color "#a4de6a" --layer layer-004 $P
# Halos luciérnagas
$PXC draw:pixel --canvas night-forest --x 9 --y 35 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 11 --y 35 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 10 --y 34 --color "#6ebe3a" --layer layer-004 $P
$PXC draw:pixel --canvas night-forest --x 10 --y 36 --color "#6ebe3a" --layer layer-004 $P

echo "=== PASO 6: Exports ==="

# Crear directorios de export
mkdir -p ./forest-pack.pxc/exports/1x
mkdir -p ./forest-pack.pxc/exports/svg

# Personajes animados - GIF
$PXC export:gif --canvas ranger --dest ./forest-pack.pxc/exports/ranger-walk.gif --scale 4 --loop 0 $P
$PXC export:gif --canvas spirit --dest ./forest-pack.pxc/exports/spirit-float.gif --scale 4 --loop 0 $P

# Personajes - Spritesheets
$PXC export:spritesheet --canvas ranger --dest ./forest-pack.pxc/exports/ranger-spritesheet.png --layout horizontal --columns 4 $P
$PXC export:spritesheet --canvas spirit --dest ./forest-pack.pxc/exports/spirit-spritesheet.png --layout horizontal --columns 4 $P

# Personajes - HTML animado
$PXC export:html --canvas ranger --dest ./forest-pack.pxc/exports/ranger-preview.html --animated --scale 10 $P
$PXC export:html --canvas spirit --dest ./forest-pack.pxc/exports/spirit-preview.html --animated --scale 10 $P

# Objetos estáticos - PNG escalados
$PXC export:png --canvas pine-tree --dest ./forest-pack.pxc/exports/pine-tree.png --scale 4 $P
$PXC export:png --canvas oak-tree --dest ./forest-pack.pxc/exports/oak-tree.png --scale 4 $P
$PXC export:png --canvas bush --dest ./forest-pack.pxc/exports/bush.png --scale 4 $P
$PXC export:png --canvas rock --dest ./forest-pack.pxc/exports/rock.png --scale 4 $P
$PXC export:png --canvas flower --dest ./forest-pack.pxc/exports/flower.png --scale 8 $P
$PXC export:png --canvas mushroom --dest ./forest-pack.pxc/exports/mushroom.png --scale 8 $P

# Objetos - PNG tamaño original
$PXC export:png --canvas pine-tree --dest ./forest-pack.pxc/exports/1x/pine-tree.png $P
$PXC export:png --canvas oak-tree --dest ./forest-pack.pxc/exports/1x/oak-tree.png $P
$PXC export:png --canvas bush --dest ./forest-pack.pxc/exports/1x/bush.png $P
$PXC export:png --canvas rock --dest ./forest-pack.pxc/exports/1x/rock.png $P
$PXC export:png --canvas flower --dest ./forest-pack.pxc/exports/1x/flower.png $P
$PXC export:png --canvas mushroom --dest ./forest-pack.pxc/exports/1x/mushroom.png $P

# Fondos - PNG escalados
$PXC export:png --canvas day-forest --dest ./forest-pack.pxc/exports/day-forest.png --scale 2 $P
$PXC export:png --canvas night-forest --dest ./forest-pack.pxc/exports/night-forest.png --scale 2 $P

# Fondos - HTML
$PXC export:html --canvas day-forest --dest ./forest-pack.pxc/exports/day-forest.html --scale 8 $P
$PXC export:html --canvas night-forest --dest ./forest-pack.pxc/exports/night-forest.html --scale 8 $P

# SVGs
$PXC export:svg --canvas pine-tree --dest ./forest-pack.pxc/exports/svg/pine-tree.svg --scale 8 $P
$PXC export:svg --canvas oak-tree --dest ./forest-pack.pxc/exports/svg/oak-tree.svg --scale 8 $P
$PXC export:svg --canvas mushroom --dest ./forest-pack.pxc/exports/svg/mushroom.svg --scale 8 $P
$PXC export:svg --canvas flower --dest ./forest-pack.pxc/exports/svg/flower.svg --scale 8 $P

echo ""
echo "=== FOREST PACK COMPLETADO ==="
echo "Proyecto: ./forest-pack.pxc/"
echo "Exports en: ./forest-pack.pxc/exports/"
echo ""
echo "Archivos generados:"
ls -la ./forest-pack.pxc/exports/
echo ""
echo "Abre los HTML en el navegador para ver los previews interactivos."
echo "Abre los GIF en cualquier visor de imágenes para ver las animaciones."
