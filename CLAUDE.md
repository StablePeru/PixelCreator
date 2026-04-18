# PixelCreator — Development Guide

pnpm monorepo with 3 packages built around a shared pixel-art core:

- `packages/core/` (`@pixelcreator/core`) — 25 engines, 12 I/O modules, shared types.
- `packages/cli/` (`@pixelcreator/cli`) — 232 oclif commands across 23 topics, binary `pxc`.
- `packages/studio/` (`@pixelcreator/studio`) — Hono REST API (98+ endpoints) + React SPA + WebSocket.

Dependency chain: **core → cli / studio**. Full topology: `@pixelcreator-devkit/rules/architecture-reference.md`.

## Build & Test

| Command | What it does |
|---------|--------------|
| `pnpm -r build` | Build all packages (respects dep order) |
| `pnpm -r test` | Run all vitest suites |
| `pnpm -r lint` | Lint all packages |
| `pnpm --filter @pixelcreator/<core\|cli\|studio> test` | Per-package tests |
| `pnpm pxc <command>` | Run the CLI in dev mode (ts-node) |
| `cd packages/core && pnpm vitest run test/core/drawing-engine.test.ts` | Run a single test file |

## Conventions

- **ESM** with `.js` extensions in all imports.
- **Immutability** — return new objects via spread; never mutate input buffers/arrays.
- **CLI commands** extend `BaseCommand` (`packages/cli/src/commands/base-command.ts`).
- **Base flags**: `--project`, `--output` (text/json/silent), `--verbose`, `--dry-run`, `--no-color`.
- **Core imports** via `@pixelcreator/core` barrel (`packages/core/src/index.ts`).
- **Deterministic IDs** — `generateSequentialId(prefix, index)` (e.g., `layer-001`, `frame-001`).
- **Storage** — `canvases/{name}/layers/{layerId}/{frameId}.png`.
- **Test locations** — `packages/core/test/`, `packages/cli/test/`, `packages/studio/test/`.

## Claude Code workflow

This repo ships with the `pixelcreator-devkit` plugin (at `pixelcreator-devkit/`, v0.1.0), auto-enabled via `.claude/settings.json`. It provides:

- **Dev skills** — `/pxdk:plan`, `/pxdk:tdd`, `/pxdk:verify`, `/pxdk:code-review`, `/pxdk:ts-review`, `/pxdk:security-review`, `/pxdk:architect`, `/pxdk:build-fix`, `/pxdk:e2e`, `/pxdk:update-codemaps`, `/pxdk:update-docs`, `/pxdk:engine-new`, `/pxdk:cli-command-new`, `/pxdk:studio-route-new`, `/pxdk:release`.
- **Artist skills** — `/pxdk:pixel-scene`, `/pxdk:sprite-sheet`, `/pxdk:animate`, `/pxdk:palette-design` (all drive the `pxc` CLI through the `pxc-artist` subagent; output under `showcase/`).
- **Subagents** — `engine-expert`, `cli-expert`, `studio-expert`, `pxc-artist`.
- **Hooks** — bash safety (PreToolUse), auto-lint (PostToolUse), session-start context, stop-time verify reminder.
- **MCP** — git + filesystem servers.

Recommended pipeline for new features: `/pxdk:plan` → `/pxdk:tdd` → implement → `/pxdk:code-review` → `/pxdk:verify`.

## Modular rules (loaded by skills / CLAUDE)

@pixelcreator-devkit/rules/common/coding-style.md
@pixelcreator-devkit/rules/common/testing.md
@pixelcreator-devkit/rules/common/security.md
@pixelcreator-devkit/rules/common/git-workflow.md
@pixelcreator-devkit/rules/common/development-workflow.md
@pixelcreator-devkit/rules/typescript/patterns.md

## Current Status: v2.0.0-beta.12

232 CLI commands (23 topics), 25 core engines, 12 I/O modules, 98+ REST endpoints, 43 React components, 134 test files, 1331 tests green, 80.87% core coverage. Node ≥ 20, pnpm workspace, Docker support, husky + lint-staged pre-commit hooks.
