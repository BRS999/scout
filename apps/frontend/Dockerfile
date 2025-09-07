FROM node:24-alpine AS base

# Install dependencies for building native modules  
RUN apk add --no-cache libc6-compat curl bash

WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@2.5.6

FROM base AS builder

# Copy entire monorepo for pruning
COPY . .

# Generate a partial monorepo with a pruned lockfile for frontend workspace
RUN turbo prune @scout/frontend --docker

FROM base AS installer

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install --legacy-peer-deps

# Build the project and dependencies
COPY --from=builder /app/out/full/ .
# Ensure tsconfig.base.json is available for TypeScript builds
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json

# Next.js collects completely anonymous telemetry data about general usage
# Learn more here: https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV NEXT_TELEMETRY_DISABLED=1

# Add build arguments for remote caching (only if provided)
ARG TURBO_TEAM=""
ARG TURBO_TOKEN=""
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN turbo build --filter=@scout/frontend

FROM base AS runner

WORKDIR /app/apps/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
# Copy the standalone server bundle to the same paths it was built with
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
# Important: static assets must live alongside server.js under apps/frontend/.next
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Public assets (if needed by runtime)
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Healthcheck to ensure server is accepting requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "apps/frontend/server.js"]
