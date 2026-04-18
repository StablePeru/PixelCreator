# Changelog

All notable changes to `pixelcreator-devkit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-18

### Added
- Initial plugin scaffold (`.claude-plugin/plugin.json` v0.1.0).
- 11 skills migrated from legacy `.claude/commands/`: `plan`, `tdd`, `verify`, `code-review`, `ts-review`, `security-review`, `architect`, `build-fix`, `e2e`, `update-codemaps`, `update-docs`.
- 4 new dev-productivity skills: `engine-new`, `cli-command-new`, `studio-route-new`, `release`.
- 4 new artist-workflow skills that drive the `pxc` CLI: `pixel-scene`, `sprite-sheet`, `animate`, `palette-design`.
- 4 domain subagents: `engine-expert`, `cli-expert`, `studio-expert`, `pxc-artist`.
- Moderate hook suite: `pre-bash-safety`, `post-edit-lint`, `session-start-context`, `stop-verify-reminder`.
- MCP servers configured: `git`, `filesystem`.
- Rules migrated from `.claude/rules/` (common + typescript).

### Migration notes (from legacy `.claude/` setup)
- Previous `.claude/commands/*.md` removed — use `/pxdk:<skill>` instead of `/<command>`.
- Previous `.claude/rules/` removed — rules now live under `pixelcreator-devkit/rules/`, imported from `CLAUDE.md` via `@` imports.
- No project source code was touched.
