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
COPY packages/agents/package.json ./packages/agents/
COPY packages/core/package.json ./packages/core/
COPY packages/llm/package.json ./packages/llm/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tools/package.json ./packages/tools/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (workspace-aware)
# Use npm install instead of ci due to workspace dependency issues  
RUN npm install

# Copy source code
COPY . .

# Next.js collects completely anonymous telemetry data about general usage
# Learn more here: https://nextjs.org/docs/pages/api-reference/next-config-js/output
# Uncomment the following line to disable telemetry at build time
ENV NEXT_TELEMETRY_DISABLED=1

# Build using turbo (builds dependencies in correct order)
RUN turbo build --filter=frontend

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "apps/frontend/server.js"]