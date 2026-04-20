# PixelCreator — Roadmap vivo

Cola de trabajo priorizada. **No es un log**: al completar un paso, se elimina — el historial vive en `git log` y `CHANGELOG.md`.

Orden = prioridad. Se trabaja el paso 1 hasta cerrarlo, luego se elimina y el siguiente pasa a ser el 1.

---

## 1. Cortar release `v2.0.0-beta.13`

El `[Unreleased]` del CHANGELOG acumula ~3 semanas: Studio redesign profesional, milestones Stardew M1–M5, asset pipeline (character-spritesheet), migración devkit a plugin versionado, mejoras CLI (`draw:batch`, `frame:clone`).

**Hecho cuando**:
- `pnpm -r build && pnpm -r test && pnpm -r lint` verdes.
- `CHANGELOG.md` `[Unreleased]` → `[2.0.0-beta.13]` con fecha.
- `CLAUDE.md` "Current Status" actualizado (engines, topics, tests, endpoints).
- Bump de versión en los 3 `packages/*/package.json`.
- Tag `v2.0.0-beta.13` creado y pusheado.

Usar `/pxdk:release` si aplica.

---

## 2. Cerrar pendientes del asset pipeline (slice character-spritesheet)

Completar el primer vertical slice antes de abrir el segundo. Fuentes: memoria `project_asset_pipeline.md` y `packages/cli/src/commands/asset/`.

**Subpasos**:
- `asset:list` — listar specs en `.pxc/assets/`.
- Enforcement de `maxColors` en `asset:build` (validación + error claro si se excede).
- Modo watch: `asset:build --watch` que reconstruye al cambiar la spec.

**Hecho cuando**: 3 comandos funcionando, tests en `packages/cli/test/`, ejemplo en `showcase/`.

---

## 3. Segundo vertical slice: tileset asset pipeline

Valida la abstracción `asset-engine.ts` con un segundo tipo además de `character-spritesheet`. Reutiliza `tileset-engine.ts` + `autotile-engine.ts` existentes.

**Hecho cuando**: `pxc asset init --type tileset`, `asset:validate`, `asset:build` funcionan extremo a extremo. Export a Godot TileSet `.tres`. Spec en `.pxc/assets/{name}.asset.json`. Showcase con un tileset real.

---

## 4. Milestone M6 — Stardew Valley quality

M5 (brush sensible a presión) cerrado. M6 aún sin definir. Candidatos:
- Paleta dinámica por escena (day/night/season shift).
- Normal maps pixel-art para iluminación 2D.
- Tile blending suave entre biomas.
- Sistema de iluminación 2D baked.

**Antes de implementar**: abrir `/pxdk:plan` con el candidato elegido y confirmar con usuario.

---

## 5. Refrescar memorias tras release

Tras cortar beta.13, actualizar `project_status.md` y `project_asset_pipeline.md` con las métricas nuevas y el nuevo estado del asset pipeline.

**Hecho cuando**: ambas memorias reflejan cifras post-beta.13 y el cierre del slice character-spritesheet.
