FROM node:24-slim AS base

# Install dependencies for building native modules
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    build-essential \
    python3 \
    python3-dev \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust for building native dependencies
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

FROM base AS builder

WORKDIR /app

# Install turbo for pruning
RUN npm install -g turbo@2.5.6

# Copy entire monorepo for pruning
COPY . .

# Generate a partial monorepo with a pruned lockfile for frontend workspace
RUN turbo prune @scout/frontend --docker

FROM base AS installer

WORKDIR /app

# Install turbo in the installer stage
RUN npm install -g turbo@2.5.6

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install --legacy-peer-deps --frozen-lockfile

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
# Ensure tsconfig.base.json is available for TypeScript builds
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json

# Mark that we're running in Docker for service discovery
ENV DOCKER_CONTAINER=true

# Add build arguments for remote caching
ARG TURBO_TEAM=""
ARG TURBO_TOKEN=""
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

# Next.js collects completely anonymous telemetry data about general usage
# Learn more here: https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_NATIVE_DEPS=true

# Install libsql native binaries for Linux (both GNU and MUSL)
RUN npm install @libsql/linux-x64-gnu @libsql/linux-arm64-gnu @libsql/linux-x64-musl @libsql/linux-arm64-musl --save-optional || echo "libsql binaries installation failed, continuing..."

# Try to install missing native dependencies for tokenizers
RUN npm install @anush008/tokenizers-linux-arm64-gnu @anush008/tokenizers-linux-x64-musl --save-optional || echo "Optional dependency installation failed, continuing..."

# Create a mock file for the missing tokenizer package to prevent build failures
RUN mkdir -p /app/node_modules/@anush008/tokenizers-linux-arm64-gnu && \
    echo "module.exports = {}" > /app/node_modules/@anush008/tokenizers-linux-arm64-gnu/index.js

RUN turbo build --filter=@scout/frontend

FROM base AS runner

WORKDIR /app/apps/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --create-home nextjs

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
