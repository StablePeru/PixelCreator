# PixelCreator — Roadmap vivo

Cola de trabajo priorizada. **No es un log**: al completar un paso, se elimina — el historial vive en `git log` y `CHANGELOG.md`.

Orden = prioridad. Se trabaja el paso 1 hasta cerrarlo, luego se elimina y el siguiente pasa a ser el 1.

---

## 1. M6.1 — Biome blending: alpha-mask mode + Studio UI

Tras cerrar el MVP dither-only de M6:
- Añadir `blend.mode = 'alpha-mask'` al `terrain-blend-engine` con kernel suave y respetar `maxColors` (hint `palette:generate` si se excede).
- Studio: panel read-only de preview del atlas generado bajo un tab/vista en el modo Editor (o Review si encaja mejor). Decidir ubicación al arrancar.

---

## 2. Iterar sobre el Validation GUI (Review mode)

El modo Review quedó entregado con el MVP: lista/crea/resuelve flags, preview read-only con selección de región, `pxc validation:*` completo, WebSocket `validation:updated`. Siguientes iteraciones naturales:

- Reporte consolidado más rico: integrar `validate:palette`, `validate:accessibility`, y `asset:validate` dentro de `pxc validation:report` y `GET /api/validation/report`.
- Vista por capa aislada: endpoint `GET /api/canvas/:name/layer/:layerId/frame/:index` para inspeccionar una capa sin flatten.
- Filtros visibles en el panel (severity/category) y exportar el reporte a Markdown para PRs.
- Memoria `feedback_close-task.md` tras confirmar que el skill se dispara correctamente en sesiones reales.
