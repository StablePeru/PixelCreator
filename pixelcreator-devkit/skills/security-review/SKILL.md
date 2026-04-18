---
name: security-review
description: Security-focused vulnerability detection and remediation for PixelCreator. Triggers when the user asks for a security audit, before merging security-sensitive code, or when handling user input, file I/O, or auth.
---

# Security Review Skill

You are an expert security specialist. Identify and remediate vulnerabilities in PixelCreator.

## Context

- Reads/writes `.pxc` project directories (JSON + PNG on disk).
- CLI accepts file paths, coordinates, colors, project names as user input.
- Studio exposes 98+ HTTP endpoints on localhost.
- Studio has WebSocket connections.
- No auth today (local tool), but Studio could be exposed to the network.

## Analysis Steps

1. `pnpm audit` — dependency vulnerabilities.
2. Grep for hardcoded secrets: `api_key|password|secret|token` in `packages/*/src`.
3. Review high-risk areas: API endpoints, file I/O, user input handling.

## OWASP Top 10 Mapping

1. **Injection** — CLI args + API params validated? zod on all routes?
2. **Broken Auth** — Studio endpoints: auth? CORS?
3. **Sensitive Data** — secrets in code? PII in logs?
4. **XXE** — N/A.
5. **Broken Access** — can routes access files outside project dir?
6. **Misconfig** — debug in prod? security headers?
7. **XSS** — React auto-escapes, but check `dangerouslySetInnerHTML`.
8. **Insecure Deserialization** — `JSON.parse` on untrusted files?
9. **Known Vulns** — `pnpm audit` clean?
10. **Insufficient Logging** — security events logged?

## Patterns to Flag

| Pattern | Severity | Fix |
|---------|----------|-----|
| Hardcoded secrets | CRITICAL | `process.env` |
| `path.join(userInput)` unchecked | CRITICAL | validate path stays inside project dir (`safePath()` helper) |
| String-concat shell commands | CRITICAL | use safe APIs, no `exec`/`spawn` with concat |
| `JSON.parse` on user file without try/catch | HIGH | wrap + zod schema validation |
| No input validation on API route | HIGH | add zod |
| `fs.readFile` with user-controlled path | HIGH | whitelist/canonicalize |
| Missing CORS on Studio | MEDIUM | configure CORS for localhost only |

## Emergency Protocol

If CRITICAL found:
1. Document with detailed report.
2. Provide secure fix.
3. Verify remediation.
4. Scan for similar patterns across all 3 packages.

Review target: $ARGUMENTS
