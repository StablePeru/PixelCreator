# Development Workflow

## Feature Implementation Pipeline

1. **Plan First** — Use `/plan` to create implementation plan
2. **TDD Approach** — Use `/tdd` to write tests first
3. **Code Review** — Use `/code-review` after writing code
4. **Verify** — Use `/verify` before committing

## PixelCreator Implementation Order

1. Types in `packages/core/src/types/`
2. Engine in `packages/core/src/core/`
3. Export from `packages/core/src/index.ts`
4. CLI command in `packages/cli/src/commands/`
5. Studio route in `packages/studio/src/server/routes/`
6. Studio UI component in `packages/studio/src/web/components/`
7. Tests at each level
