# PixelCreator Studio — Docker Image
# Serves the full Studio GUI (frontend + backend API + WebSocket)

# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/studio/package.json packages/studio/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core/ packages/core/
COPY packages/cli/ packages/cli/
COPY packages/studio/ packages/studio/

# Build all packages (core → cli → studio including frontend)
RUN pnpm -r build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/studio/package.json packages/studio/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/core/dist/ packages/core/dist/
COPY --from=builder /app/packages/cli/dist/ packages/cli/dist/
COPY --from=builder /app/packages/cli/bin/ packages/cli/bin/
COPY --from=builder /app/packages/cli/oclif.manifest.json packages/cli/
COPY --from=builder /app/packages/studio/dist/ packages/studio/dist/

# Create default project directory
RUN mkdir -p /data/project.pxc && \
    node packages/cli/bin/run.js project:init --name default --project /data/project.pxc || true

# Expose Studio port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PXC_PROJECT=/data/project.pxc

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start Studio server
CMD ["node", "packages/cli/bin/run.js", "studio:serve", "--port", "3000", "--project", "/data/project.pxc"]
