# AgenticSeek TypeScript

[![CI](https://github.com/your-username/agentic-seek-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/agentic-seek-ts/actions/workflows/ci.yml)
[![Lint and Format](https://github.com/your-username/agentic-seek-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/agentic-seek-ts/actions/workflows/ci.yml)
[![Docker Build](https://github.com/your-username/agentic-seek-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/agentic-seek-ts/actions/workflows/ci.yml)

A modern, TypeScript-based rewrite of AgenticSeek using a monorepo architecture with Bun and Biome.

## 🚀 Features

- **TypeScript First**: Full type safety with modern TypeScript
- **Monorepo Architecture**: Organized packages for better maintainability
- **Bun Runtime**: Fast package management and script execution
- **Biome**: Lightning-fast linting and formatting
- **Modular Design**: Separate packages for core logic, agents, tools, and UI
- **Docker Integration**: Reuses existing SearX containers from original AgenticSeek

## 📁 Project Structure

```
agentic-seek-ts/
├── packages/
│   ├── shared/          # Shared types, utilities, and constants
│   ├── core/           # Core business logic and agents
│   ├── agents/         # Specialized agent implementations
│   ├── tools/          # Tool implementations
│   └── web/            # Web interface components
├── apps/
│   ├── backend/        # Fastify API server
│   └── frontend/       # Next.js web application
├── docker/             # Docker configurations
├── scripts/            # Build and deployment scripts
├── biome.json          # Biome configuration
├── turbo.json          # Turborepo configuration
└── package.json        # Root package configuration
```

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript 5.0+
- **Build Tool**: Turborepo
- **Linting/Formatting**: Biome
- **Backend**: Fastify + Node.js
- **Frontend**: Next.js + React
- **Database**: PostgreSQL
- **Cache**: Redis
- **Search**: SearX (reused from original)

## 🚀 Quick Start

### Prerequisites

- **Bun**: `curl -fsSL https://bun.sh/install | bash`
- **Docker & Docker Compose**
- **Node.js 18+** (fallback for some tools)

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd agentic-seek-ts

# Install dependencies with Bun (much faster than npm)
bun install
```

2. **Start services**:
```bash
# Start Docker services (reuses original SearX)
cd docker
docker-compose up -d

# Or use the convenience script
../scripts/start-services.sh
```

3. **Development**:
```bash
# Start all packages in development mode
bun run dev

# Or run specific packages
cd packages/core && bun run dev
cd apps/backend && bun run dev
cd apps/frontend && bun run dev
```

## 📦 Packages

### `@agentic-seek/shared`
Core types, utilities, and constants shared across all packages.

```typescript
import { Agent, QueryResult, generateId } from '@agentic-seek/shared';

const agent: Agent = {
  id: generateId(),
  name: 'CoderAgent',
  type: AgentType.CODER,
  // ...
};
```

### `@agentic-seek/core`
Core business logic including:
- Base Agent class
- Routing system
- Memory management
- LLM provider abstraction

### `@agentic-seek/agents`
Specialized agent implementations:
- Casual Agent
- Coder Agent
- Browser Agent
- Data Analyst Agent
- Research Agent

### `@agentic-seek/tools`
Tool implementations:
- Code executors (JS, Python, Rust, etc.)
- File system operations
- API clients
- Database connectors
- Image processors

### `@agentic-seek/web`
Shared web components and utilities for the frontend.

## 🔧 Development

### Code Quality

```bash
# Lint and format with Biome
bun run lint
bun run format

# Type checking
bun run type-check

# Run tests
bun run test
```

### Building

```bash
# Build all packages
bun run build

# Build specific package
cd packages/core && bun run build
```

## 🐳 Docker Integration

This project reuses the existing SearX and Redis containers from the original AgenticSeek:

```yaml
# docker/docker-compose.yml
searxng:
  image: docker.io/searxng/searxng:latest
  # Reuses your existing SearX configuration
```

## 🔄 Migration from Python Version

### Key Improvements

1. **Type Safety**: Full TypeScript coverage prevents runtime errors
2. **Performance**: Bun runtime + Turborepo for faster builds
3. **Developer Experience**: Better IntelliSense, refactoring, and debugging
4. **Maintainability**: Modular monorepo structure
5. **Modern Tooling**: Biome for fast linting/formatting

### Architecture Changes

| Python Version | TypeScript Version |
|---------------|-------------------|
| FastAPI | Fastify |
| Pydantic | Zod/TypeScript types |
| Single repo | Monorepo with packages |
| Pip | Bun |
| Black/ESLint | Biome |
| Synchronous agents | Async-first architecture |

### Compatibility

- **SearX**: Fully compatible - reuses existing containers
- **Configuration**: New format but same environment variables
- **API**: RESTful with improved type safety
- **Tools**: Enhanced with better error handling

## 📚 API Reference

### Core Types

```typescript
interface Query {
  id: string;
  content: string;
  timestamp: Date;
}

interface QueryResult {
  answer: string;
  reasoning: string;
  agentName: string;
  success: boolean;
  executionTime: number;
}
```

### Agent Interface

```typescript
interface Agent {
  id: string;
  name: string;
  type: AgentType;
  process(query: Query): Promise<QueryResult>;
}
```

## 🤝 Contributing

1. **Setup development environment**:
```bash
bun install
bun run type-check
```

2. **Follow coding standards**:
```bash
bun run lint
bun run format
```

3. **Add tests** for new features

4. **Update documentation**

## 📄 License

Same as original AgenticSeek project.

## 🙏 Acknowledgments

- **Original AgenticSeek**: For the inspiration and core concepts
- **SearX**: For the excellent search engine
- **Bun**: For the fast runtime
- **Biome**: For the amazing developer tools

---

**Note**: This is a complete rewrite in TypeScript while maintaining compatibility with existing SearX deployments. The monorepo structure provides better scalability and maintainability for future development.

