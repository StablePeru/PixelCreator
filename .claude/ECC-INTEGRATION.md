# ECC Integration for PixelCreator

**Source**: [everything-claude-code](https://github.com/affaan-m/everything-claude-code) v1.9.0
**Integrated**: 2026-03-23
**Method**: Manual cherry-pick (project-local only, no installer used)

## What Was Installed

### Slash Commands (`.claude/commands/`)

| Command | Purpose | ECC Source |
|---------|---------|------------|
| `/plan` | Implementation planning — creates step-by-step plan, waits for approval | `agents/planner.md` + `commands/plan.md` |
| `/architect` | System design and architectural analysis | `agents/architect.md` |
| `/code-review` | Security + quality review of uncommitted changes | `agents/code-reviewer.md` + `commands/code-review.md` |
| `/ts-review` | TypeScript-specific review (type safety, async, patterns) | `agents/typescript-reviewer.md` |
| `/security-review` | OWASP Top 10 + secrets detection + dependency audit | `agents/security-reviewer.md` |
| `/tdd` | Test-driven development enforcement (RED→GREEN→REFACTOR) | `agents/tdd-guide.md` + `commands/tdd.md` |
| `/e2e` | Playwright E2E test generation for Studio | `agents/e2e-runner.md` + `commands/e2e.md` |
| `/update-docs` | Sync documentation with codebase state | `agents/doc-updater.md` + `commands/update-docs.md` |
| `/update-codemaps` | Generate token-lean architecture maps | `commands/update-codemaps.md` |
| `/build-fix` | Incrementally fix build/type errors | `commands/build-fix.md` |
| `/verify` | Comprehensive pre-commit verification | `commands/verify.md` |

### Rules (`.claude/rules/`)

| Directory | Files | ECC Source |
|-----------|-------|------------|
| `common/` | coding-style, git-workflow, testing, security, development-workflow | `rules/common/` (5 of 9 — skipped hooks, agents, patterns, performance) |
| `typescript/` | coding-style, patterns, security, testing | `rules/typescript/` (4 of 5 — skipped hooks) |

All rules were adapted for PixelCreator's specific architecture (monorepo, engine pattern, .pxc files).

## What Was Intentionally Skipped

### Not Installed — By Design

| Component | Reason |
|-----------|--------|
| Memory/instinct/continuous-learning systems | Invasive, SQLite dependency, marginal value |
| Hooks (JS scripts in settings.json) | Too invasive for a beta project; quality gates via manual `/verify` instead |
| MCP server configs | Project-specific needs, not generic |
| Non-TypeScript language rules (11 languages) | Not used in this project |
| Research/content/social/media skills | Not relevant to pixel art tool |
| Framework-specific skills (Django, SpringBoot, etc.) | Not relevant |
| tmux automations | Not required |
| InsAIts security monitoring | Opt-in service, not needed |
| Governance capture | Enterprise feature, not needed |
| Plugin registration | Would be global, not project-local |
| Contexts (dev.md, review.md) | Marginal value vs CLAUDE.md |
| 100+ skills | Overkill — core behavior is in commands/agents |
| ECC installer/npm package | Bypassed entirely for manual cherry-pick |

## How to Use

### Recommended Workflow

```
/plan <feature description>        # Plan before coding
/tdd <feature to implement>        # Write tests first
/code-review                       # Review after coding
/ts-review                         # TypeScript-specific review
/security-review                   # Before merging security-sensitive code
/verify                            # Pre-commit check
/build-fix                         # When build breaks
/update-docs                       # After major features
/update-codemaps                   # After architectural changes
```

### Example Session

```
> /plan Add a new blur effect to the effects engine
  [planner creates step-by-step plan, waits for approval]
> yes, proceed
> /tdd Implement blur effect engine
  [writes tests first, then implements]
> /code-review
  [reviews all changes for quality/security]
> /verify full
  [runs build + types + lint + tests]
```

## File Locations

```
.claude/
├── commands/
│   ├── plan.md
│   ├── architect.md
│   ├── code-review.md
│   ├── ts-review.md
│   ├── security-review.md
│   ├── tdd.md
│   ├── e2e.md
│   ├── update-docs.md
│   ├── update-codemaps.md
│   ├── build-fix.md
│   └── verify.md
├── rules/
│   ├── common/
│   │   ├── coding-style.md
│   │   ├── git-workflow.md
│   │   ├── testing.md
│   │   ├── security.md
│   │   └── development-workflow.md
│   └── typescript/
│       ├── coding-style.md
│       ├── patterns.md
│       ├── security.md
│       └── testing.md
└── ECC-INTEGRATION.md  (this file)
```

## Notes

- `.gitignore` includes `.claude/` — these files are local-only, not committed
- Each developer would need their own copy (or remove `.claude/` from `.gitignore`)
- No global config was modified
- No npm packages were installed
- No hooks or automations were added
- All commands are manual-invoke only (type `/command` to use)
