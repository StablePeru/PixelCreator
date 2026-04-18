# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones. Use spread operators for updates.

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- 200-400 lines typical, 800 max
- High cohesion, low coupling
- Organize by feature/domain

## Error Handling

- Handle errors explicitly at every level
- Provide user-friendly error messages
- Log detailed error context server-side
- Never silently swallow errors

## Input Validation

- Validate all user input at system boundaries
- Use zod for schema-based validation
- Fail fast with clear error messages

## Code Quality Checklist

- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values
- [ ] Immutable patterns used
