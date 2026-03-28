# Security Guidelines

## Mandatory Checks Before Commit

- [ ] No hardcoded secrets
- [ ] All user inputs validated (CLI args, API params)
- [ ] Path traversal prevention (file I/O must stay within project dir)
- [ ] XSS prevention (React auto-escapes, verify no dangerouslySetInnerHTML)
- [ ] Error messages don't leak sensitive data
- [ ] JSON.parse wrapped in try/catch for user-provided files

## Secret Management

- NEVER hardcode secrets in source
- Use environment variables
- Validate required env vars at startup
