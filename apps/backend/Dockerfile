FROM node:24-alpine AS base

# Install dependencies for building native modules
RUN apk add --no-cache libc6-compat python3 make g++ curl bash

WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@2.5.6

FROM base AS builder

# Copy entire monorepo for pruning
COPY . .

# Generate a partial monorepo with a pruned lockfile for backend workspace
RUN turbo prune @scout/backend --docker

FROM base AS installer

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install --legacy-peer-deps

# Build the project and dependencies
COPY --from=builder /app/out/full/ .
# Ensure tsconfig.base.json is available for TypeScript builds
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json

# Add build arguments for remote caching (only if provided)
ARG TURBO_TEAM=""
ARG TURBO_TOKEN=""
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN turbo build --filter=@scout/backend

FROM base AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 agenticseek && \
    mkdir -p /data && chown -R agenticseek:nodejs /data

# Copy built application and dependencies
COPY --from=installer --chown=agenticseek:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer --chown=agenticseek:nodejs /app/packages/agent/dist ./packages/agent/dist
COPY --from=installer --chown=agenticseek:nodejs /app/packages/memory/dist ./packages/memory/dist
COPY --from=installer --chown=agenticseek:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=agenticseek:nodejs /app/package.json ./
# Copy environment file if it exists
COPY --from=installer --chown=agenticseek:nodejs /app/.env* ./
# Copy package.json files for workspace resolution
COPY --from=installer --chown=agenticseek:nodejs /app/packages/agent/package.json ./packages/agent/
COPY --from=installer --chown=agenticseek:nodejs /app/packages/memory/package.json ./packages/memory/

USER agenticseek

# Expose port
EXPOSE 7777

# Set environment variables
ENV NODE_ENV=production \
    PORT=7777 \
    HOST=0.0.0.0 \
    SQLITE_PATH=/data/memory.db \
    CHROMADB_URL=http://chromadb:8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:7777/health || exit 1

# Start the application
CMD ["node", "apps/backend/dist/apps/backend/src/index.js"]
