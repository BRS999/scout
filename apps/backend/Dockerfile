FROM node:18-alpine AS base

# Install dependencies for building native modules
RUN apk add --no-cache libc6-compat python3 make g++ curl bash

WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@1.10.0

FROM base AS builder

# Copy workspace configuration
COPY package.json turbo.json tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY packages/agents/package.json ./packages/agents/
COPY packages/core/package.json ./packages/core/
COPY packages/llm/package.json ./packages/llm/
COPY packages/memory/package.json ./packages/memory/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tools/package.json ./packages/tools/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (workspace-aware) 
# Use npm install instead of ci due to workspace dependency issues
RUN npm install

# Copy source code
COPY . .

# Build using turbo (builds dependencies in correct order)
RUN turbo build --filter=@agentic-seek/backend

FROM base AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 agenticseek && \
    mkdir -p /data && chown -R agenticseek:nodejs /data

# Copy built application and dependencies
COPY --from=builder --chown=agenticseek:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/tools/dist ./packages/tools/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/memory/dist ./packages/memory/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/agents/dist ./packages/agents/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=agenticseek:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=agenticseek:nodejs /app/package.json ./
# Copy package.json files for workspace resolution
COPY --from=builder --chown=agenticseek:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=agenticseek:nodejs /app/packages/tools/package.json ./packages/tools/
COPY --from=builder --chown=agenticseek:nodejs /app/packages/memory/package.json ./packages/memory/
COPY --from=builder --chown=agenticseek:nodejs /app/packages/agents/package.json ./packages/agents/
COPY --from=builder --chown=agenticseek:nodejs /app/packages/core/package.json ./packages/core/

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
