FROM node:18-alpine AS base

# Install dependencies for building native modules
RUN apk add --no-cache libc6-compat python3 make g++ curl bash

WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@2.5.6

FROM base AS builder

# Copy workspace configuration
COPY package.json turbo.json tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY packages/agent-langchain/package.json ./packages/agent-langchain/
COPY packages/memory/package.json ./packages/memory/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (workspace-aware)
# Use legacy peer deps to resolve LangChain dependency conflicts
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build using turbo (builds dependencies in correct order)
RUN turbo build --filter=@scout/backend

FROM base AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 agenticseek && \
    mkdir -p /data && chown -R agenticseek:nodejs /data

# Copy built application and dependencies
COPY --from=builder --chown=agenticseek:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/agent-langchain/dist ./packages/agent-langchain/dist
COPY --from=builder --chown=agenticseek:nodejs /app/packages/memory/dist ./packages/memory/dist
COPY --from=builder --chown=agenticseek:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=agenticseek:nodejs /app/package.json ./
# Copy environment file
COPY --from=builder --chown=agenticseek:nodejs /app/.env ./
# Copy package.json files for workspace resolution
COPY --from=builder --chown=agenticseek:nodejs /app/packages/agent-langchain/package.json ./packages/agent-langchain/
COPY --from=builder --chown=agenticseek:nodejs /app/packages/memory/package.json ./packages/memory/

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
