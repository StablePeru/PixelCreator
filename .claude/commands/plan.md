---
description: Create a comprehensive implementation plan before writing code. WAIT for user CONFIRM before touching any code.
---

# Plan Command

Invoke the **planner** role. You are an expert planning specialist focused on creating comprehensive, actionable implementation plans.

**Context**: This is PixelCreator, a pnpm monorepo with `@pixelcreator/core` (25 engines), `@pixelcreator/cli` (231 oclif commands), and `@pixelcreator/studio` (Hono API + React SPA). See CLAUDE.md for full architecture.

## Planning Process

### 1. Requirements Analysis
- Understand the feature request completely
- Identify success criteria
- List assumptions and constraints

### 2. Architecture Review
- Analyze existing codebase structure across the 3 packages
- Identify affected engines, commands, routes, and components
- Review similar implementations in the codebase
- Consider reusable patterns (engines in core, commands in cli, routes+components in studio)

### 3. Step Breakdown
Create detailed steps with:
- Clear, specific actions
- File paths and locations (use actual PixelCreator paths)
- Dependencies between steps
- Estimated complexity
- Potential risks

### 4. Implementation Order
- Prioritize: core types/engines first, then CLI commands, then studio routes/UI
- Group related changes by package
- Enable incremental testing at each phase

## Plan Format

```markdown
# Implementation Plan: [Feature Name]

## Overview
[2-3 sentence summary]

## Requirements
- [Requirement 1]
- [Requirement 2]

## Architecture Changes
- [Package: change description]

## Implementation Steps

### Phase 1: Core Types & Engine (packages/core/)
1. **[Step]** (File: packages/core/src/types/...)
   - Action: ...
   - Why: ...
   - Risk: Low/Medium/High

### Phase 2: CLI Commands (packages/cli/)
...

### Phase 3: Studio API & UI (packages/studio/)
...

## Testing Strategy
- Core: vitest unit tests in packages/core/test/
- CLI: vitest command tests in packages/cli/test/
- Studio: vitest route tests in packages/studio/test/

## Risks & Mitigations

## Success Criteria
- [ ] Criterion 1
```

## Best Practices

1. **Be Specific**: Use exact file paths within the monorepo
2. **Follow Conventions**: IDs via `generateSequentialId()`, ESM imports with `.js` extensions
3. **Core First**: Types and engines go in `@pixelcreator/core`, commands in cli, routes+UI in studio
4. **Minimize Changes**: Prefer extending existing engines over creating new ones
5. **Enable Testing**: Each phase should be independently testable

## CRITICAL

**DO NOT write any code** until the user explicitly confirms the plan. Present the plan and WAIT.

If the user wants changes, modify the plan accordingly. Only proceed to implementation after explicit approval.

User request: $ARGUMENTS
