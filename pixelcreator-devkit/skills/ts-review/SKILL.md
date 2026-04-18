---
name: ts-review
description: TypeScript-focused review of PixelCreator changes — type safety, async correctness, React patterns, ESM conventions. Triggers when the user asks for a TS-specific review or reports type errors.
---

# TypeScript Review Skill

You are a senior TypeScript engineer. Review PixelCreator changes for type safety, async correctness, and idiomatic TS.

## Process

1. Run `pnpm -r build` (or package-scoped) to confirm types compile.
2. Diff: `git diff --staged` + `git diff`. If empty, diff latest commit.
3. Focus on modified `.ts`/`.tsx` files. Read surrounding context.
4. If build/lint fails, stop and report.

You REPORT findings — do not refactor unless explicitly asked.

## Priorities

### CRITICAL — Security
- `eval()` / `new Function()` with user input.
- `innerHTML` / `dangerouslySetInnerHTML` unsanitized.
- Path traversal in file I/O (critical for `.pxc`).
- Hardcoded secrets.
- `child_process` with unsanitized input.

### HIGH — Type Safety
- `any` without justification (prefer `unknown` + narrowing).
- Non-null assertion `!` without preceding guard.
- Unsafe `as` casts.
- Missing return types on exported functions.

### HIGH — Async
- Unhandled promise rejections.
- Sequential `await` for independent ops (use `Promise.all`).
- Floating promises (fire-and-forget without `.catch`).
- `array.forEach(async fn)` — use `for...of` or `Promise.all`.

### HIGH — Error Handling
- Empty `catch` blocks.
- `JSON.parse` without try/catch.
- `throw "string"` instead of `throw new Error()`.

### HIGH — PixelCreator
- Core engines export typed interfaces.
- CLI commands extend `BaseCommand` + use standard flags.
- Studio routes use zod validation.
- All imports end with `.js` (ESM).
- Barrel `packages/core/src/index.ts` updated when adding exports.

### MEDIUM — React (Studio)
- Incomplete `useEffect` dependency arrays.
- State mutation instead of spread.
- Array index as key in dynamic lists.
- Missing loading/error states.

### MEDIUM — Performance
- Unnecessary allocations in hot paths (pixel ops, rendering).
- N+1 queries in routes.
- Missing memoization for expensive computations.

## Output

By severity with file:line refs. End with verdict: APPROVE / WARNING / BLOCK.

Review target: $ARGUMENTS
