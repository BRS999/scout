# Scout

[![CI](https://github.com/brs999/scout/actions/workflows/ci.yml/badge.svg)](https://github.com/brs999/scout/actions/workflows/ci.yml)

A powerful, privacy focused AI research assistant that runs entirely on your local machine. Use your own LLM with intelligent web research capabilities and persistent memory for enhanced productivity.

![Scout demo](assets/scout.gif)

## Why Scout?

### Privacy First & Local
- **Complete data control**: Your conversations and research stay on your machine
- **No API keys required**: Use LM Studio with any local LLM (ChatGPT OSS, Mistral, etc.)
- **Cost-effective**: No per-token API charges or usage limits

### Advanced Research Capabilities
- **Intelligent web search**: Multi-source analysis with SearX integration
- **Smart content extraction**: Automatic article parsing and summarization
- **Research synthesis**: Combines information from multiple sources intelligently
- **Source verification**: Cross-references information for accuracy

### Persistent Memory System
- **Semantic memory**: Remembers context across conversations using vector embeddings
- **Personal knowledge base**: Build your own searchable knowledge repository
- **Contextual recall**: Retrieves relevant past information automatically
- **Learning over time**: Gets smarter with each interaction

### Developer-Friendly
- **Modern TypeScript**: Full type safety with latest TypeScript features
- **Monorepo architecture**: Clean, maintainable codebase with Turborepo
- **Fast development**: Hot reload, instant linting with Biome
- **Docker ready**: One-command deployment with all dependencies

### Browser Automation 🕷️
- **Steel Browser Integration**: REST API-powered browser automation with CDP support
- **Programmatic Web Interaction**: Navigate, click, fill forms, and extract data via API
- **JavaScript Execution**: Run custom JavaScript in page context
- **Screenshot Capture**: Visual webpage analysis and documentation
- **Form Automation**: Intelligent form filling with CSS selectors

## Features

- **TypeScript First**: Full type safety with modern TypeScript
- **Monorepo Architecture**: Organized packages for better maintainability
- **Vector Memory**: ChromaDB-powered semantic storage and retrieval
- **Web Research Agent**: Intelligent agent with web search and content analysis
- **Steel Browser Automation**: REST API-powered browser automation with CDP
- **Service Status Monitoring**: Real-time status dashboard for all services
- **Tool Integration**: Built-in tools for web scraping, search, research, and automation
- **Real-time Chat**: WebSocket-based chat interface
- **Fast Linting**: Biome for lightning-fast code quality checks
- **Docker Ready**: Complete containerized deployment with SearX, Redis, and Steel Browser

## Project Structure

```
scout/
├── apps/
│   └── frontend/        # Next.js web application with chat interface
│       ├── src/
│       │   ├── app/           # Next.js app router
│       │   │   ├── api/       # API routes (agent streaming, health checks)
│       │   │   ├── favicon.ico
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx   # Main chat interface
│       │   ├── components/    # React components
│       │   │   ├── ui/        # Shadcn/ui components
│       │   │   ├── ChatArea.tsx
│       │   │   ├── RightPane.tsx
│       │   │   └── ServiceStatus.tsx
│       │   └── hooks/         # Custom React hooks
│       ├── .env.example       # Frontend environment variables
│       ├── next.config.ts     # Next.js configuration
│       ├── tailwind.config.ts # Tailwind CSS configuration
│       └── package.json       # Frontend dependencies
├── packages/
│   └── agent/           # Mastra-powered agent with integrated tools
│       ├── src/
│       │   ├── agents/        # Scout agent implementation
│       │   ├── embedders/     # Text embedding providers
│       │   ├── model.ts       # LLM model configuration
│       │   ├── prompts/       # System prompts
│       │   ├── stream.ts      # WebSocket streaming
│       │   └── tools/         # Web search, scraping, and research tools
│       ├── dist/              # Compiled TypeScript output
│       ├── tsconfig.json      # TypeScript configuration
│       └── package.json       # Agent package dependencies
├── docker/              # Docker configurations and compose files
│   ├── docker-compose.yml     # Multi-service Docker setup
│   ├── postgres/              # PostgreSQL initialization
│   └── README-DOCKER.md       # Docker deployment guide
├── searxng/            # SearX search engine configuration
├── examples/           # Usage examples and guides
├── biome.json          # Biome configuration
├── turbo.json          # Turborepo configuration
├── tsconfig.base.json  # Base TypeScript configuration
└── package.json        # Root package configuration
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Build Tool**: Turborepo
- **Linting/Formatting**: Biome
- **AI Framework**: Mastra
- **Vector Database**: ChromaDB
- **Frontend & API**: Next.js + React + Tailwind CSS (API routes)
- **Web Search**: SearX
- **Web Scraping**: Readability.js
- **Browser Automation**: Steel Browser + Chrome DevTools Protocol
- **LLM Integration**: LM Studio (local) or OpenAI API 

## Quick Start

Get started with Scout in minutes and maintain complete privacy with your local LLM setup.

### Prerequisites

- **Node.js 18+**
- **pnpm** (recommended package manager)
- **Docker & Docker Compose**
- **LM Studio** (recommended for local LLM) OR **OpenAI API Key**

### 🚀 Enhanced Setup with Steel Browser Automation

For the full experience with programmatic browser automation, use our enhanced setup:

```bash
# Quick setup with Steel Browser (recommended)
./scripts/setup-steel.sh

# This will:
# - Start all services (SearX, ChromaDB, Steel Browser, Scout)
# - Configure everything automatically
```

**Services will be available at:**
- **Frontend & API**: http://localhost:3009 (dev) / http://localhost:3010 (docker)
- **Steel Browser API**: http://localhost:3003
- **Steel Browser CDP**: http://localhost:9224
- **SearX Search**: http://localhost:8080

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd scout

# Install all dependencies
pnpm install
```

2. **Local LLM Setup (Recommended)**:
```bash
# Download and install LM Studio from https://lmstudio.ai/
# Download any compatible model (Llama 2/3, Mistral, etc.)
# Start LM Studio and load your model
# Note: Scout will automatically connect to LM Studio at localhost:1234
```

3. **Environment Configuration**:

**Environment Files:**
```bash
# Frontend environment file
apps/frontend/.env.example  # Template for frontend .env.local file
```

**For Local Development:**
```bash
# Copy environment template
cp apps/frontend/.env.example apps/frontend/.env.local

# The default settings work with LM Studio at localhost:1234
# No changes needed for basic local setup!

# For OpenAI instead of LM Studio (optional):
# Edit apps/frontend/.env.local and set: OPENAI_API_KEY=your_api_key_here
```

**For Docker Deployment:**
```bash
# Environment variables are configured directly in docker-compose.yml
# Edit docker/docker-compose.yml in the frontend service's environment section:

environment:
  # LM Studio connection (from host)
  - LMSTUDIO_URL=http://host.docker.internal:1234/v1
  - LMSTUDIO_API_KEY=lm-studio
  # Local model configuration
  - LOCAL_MODEL=openai/gpt-oss-20b
  # Database and external services (Docker service names)
  - CHROMADB_URL=http://chromadb:8000
  - SEARXNG_BASE_URL=http://searxng:8080
  - DATABASE_URL=postgresql://scout:scout123@postgres:5432/scout
  # Steel Browser integration
  - STEEL_BROWSER_URL=http://steel-browser:3000

# Key variables to modify:
# - LMSTUDIO_URL: Change if LM Studio runs on different port
# - LMSTUDIO_API_KEY: API key for LM Studio
# - LOCAL_MODEL: Choose your preferred local model
# - CHROMADB_URL: Uses Docker service name for container networking
# - SEARXNG_BASE_URL: Uses Docker service name for container networking
# - DATABASE_URL: PostgreSQL connection string
# - STEEL_BROWSER_URL: Steel Browser service endpoint
```

4. **Choose Your Deployment Method**:

**Option A: Local Development (Recommended for Development)**
```bash
# Start supporting services (SearX search, ChromaDB)
cd docker
docker-compose up -d

# Or use the convenience script
./start-services.sh

# Then start the app locally
pnpm run dev
```

**Option B: Full Docker Deployment**
```bash
# Start everything in Docker containers
cd docker
docker-compose up -d

# App will be available at http://localhost:3010 (frontend)
# All API endpoints are served from the frontend container
```

## 🐳 Docker Deployment

For the easiest setup experience, Scout provides a complete Docker environment with all dependencies pre-configured.

### Quick Docker Start

```bash
# From project root - start all services
./start-services.sh

# Or from docker directory
cd docker && ./start-docker.sh
```

**Services Available:**
- **Frontend + API**: http://localhost:3010
- **SearxNG Search**: http://localhost:8080
- **ChromaDB Vector DB**: http://localhost:8000 (internal)

### Docker Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend + API  │    │   SearxNG       │    │   ChromaDB      │
│   (Next.js)     │◄──►│   (Search)      │◄──►│   (Vector DB)   │
│   Port: 3010    │    │   Port: 8000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   LLM Studio    │    │   PostgreSQL    │
│   (AI Model)    │    │   (Database)    │
│   Port: 1234    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘
```

### Docker Services

#### 🔍 SearxNG
- **Purpose**: Privacy-focused metasearch engine
- **Port**: 8080
- **Features**: No tracking, multiple search engines, JSON API support

#### 🗄️ ChromaDB
- **Purpose**: Vector database for semantic search and memory
- **Port**: 8000
- **Features**: Vector embeddings storage, semantic search, persistent knowledge base

#### 🐘 PostgreSQL
- **Purpose**: Primary database with pgvector extension
- **Port**: 5432
- **Features**: Vector operations, structured data storage, ACID compliance

#### 🌐 Frontend + API (Next.js)
- **Purpose**: Unified React UI with API routes
- **Port**: 3010
- **Features**: Real-time chat, Mastra agent integration, Steel Browser automation

### Docker Environment Setup

The Docker setup automatically configures all environment variables. For local development with Docker:

```bash
# Copy environment template
cp apps/frontend/.env.example apps/frontend/.env.local
```

Key Docker environment variables (auto-configured):
```bash
# LLM Configuration
LMSTUDIO_URL=http://host.docker.internal:1234/v1
LMSTUDIO_API_KEY=lm-studio
LOCAL_MODEL=openai/gpt-oss-20b

# Services (Docker internal networking)
SEARXNG_BASE_URL=http://searxng:8080
CHROMADB_URL=http://chromadb:8000
STEEL_BROWSER_URL=http://steel-browser:3000
DATABASE_URL=postgresql://scout:scout123@postgres:5432/scout
```

### Docker Commands

```bash
# Start all services
cd docker && docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Clean up (remove volumes)
docker-compose down -v

# Restart services
docker-compose restart
```

### Docker Troubleshooting

#### Health Checks
```bash
# Frontend health
curl http://localhost:3010/api/health

# SearxNG readiness
curl http://localhost:8080

# ChromaDB heartbeat
curl http://localhost:8000/api/v1/heartbeat
```

#### Common Issues
```bash
# Check service logs
docker-compose logs frontend

# Restart specific service
docker-compose restart frontend

# View resource usage
docker stats
```

#### LLM Studio Connection
```bash
# Verify LLM Studio is running
curl http://localhost:1234/v1/models

# Check frontend logs for LLM errors
docker-compose logs frontend
```

### Docker Development Workflow

```bash
# Start all services
cd docker && docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:3010
# All API endpoints served from frontend container

# View logs in real-time
docker-compose logs -f frontend
```

5. **Launch Scout**:

**For Local Development:**
```bash
# Start the application
pnpm run dev

# Open http://localhost:3009 in your browser
```

**For Docker Deployment:**
```bash
# Applications will be available at:
# Frontend: http://localhost:3010
# All API endpoints served from frontend container
```

### What You Get

- **Privacy-First AI**: Your conversations never leave your machine
- **Intelligent Research**: Web search and analysis capabilities
- **Persistent Memory**: Knowledge that grows with each session
- **Local Control**: No usage costs, no rate limits, no data sharing
- **Flexible Deployment**: Run locally for development or fully containerized
- **Docker Ready**: Complete containerized deployment with all dependencies

### First Research Task

Once running, try asking Scout:
- "Research the latest developments in renewable energy"
- "Analyze the pros and cons of different JavaScript frameworks"
- "Help me understand quantum computing basics"

### 🕷️ Steel Browser Automation Examples

With Steel Browser integration, Scout can now perform programmatic browser automation:

**Web Navigation & Data Extraction:**
- "Navigate to GitHub and take a screenshot"
- "Extract the title from wikipedia.org using selector h1"
- "Get the HTML content from example.com"

**Form Automation:**
- "Fill out a form with selector 'input[name=\"email\"]' and value 'test@example.com'"
- "Type 'search query' into selector 'input[type=\"search\"]' and click selector 'button[type=\"submit\"]'"

**JavaScript Execution:**
- "Execute JavaScript 'document.title' on cnn.com"
- "Run script 'window.scrollTo(0, document.body.scrollHeight)' to scroll to bottom"

### Service Status Monitoring 🟢

Click the "Status" button in the header to view real-time status of all services:

- **Steel Browser** - Browser automation engine
- **SearX Search** - Privacy-focused search engine
- **ChromaDB** - Vector database for memory
- **Redis** - Caching and session storage

The dropdown shows online/offline status with automatic refresh every 30 seconds.

## Packages

### `@scout/agent`
Mastra-powered intelligent agent with advanced web research capabilities and integrated tool ecosystem.

**Research Capabilities:**
- **Multi-source analysis**: Simultaneously searches and analyzes multiple sources
- **Content synthesis**: Intelligently combines information from diverse sources
- **Source evaluation**: Assesses credibility and cross-references information
- **Deep analysis**: Goes beyond surface-level answers with contextual research
- **Adaptive questioning**: Asks follow-up questions to refine research scope

**Key Features:**
- **Web scraping**: Clean content extraction using Readability.js
- **Search integration**: Powered by SearX for privacy-focused web search
- **Conversation memory**: Records and analyzes conversation history
- **Tool orchestration**: Coordinates multiple research tools automatically
- **Local LLM integration**: Works with any LM Studio-compatible model

**Research Use Cases:**
- Academic research and literature reviews
- Technical documentation analysis
- Market research and competitive analysis
- Fact-checking and source verification
- Knowledge synthesis from multiple sources

```typescript
import { makeAgent } from '@scout/agent';

const agent = await makeAgent();

// Research with intelligent source analysis
const research = await agent.research({
  query: "Latest developments in quantum computing",
  sources: 5,
  depth: "comprehensive"
});

// Get synthesized analysis
const analysis = await research.synthesize();
```

### `@scout/memory`
ChromaDB-powered vector storage for intelligent, persistent memory management that learns and adapts over time.

**Key Features:**
- **Semantic search**: Find information by meaning, not just keywords
- **Persistent storage**: Your knowledge base grows with each conversation
- **Context awareness**: Remembers preferences, patterns, and past interactions
- **Vector embeddings**: Advanced similarity matching for intelligent recall
- **Metadata filtering**: Search with tags, timestamps, and custom attributes

**Memory Benefits:**
- **Continuous learning**: Scout gets smarter with each interaction
- **Personal context**: Maintains your preferences and working style
- **Knowledge accumulation**: Build a searchable personal research database
- **Cross-session continuity**: Pick up conversations exactly where you left off

```typescript
import { getMemory } from '@scout/memory';

const memory = await getMemory();

// Store research findings with metadata
await memory.upsert('Quantum computing breakthrough in error correction', {
  type: 'research',
  category: 'technology',
  timestamp: new Date(),
  source: 'Nature Journal'
});

// Intelligent search across your knowledge base
const results = await memory.search('quantum error correction', {
  filter: { category: 'technology' },
  limit: 5
});
```

## Use Cases

### Research & Analysis
- **Academic Research**: Literature reviews, paper analysis, citation tracking
- **Market Research**: Competitive analysis, trend identification, industry insights
- **Technical Research**: API documentation, framework comparisons, best practices
- **News Analysis**: Current events synthesis, fact-checking, source verification

### Professional Productivity
- **Knowledge Management**: Build personal knowledge bases and research archives
- **Content Creation**: Research-backed writing, article development, blog posts
- **Decision Support**: Data-driven analysis for business decisions
- **Learning**: Interactive study sessions with persistent knowledge retention

### Developer Workflows
- **Code Research**: Framework analysis, library comparisons, implementation research
- **Documentation**: Technical writing, API documentation, tutorial creation
- **Problem Solving**: Complex debugging with historical context and research
- **Architecture Design**: Research-driven system design and technology evaluation

### Personal Use
- **Learning Projects**: Deep dives into new topics with structured knowledge building
- **Hobby Research**: Specialized interests, historical research, creative projects
- **Daily Assistance**: Quick research tasks, information synthesis, memory augmentation

## Development

### Code Quality

```bash
# Lint and format with Biome
pnpm run lint
pnpm run lint:fix

# Type checking
pnpm run type-check

# Build all packages
pnpm run build
```

### Development Commands

```bash
# Start all packages in development mode
pnpm run dev

# Build all packages
pnpm run build

# Clean all build artifacts
pnpm run clean
```

## Contributing

1. **Setup development environment**:
```bash
pnpm install
pnpm run type-check
```

2. **Follow coding standards**:
```bash
pnpm run lint
pnpm run format
```

3. **Add tests** for new features

4. **Update documentation**

### Quick Development Workflows

**Local Development Workflow:**
```bash
# Start supporting services
cd docker && docker-compose up -d

# Start development servers
pnpm run dev

# Open browser at http://localhost:3009
```

**Docker Development Workflow:**
```bash
# Start everything in containers
cd docker && docker-compose up -d

# Access at http://localhost:3010 (frontend)
# All API endpoints served from frontend container
```

**Common Environment Customizations:**

**For Local Development (apps/frontend/.env.local):**
- Change `LMSTUDIO_URL` if LM Studio runs on different port
- Add `OPENAI_API_KEY` for OpenAI instead of LM Studio

**For Docker Deployment (docker-compose.yml):**
- Modify `LMSTUDIO_URL` in frontend service environment
- Update model name in `LOCAL_MODEL`
- Adjust port mappings if needed

## Architecture Overview

Scout combines three core components for powerful, private AI research:

### Memory System (ChromaDB)
Persistent vector storage that learns from every interaction, enabling contextual recall and knowledge accumulation across sessions.

### Research Agent (Mastra)
Intelligent agent that orchestrates web search, content analysis, and multi-source synthesis for comprehensive research capabilities.

### Web Interface & API (Next.js)
Real-time chat interface with integrated API routes for seamless interaction, with WebSocket support for instant responses and conversation continuity.

### Containerized Services
Docker-based deployment with SearX (privacy-focused search) and Redis for optimal performance and easy setup.

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Acknowledgments

- **Original AgenticSeek**: For the inspiration and core concepts
- **SearX**: For the excellent search engine
- **ChromaDB**: For powerful vector storage
- **Mastra**: For the AI agent framework foundation
- **Node.js**: For the reliable runtime
- **Biome**: For the amazing developer tools



