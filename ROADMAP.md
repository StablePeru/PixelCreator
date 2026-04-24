# PixelCreator — Roadmap vivo

Cola de trabajo priorizada. **No es un log**: al completar un paso, se elimina — el historial vive en `git log` y `CHANGELOG.md`.

Orden = prioridad. Se trabaja el paso 1 hasta cerrarlo, luego se elimina y el siguiente pasa a ser el 1.

---

## 1. Iterar sobre el Validation GUI (Review mode)

El modo Review quedó entregado con el MVP: lista/crea/resuelve flags, preview read-only con selección de región, `pxc validation:*` completo, WebSocket `validation:updated`. Siguientes iteraciones naturales:

- Vista por capa aislada: endpoint `GET /api/canvas/:name/layer/:layerId/frame/:index` para inspeccionar una capa sin flatten.
- Filtros visibles en el panel (severity/category) y exportar el reporte a Markdown para PRs.
- Memoria `feedback_close-task.md` tras confirmar que el skill se dispara correctamente en sesiones reales.
