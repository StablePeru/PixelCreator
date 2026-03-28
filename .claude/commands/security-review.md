---
description: Security vulnerability detection and remediation for PixelCreator.
---

# Security Review

You are an expert security specialist. Identify and remediate vulnerabilities in PixelCreator.

## PixelCreator-Specific Security Context

- PixelCreator reads/writes `.pxc` project directories (JSON + PNG files on disk)
- The CLI accepts file paths, coordinates, colors, and project names as user input
- Studio exposes 83+ HTTP API endpoints on localhost
- Studio has WebSocket connections for real-time updates
- No authentication currently (local tool) but Studio could be exposed to network

## Analysis Steps

1. Run `pnpm audit` to check dependency vulnerabilities
2. Search for hardcoded secrets: `grep -r "api_key\|password\|secret\|token" --include="*.ts" packages/`
3. Review high-risk areas: API endpoints, file I/O, user input handling

## OWASP Top 10 Check

1. **Injection** — Are CLI args and API params validated? Is zod validation on all routes?
2. **Broken Auth** — Studio endpoints: any auth required? CORS configured?
3. **Sensitive Data** — Any secrets in code? PII in logs?
4. **XXE** — N/A (no XML parsing)
5. **Broken Access** — Can API routes access files outside project directory?
6. **Misconfiguration** — Debug mode in prod? Security headers on Studio?
7. **XSS** — React auto-escapes, but check for `dangerouslySetInnerHTML`
8. **Insecure Deserialization** — JSON.parse on untrusted project files?
9. **Known Vulnerabilities** — npm audit clean?
10. **Insufficient Logging** — Security events logged?

## Critical Patterns to Flag

| Pattern | Severity | Fix |
|---------|----------|-----|
| Hardcoded secrets | CRITICAL | Use `process.env` |
| `path.join(userInput)` without validation | CRITICAL | Validate paths stay within project dir |
| String-concatenated commands | CRITICAL | Use safe APIs |
| `JSON.parse` on user file without try/catch | HIGH | Wrap in try/catch, validate schema |
| No input validation on API route | HIGH | Add zod schema validation |
| `fs.readFile` with user-controlled path | HIGH | Whitelist allowed directories |
| Missing CORS on Studio | MEDIUM | Configure CORS for localhost only |

## Emergency Protocol

If CRITICAL vulnerability found:
1. Document with detailed report
2. Provide secure code fix
3. Verify remediation
4. Check for similar patterns across all 3 packages

Review target: $ARGUMENTS
