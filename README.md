# Scout

[![CI](https://github.com/brs999/scout/actions/workflows/ci.yml/badge.svg)](https://github.com/brs999/scout/actions/workflows/ci.yml)
[![Lint and Format](https://github.com/brs999/scout/actions/workflows/ci.yml/badge.svg)](https://github.com/brs999/scout/actions/workflows/ci.yml)
[![Docker Build](https://github.com/brs999/scout/actions/workflows/ci.yml/badge.svg)](https://github.com/brs999/scout/actions/workflows/ci.yml)

A modern, TypeScript-based AI agent system using a monorepo architecture with Node.js and Biome.

## 🚀 Features

- **TypeScript First**: Full type safety with modern TypeScript
- **Monorepo Architecture**: Organized packages for better maintainability
- **Node.js Runtime**: Modern JavaScript runtime with excellent TypeScript support
- **Biome**: Lightning-fast linting and formatting
- **Modular Design**: Separate packages for core logic, agents, tools, and UI
- **Docker Integration**: Reuses existing SearX containers from original Scout

## 📁 Project Structure

```
scout/
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

- **Runtime**: Node.js
- **Language**: TypeScript 5.0+
- **Build Tool**: Turborepo
- **Linting/Formatting**: Biome
- **Backend**: Fastify + Node.js
- **Frontend**: Next.js + React
- **Database**: PostgreSQL
- **Cache**: Redis
- **Search**: SearX 

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)
- **Docker & Docker Compose**
- **LLM Studio**

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd scout

# Install dependencies
npm install
```

2. **Start services**:
```bash
Rename .env.example to .env
# Start Docker services (reuses original SearX)
cd docker
docker-compose up -d

# Or use the convenience script
./start-services.sh
```

3. **Development**:
```bash
# Start all packages in development mode
npm run dev

# Or run specific packages
cd packages/core && npm run dev
cd apps/backend && npm run dev
cd apps/frontend && npm run dev
```

## 📦 Packages

### `@scout/shared`
Core types, utilities, and constants shared across all packages.

```typescript
import { Agent, QueryResult, generateId } from '@scout/shared';

const agent: Agent = {
  id: generateId(),
  name: 'CoderAgent',
  type: AgentType.CODER,
  // ...
};
```

### `@scout/core`
Core business logic including:
- Base Agent class
- Routing system
- Memory management
- LLM provider abstraction

### `@scout/agents`
Specialized agent implementations:
- Casual Agent
- Coder Agent
- Browser Agent
- Data Analyst Agent
- Research Agent

### `@scout/tools`
Tool implementations:
- Code executors (JS, Python, Rust, etc.)
- File system operations
- API clients
- Database connectors
- Image processors

### `@scout/web`
Shared web components and utilities for the frontend.

## 🔧 Development

### Code Quality

```bash
# Lint and format with Biome
npm run lint
npm run format

# Type checking
npm run type-check

# Run tests
npm run test
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
cd packages/core && npm run build
```

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
npm install
npm run type-check
```

2. **Follow coding standards**:
```bash
npm run lint
npm run format
```

3. **Add tests** for new features

4. **Update documentation**

## 🙏 Acknowledgments

- **Original AgenticSeek**: For the inspiration and core concepts
- **SearX**: For the excellent search engine
- **Node.js**: For the reliable runtime
- **Biome**: For the amazing developer tools



