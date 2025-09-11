FROM node:24-slim AS base

# Install required packages for Debian slim
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

RUN npm install -g pnpm@9.15.0 turbo@2.5.6

FROM base AS builder
COPY . .
# Prune only the scope needed
RUN turbo prune @scout/frontend --docker

FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json

ENV NEXT_TELEMETRY_DISABLED=1
ARG TURBO_TEAM=""
ARG TURBO_TOKEN=""
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

# Increase Node.js memory limit for better performance with transformers
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN turbo build --filter=@scout/frontend

FROM base AS runner
WORKDIR /app/apps/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install essential dependencies for @xenova/transformers
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Copy node_modules with native binaries from installer stage
COPY --from=installer --chown=nextjs:nodejs /app/node_modules ./node_modules/

COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "apps/frontend/server.js"]