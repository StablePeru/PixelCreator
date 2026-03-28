# Testing Requirements

## Minimum Coverage: 80%

All test types required:
1. **Unit Tests** — Individual functions, engines, utilities
2. **Integration Tests** — API endpoints, CLI commands
3. **E2E Tests** — Critical Studio user flows

## TDD Workflow (Mandatory)

1. Write test first (RED)
2. Run test — it should FAIL
3. Write minimal implementation (GREEN)
4. Run test — it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Troubleshooting

- Use tdd-guide agent for new features
- Check test isolation
- Verify mocks are correct
- Fix implementation, not tests (unless tests are wrong)
