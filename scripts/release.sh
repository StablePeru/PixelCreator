#!/usr/bin/env bash
set -euo pipefail

# PixelCreator Release Script
# Usage: ./scripts/release.sh <major|minor|patch|version>
# Example: ./scripts/release.sh minor
# Example: ./scripts/release.sh 2.0.0-alpha.1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -lt 1 ]; then
  echo -e "${RED}Usage: $0 <major|minor|patch|version>${NC}"
  echo "  $0 minor          # bump minor version"
  echo "  $0 2.0.0-alpha.1  # set explicit version"
  exit 1
fi

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  exit 1
fi

# Ensure on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo -e "${YELLOW}Warning: Not on main branch (current: $BRANCH). Continue? [y/N]${NC}"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Determine new version
CURRENT_VERSION=$(node -p "require('./package.json').version")
INPUT=$1

case "$INPUT" in
  major|minor|patch)
    IFS='.' read -r major minor patch <<< "${CURRENT_VERSION%%-*}"
    case "$INPUT" in
      major) NEW_VERSION="$((major+1)).0.0" ;;
      minor) NEW_VERSION="${major}.$((minor+1)).0" ;;
      patch) NEW_VERSION="${major}.${minor}.$((patch+1))" ;;
    esac
    ;;
  *)
    NEW_VERSION="$INPUT"
    ;;
esac

echo -e "${GREEN}Releasing: v${CURRENT_VERSION} → v${NEW_VERSION}${NC}"
echo ""

# Run checks
echo "Running lint..."
pnpm lint
echo "Running build..."
pnpm build
echo "Running tests..."
pnpm test

# Bump version in all package.json files (root + workspace packages)
node -e "
const fs = require('fs');
const files = [
  'package.json',
  'packages/core/package.json',
  'packages/cli/package.json',
  'packages/studio/package.json',
];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log('  Updated: ' + file);
}
"

echo -e "${GREEN}Updated all package.json files to v${NEW_VERSION}${NC}"

# Stage and commit
git add package.json
git commit -m "release: v${NEW_VERSION}"

# Create annotated tag
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

echo ""
echo -e "${GREEN}Release v${NEW_VERSION} prepared!${NC}"
echo ""
echo "Next steps:"
echo "  git push origin main --tags    # Push commit and tag"
echo "  # GitHub Actions will handle npm publish and GitHub Release"
