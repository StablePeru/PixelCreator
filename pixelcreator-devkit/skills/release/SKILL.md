---
name: release
description: Release workflow for PixelCreator — bump semver, update CHANGELOG, tag, run full verify, and prepare npm publish. Triggers when the user says "let's release" or "cut a version".
---

# Release Skill

Drive a clean release for PixelCreator. Never push/publish without explicit user confirmation.

## Preconditions

- Branch is `main` (or explicitly approved release branch).
- Working tree is clean (`git status --porcelain` returns empty).
- All tests pass (`pnpm -r test` green).
- No `console.log` in production code (`code-review` or `verify` skill recently passed).

If any precondition fails: **stop and report**.

## Steps

### 1. Confirm intent
Ask the user for bump type: **patch | minor | major** or an explicit version (`2.0.0-beta.13`).

### 2. Run full verification
Invoke the **verify** skill in `full` mode. If it fails, stop.

### 3. Bump versions
Monorepo (pnpm workspace). Bump root `package.json` and each workspace package:

```bash
pnpm version <patch|minor|major> --no-git-tag-version
pnpm -r exec pnpm version <patch|minor|major> --no-git-tag-version
```

Ensure all three packages (`@pixelcreator/core`, `@pixelcreator/cli`, `@pixelcreator/studio`) share the same version.

### 4. Update CHANGELOG.md
Follow Keep-a-Changelog format. Include sections: Added, Changed, Fixed, Deprecated, Removed, Security. Use conventional commits (`git log` since last tag) as raw material.

### 5. Update CLAUDE.md status line
The `## Current Status: vX.Y.Z-...` line at the bottom of `CLAUDE.md` must match the new version.

### 6. Verify again
`pnpm -r build && pnpm -r test`. Must stay green.

### 7. Commit + tag (requires explicit user confirmation)
```bash
git add -A
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
```

### 8. Push (requires explicit user confirmation)
```bash
git push origin main
git push origin vX.Y.Z
```

### 9. Publish to npm (requires explicit user confirmation; skip for beta)
```bash
pnpm --filter @pixelcreator/core publish --access public
pnpm --filter @pixelcreator/cli publish --access public
pnpm --filter @pixelcreator/studio publish --access public
```

### 10. GitHub Release (optional)
```bash
gh release create vX.Y.Z --notes-file RELEASE_NOTES.md
```

## Safety rules

- **Never force-push** during a release.
- **Never skip `verify`**.
- **Always pause** before commit, tag, push, and publish — confirm with the user each time.
- For beta versions (`*-beta.*`), default to skipping npm publish unless explicitly asked.

Bump type or explicit version: $ARGUMENTS
