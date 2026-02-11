# =============================================================================
# Shep AI CLI - Multi-stage Docker Build
# =============================================================================
# Optimized for caching, speed, and minimal image size.
#
# Usage:
#   docker build -t shep-cli .
#   docker run shep-cli --version
#
# =============================================================================

# =============================================================================
# Stage 1: Install production dependencies (cached layer)
# =============================================================================
FROM node:22-alpine AS deps

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy only dependency files first (maximizes cache hits)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/presentation/web/package.json ./src/presentation/web/package.json

# Install production dependencies only (ignore scripts to skip husky which is a devDep)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Rebuild native addons (better-sqlite3) for the target platform
RUN pnpm rebuild better-sqlite3

# =============================================================================
# Stage 2: Build TypeScript
# =============================================================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy dependency and config files (workspace config + all package.json files first for cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json tspconfig.yaml ./
COPY src/presentation/web/package.json ./src/presentation/web/package.json

# Install all dependencies (including devDependencies for TypeScript compiler)
RUN pnpm install --frozen-lockfile

# Copy TypeSpec files (needed for code generation during build)
COPY tsp/ ./tsp/

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript (includes prebuild hook that runs pnpm generate)
RUN pnpm run build

# =============================================================================
# Stage 3: Production runtime (minimal image)
# =============================================================================
FROM node:22-alpine AS runtime

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 shep

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json (required by VersionService to read version at runtime)
COPY package.json ./

# Switch to non-root user
USER shep

# CLI entrypoint - allows: docker run ghcr.io/shep-ai/cli --version
ENTRYPOINT ["node", "dist/presentation/cli/index.js"]
