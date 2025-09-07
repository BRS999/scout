# Scout

[![CI](https://github.com/brs999/scout/actions/workflows/ci.yml/badge.svg)](https://github.com/brs999/scout/actions/workflows/ci.yml)

A modern, TypeScript-based AI agent system using a monorepo architecture with Node.js, Biome, and ChromaDB.

## 🚀 Features

- **TypeScript First**: Full type safety with modern TypeScript
- **Monorepo Architecture**: Organized packages for better maintainability
- **Vector Memory**: ChromaDB-powered semantic storage and retrieval
- **Web Research Agent**: Intelligent agent with web search and content analysis
- **Tool Integration**: Built-in tools for web scraping, search, and research
- **Real-time Chat**: WebSocket-based chat interface
- **Fast Linting**: Biome for lightning-fast code quality checks
- **Docker Ready**: Complete containerized deployment with SearX and Redis

## 📁 Project Structure

```
scout/
├── packages/
│   ├── agent/           # LangChain-powered agent with integrated tools
│   │   ├── src/
│   │   │   ├── index.ts         # Main agent exports
│   │   │   ├── model.ts         # LLM model configuration
│   │   │   ├── prompts/         # System prompts
│   │   │   ├── recorder/        # Conversation recording
│   │   │   └── tools/           # Web search, scraping, and research tools
│   └── memory/          # ChromaDB vector storage and memory management
│       ├── src/
│       │   ├── chroma-client.ts # ChromaDB connection
│       │   ├── vector-store.ts  # Vector operations
│       │   ├── memory-manager.ts # Memory management
│       │   └── tools/           # Memory search and upsert tools
├── apps/
│   ├── backend/         # Fastify API server with WebSocket support
│   └── frontend/        # Next.js web application with chat interface
├── docker/              # Docker configurations and compose files
├── scripts/             # Build and deployment scripts
├── searxng/            # SearX search engine configuration
├── biome.json           # Biome configuration
├── turbo.json           # Turborepo configuration
└── package.json         # Root package configuration
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Build Tool**: Turborepo
- **Linting/Formatting**: Biome
- **AI Framework**: LangChain.js
- **Vector Database**: ChromaDB
- **Backend**: Fastify + Node.js
- **Frontend**: Next.js + React + Tailwind CSS
- **Web Search**: SearX
- **Web Scraping**: Readability.js
- **LLM Integration**: LM Studio (local) or OpenAI API 

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)
- **Docker & Docker Compose**
- **LM Studio** (for local LLM) OR **OpenAI API Key**

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd scout

# Install dependencies
npm install
```

2. **Environment Configuration**:
```bash
# Create .env file with required variables
cp .env.example .env

# Edit .env with your configuration
# Required: LM Studio running locally (default) OR OPENAI_API_KEY
# Optional: Custom ChromaDB URL, SearX URL, model name, etc.
```

3. **Start services**:
```bash
# Start Docker services (reuses original SearX)
cd docker
docker-compose up -d

# Or use the convenience script
./start-services.sh
```

4. **Development**:
```bash
# Start all packages in development mode
npm run dev

# Or run specific packages
cd packages/core && npm run dev
cd apps/backend && npm run dev
cd apps/frontend && npm run dev
```

## 📦 Packages

### `@scout/agent`
LangChain-powered agent with integrated tool ecosystem for web research and analysis.

**Key Features:**
- Web search and content scraping
- Research capabilities with multi-source analysis
- Conversation recording and analysis
- Configurable LLM model integration

```typescript
import { makeAgent } from '@scout/agent';

const agent = await makeAgent();
// Agent with web search, scraping, and research capabilities
```

### `@scout/memory`
ChromaDB-powered vector storage for semantic memory management and retrieval.

**Key Features:**
- Vector-based semantic search
- Persistent memory storage
- Memory upsert and retrieval operations
- ChromaDB integration with configurable embeddings

```typescript
import { getMemory } from '@scout/memory';

const memory = await getMemory();
await memory.upsert('User prefers dark mode', { type: 'preference' });
const results = await memory.search('user preferences');
```

## 🔧 Development

### Code Quality

```bash
# Lint and format with Biome
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Build all packages
npm run build
```

### Development Commands

```bash
# Start all packages in development mode
npm run dev

# Build all packages
npm run build

# Clean all build artifacts
npm run clean
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

### Quick Development

```bash
# Start all services with Docker
cd docker && docker-compose up -d

# Start development servers
npm run dev

# Open browser at http://localhost:3000
```

## 📈 Key Features

- **Vector Memory**: ChromaDB-powered semantic search and storage
- **Intelligent Agent**: LangChain-powered agent with web research capabilities
- **Web Scraping**: Content extraction with Readability.js
- **Search Integration**: SearX-powered web search
- **Real-time Chat**: WebSocket-based chat interface
- **Docker Ready**: Complete containerized deployment

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- **Original AgenticSeek**: For the inspiration and core concepts
- **SearX**: For the excellent search engine
- **ChromaDB**: For powerful vector storage
- **LangChain**: For the AI framework foundation
- **Node.js**: For the reliable runtime
- **Biome**: For the amazing developer tools



