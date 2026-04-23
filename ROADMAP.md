# PixelCreator — Roadmap vivo

Cola de trabajo priorizada. **No es un log**: al completar un paso, se elimina — el historial vive en `git log` y `CHANGELOG.md`.

Orden = prioridad. Se trabaja el paso 1 hasta cerrarlo, luego se elimina y el siguiente pasa a ser el 1.

---

## 1. Segundo vertical slice: tileset asset pipeline

Valida la abstracción `asset-engine.ts` con un segundo tipo además de `character-spritesheet`. Reutiliza `tileset-engine.ts` + `autotile-engine.ts` existentes.

**Hecho cuando**: `pxc asset init --type tileset`, `asset:validate`, `asset:build` funcionan extremo a extremo. Export a Godot TileSet `.tres`. Spec en `.pxc/assets/{name}.asset.json`. Showcase con un tileset real.

---

## 2. Milestone M6 — Stardew Valley quality

M5 (brush sensible a presión) cerrado. M6 aún sin definir. Candidatos:
- Paleta dinámica por escena (day/night/season shift).
- Normal maps pixel-art para iluminación 2D.
- Tile blending suave entre biomas.
- Sistema de iluminación 2D baked.

**Antes de implementar**: abrir `/pxdk:plan` con el candidato elegido y confirmar con usuario.

---

## 3. Refrescar memorias tras release

Tras cortar beta.13, actualizar `project_status.md` y `project_asset_pipeline.md` con las métricas nuevas y el nuevo estado del asset pipeline.

**Hecho cuando**: ambas memorias reflejan cifras post-beta.13 y el cierre del slice character-spritesheet.

---

## 4. Iterar sobre el Validation GUI (Review mode)

El modo Review quedó entregado con el MVP: lista/crea/resuelve flags, preview read-only con selección de región, `pxc validation:*` completo, WebSocket `validation:updated`. Siguientes iteraciones naturales:

- Reporte consolidado más rico: integrar `validate:palette`, `validate:accessibility`, y `asset:validate` dentro de `pxc validation:report` y `GET /api/validation/report`.
- Vista por capa aislada: endpoint `GET /api/canvas/:name/layer/:layerId/frame/:index` para inspeccionar una capa sin flatten.
- Filtros visibles en el panel (severity/category) y exportar el reporte a Markdown para PRs.
- Memoria `feedback_close-task.md` tras confirmar que el skill se dispara correctamente en sesiones reales.
