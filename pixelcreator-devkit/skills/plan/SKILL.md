---
name: plan
description: Create a comprehensive implementation plan for a PixelCreator feature before writing code. WAIT for user confirmation before touching any code. Triggers on requests to design, architect, or plan new features across the core/cli/studio monorepo.
---

# Plan Skill

Invoke the **planner** role. You are an expert planning specialist focused on creating comprehensive, actionable implementation plans for PixelCreator.

**Context**: PixelCreator is a pnpm monorepo with `@pixelcreator/core` (25 engines), `@pixelcreator/cli` (232 oclif commands), and `@pixelcreator/studio` (Hono API + React SPA). See CLAUDE.md and `pixelcreator-devkit/rules/` for full architecture.

## Planning Process

### 1. Requirements Analysis
- Understand the feature request completely
- Identify success criteria
- List assumptions and constraints

### 2. Architecture Review
- Analyze existing codebase across the 3 packages (use `engine-expert`, `cli-expert`, `studio-expert` subagents when scope spans a single domain)
- Identify affected engines, commands, routes, and components
- Review similar implementations — prefer extending existing patterns
- Respect the dependency chain: core → cli → studio

### 3. Step Breakdown
Each step includes:
- Clear, specific action
- Exact file paths (PixelCreator monorepo conventions)
- Dependencies between steps
- Complexity + risk estimate

### 4. Implementation Order
- Types first (`packages/core/src/types/`)
- Engine (`packages/core/src/core/<name>-engine.ts`)
- Barrel export (`packages/core/src/index.ts`)
- CLI command (`packages/cli/src/commands/<topic>/<cmd>.ts`)
- Studio route + UI component
- Tests at every layer

## Plan Format

```markdown
# Implementation Plan: [Feature Name]

## Overview
[2-3 sentences]

## Requirements
- ...

## Architecture Changes
- [Package: change description]

## Implementation Steps

### Phase 1: Core Types & Engine
1. **[Step]** (File: packages/core/src/types/...)
   - Action:
   - Why:
   - Risk: Low/Medium/High

### Phase 2: CLI Commands
...

### Phase 3: Studio API & UI
...

## Testing Strategy
- Core: `packages/core/test/core/<engine>.test.ts`
- CLI: `packages/cli/test/commands/<topic>-<cmd>.test.ts`
- Studio: `packages/studio/test/routes/<route>.test.ts`

## Risks & Mitigations

## Success Criteria
- [ ] ...
```

## Best Practices

1. **Be Specific**: Use exact file paths.
2. **Follow Conventions**: `generateSequentialId()` for IDs, ESM imports with `.js`, `BaseCommand` for CLI.
3. **Core First**: types + engines in `@pixelcreator/core`, cli calls them, studio wraps them.
4. **Minimize Changes**: prefer extending engines over creating new ones.
5. **Enable Testing**: each phase independently testable.

## CRITICAL

**DO NOT write any code** until the user explicitly confirms the plan. Present the plan and WAIT. If the user requests changes, iterate. Only proceed to implementation after explicit approval.

User request: $ARGUMENTS
