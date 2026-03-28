# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email: [Create a private security advisory](https://github.com/StablePeru/PixelCreator/security/advisories/new)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Security Practices

- All user inputs are validated with zod schemas
- File I/O is restricted to project directories (path traversal prevention)
- No secrets are hardcoded in source
- Dependencies are monitored via Dependabot
