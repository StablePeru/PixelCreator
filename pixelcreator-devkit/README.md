# pixelcreator-devkit

Plugin interno de Claude Code para el monorepo **PixelCreator**. Expone skills, subagents, hooks y una configuración MCP diseñados para dos vertientes:

- **Dev workflow** — implementar features, arreglar bugs y refactorizar `@pixelcreator/core`, `@pixelcreator/cli` y `@pixelcreator/studio`.
- **Artist workflow** — usar `pxc` (CLI) como motor para crear arte píxel asistido por Claude (escenas, sprite-sheets, animaciones, paletas).

## Contenido

```
pixelcreator-devkit/
├── .claude-plugin/plugin.json       # metadata, versionado semver
├── .mcp.json                        # MCP: git + filesystem
├── hooks/                           # hooks.json + 4 scripts bash
├── skills/                          # 19 skills (11 migrados + 4 dev + 4 artist)
├── agents/                          # 4 subagents de dominio
└── rules/                           # convenciones (coding-style, testing, security, patterns…)
```

## Cómo se activa

El plugin se activa automáticamente vía `.claude/settings.json` en la raíz del repo (`plugins.pixelcreator-devkit`). No requiere instalación global.

## Skills principales

**Dev**: `plan`, `tdd`, `verify`, `code-review`, `ts-review`, `security-review`, `architect`, `build-fix`, `e2e`, `update-codemaps`, `update-docs`, `engine-new`, `cli-command-new`, `studio-route-new`, `release`.

**Artist**: `pixel-scene`, `sprite-sheet`, `animate`, `palette-design`.

## Versionado

- `0.1.0` — initial release (migración desde `.claude/commands` legacy).

Cambios futuros: bump semver en `.claude-plugin/plugin.json`, anotar en `CHANGELOG.md`.
