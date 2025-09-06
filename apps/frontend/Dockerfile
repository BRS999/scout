FROM node:18-alpine AS base

# Install dependencies for building native modules  
RUN apk add --no-cache libc6-compat curl bash

WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@1.10.0

FROM base AS builder

# Copy workspace configuration
COPY package.json turbo.json tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY packages/agent-langchain/package.json ./packages/agent-langchain/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (workspace-aware)
# Use legacy peer deps to resolve LangChain dependency conflicts
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Next.js collects completely anonymous telemetry data about general usage
# Learn more here: https://nextjs.org/docs/pages/api-reference/next-config-js/output
# Uncomment the following line to disable telemetry at build time
ENV NEXT_TELEMETRY_DISABLED=1

# Build using turbo (builds dependencies in correct order)
RUN turbo build --filter=@scout/frontend

FROM base AS runner

WORKDIR /app/apps/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
# Copy the standalone server bundle to the same paths it was built with
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
# Important: static assets must live alongside server.js under apps/frontend/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Public assets (if needed by runtime)
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck to ensure server is accepting requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "apps/frontend/server.js"]
