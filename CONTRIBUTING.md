# Contributing to PixelCreator

Thank you for your interest in contributing to PixelCreator! This guide will help you get started.

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** (package manager)
- **Git**

## Setup

```bash
git clone https://github.com/StablePeru/PixelCreator.git
cd PixelCreator
pnpm install
pnpm build
pnpm test
```

## Monorepo Structure

```
packages/
  core/    @pixelcreator/core    — Engines, I/O, types, utilities
  cli/     @pixelcreator/cli     — CLI commands (oclif)
  studio/  @pixelcreator/studio  — Web GUI (Hono + React)
```

Build order: **core -> cli -> studio** (each depends on the previous).

## Development Workflow

### 1. Feature Implementation Order

Follow this order when adding new features:

1. Types in `packages/core/src/types/`
2. Engine in `packages/core/src/core/`
3. Export from `packages/core/src/index.ts`
4. CLI command in `packages/cli/src/commands/{topic}/{command}.ts`
5. Studio route in `packages/studio/src/server/routes/`
6. Studio UI component in `packages/studio/src/web/components/`
7. Tests at each level

### 2. Running Commands

```bash
pnpm -r build              # Build all packages
pnpm -r test               # Run all tests
pnpm -r lint               # Lint all packages
pnpm pxc <command>         # Run CLI in dev mode
```

### 3. Testing Requirements

- **Minimum coverage: 80%**
- Write tests first (TDD): RED -> GREEN -> REFACTOR
- Run single test: `cd packages/core && pnpm vitest run test/core/<file>.test.ts`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring |
| `docs` | Documentation |
| `test` | Tests |
| `chore` | Build/tooling |
| `perf` | Performance |
| `ci` | CI/CD |

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the workflow above
3. Ensure all tests pass (`pnpm -r test`)
4. Ensure lint passes (`pnpm -r lint`)
5. Ensure coverage >= 80%
6. Submit a PR with a clear description

## Code Style

- **TypeScript strict mode** enabled
- **ESM** with `.js` extensions in imports
- **Immutability**: always create new objects, never mutate
- **File size**: 200-400 lines typical, 800 max
- **Functions**: < 50 lines
- **Formatting**: Prettier (single quotes, semicolons, 100 char width)

See `.editorconfig` and `.prettierrc` for details.

## Reporting Issues

Use [GitHub Issues](https://github.com/StablePeru/PixelCreator/issues) with the provided templates.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
