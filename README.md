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

- **Unified Architecture**: Frontend & API integrated in Next.js
- **Streaming Responses**: Real-time AI agent responses with Server-Sent Events
- **Service Status Monitoring**: Live status dashboard for all services
- **TypeScript First**: Full type safety with modern TypeScript
- **Monorepo Architecture**: Organized packages for better maintainability
- **Vector Memory**: ChromaDB-powered semantic storage and retrieval
- **Web Research Agent**: Intelligent agent with web search and content analysis
- **Steel Browser Automation**: REST API-powered browser automation with CDP
- **Tool Integration**: Built-in tools for web scraping, search, research, and automation
- **Real-time Chat**: Streaming chat interface with instant responses
- **Fast Linting**: Biome for lightning-fast code quality checks
- **Docker Ready**: Complete containerized deployment with SearX, Redis, and Steel Browser

## Project Structure

```
scout/
├── apps/
│   └── frontend/          # Next.js React app with integrated API
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/  # API routes (/api/*) - no separate backend
│       │   │   └── page.tsx
│       │   └── components/
│       ├── Dockerfile     # Multi-stage build with Turbo
│       └── package.json
├── packages/
│   ├── agent/            # LangChain-based agent implementation
│   │   ├── src/
│   │   │   ├── index.ts  # Main agent exports
│   │   │   ├── model.ts  # LLM model configuration
│   │   │   ├── prompts/  # System prompts
│   │   │   └── tools/    # Web search, scraping, and research tools
│   │   └── package.json
│   ├── memory/           # ChromaDB vector storage and memory management
│   │   ├── src/
│   │   │   ├── chroma-client.ts # ChromaDB connection
│   │   │   ├── vector-store.ts  # Vector operations
│   │   │   ├── memory-manager.ts # Memory management
│   │   │   └── tools/           # Memory search and upsert tools
│   │   └── package.json
│   └── cron/             # Cron job scheduling system
│       ├── src/
│       │   ├── index.ts  # Cron management
│       │   └── runner.ts # Job execution
│       └── package.json
├── docker/                # Docker orchestration
│   ├── docker-compose.yml     # Service definitions
│   ├── start-docker.sh       # Startup script
│   └── README-DOCKER.md      # Docker-specific documentation
├── searxng/            # SearX search engine configuration
├── biome.json           # Biome configuration
├── turbo.json           # Turborepo configuration
└── package.json         # Root package configuration
```

## Tech Stack

- **Runtime**: Node.js 24+
- **Language**: TypeScript 5.0+
- **Build Tool**: Turborepo
- **Linting/Formatting**: Biome
- **AI Framework**: LangChain.js
- **Vector Database**: ChromaDB
- **Full-Stack Framework**: Next.js + React + Tailwind CSS
- **API**: Next.js API Routes (integrated)
- **Web Search**: SearX
- **Web Scraping**: Readability.js
- **Browser Automation**: Steel Browser + Chrome DevTools Protocol
- **LLM Integration**: LM Studio (local) or OpenAI API
- **Streaming**: Server-Sent Events (SSE) 

## Quick Start

Get started with Scout in minutes and maintain complete privacy with your local LLM setup.

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)
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
- **Frontend & API**: http://localhost:3001
- **Steel Browser API**: http://localhost:3003
- **Steel Browser CDP**: http://localhost:9224
- **SearX Search**: http://localhost:8080
- **Service Status**: http://localhost:3001/api/services/status

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd scout

# Install all dependencies
npm install
```

2. **Local LLM Setup (Recommended)**:
```bash
# Download and install LM Studio from https://lmstudio.ai/
# Download any compatible model (Llama 2/3, Mistral, etc.)
# Start LM Studio and load your model
# Note: Scout will automatically connect to LM Studio at localhost:1234
```

3. **Environment Configuration**:

**For Local Development:**
```bash
# The .env file is already configured for local development
# Default settings work with LM Studio at localhost:1234
# No changes needed for basic local setup!

# Optional: Copy template for customization
cp .env.example .env

# For OpenAI instead of LM Studio (optional):
# Edit .env and set: OPENAI_API_KEY=your_api_key_here
```

**For Docker Deployment:**
```bash
# Environment variables are configured in docker/docker-compose.yml
# Edit the frontend service's environment section:

environment:
  # LM Studio connection (from host)
  - LMSTUDIO_URL=http://host.docker.internal:1234/v1
  # Database and external services (Docker service names)
  - CHROMADB_URL=http://chromadb:8000
  - SEARXNG_BASE_URL=http://searxng:8080
  - STEEL_BROWSER_URL=http://steel-browser:3000
  # Docker container detection
  - DOCKER_CONTAINER=true

# Key variables to modify:
# - LMSTUDIO_URL: Change if LM Studio runs on different port
# - CHROMADB_URL: Uses Docker service name for container networking
# - SEARXNG_BASE_URL: Uses Docker service name for container networking
# - STEEL_BROWSER_URL: Uses Docker service name for container networking
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
npm run dev
```

**Option B: Full Docker Deployment**
```bash
# Start everything in Docker containers
cd docker
docker-compose up -d

# App will be available at http://localhost:3001 (frontend & API)
# Service status at http://localhost:3001/api/services/status
```

5. **Launch Scout**:

**For Local Development:**
```bash
# Start the application
npm run dev

# Open http://localhost:3000 in your browser
```

**For Docker Deployment:**
```bash
# Applications will be available at:
# Frontend & API: http://localhost:3001
# Service Status: http://localhost:3001/api/services/status
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
LangChain-powered intelligent agent with advanced web research capabilities and integrated tool ecosystem.

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

## Contributing

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

### Quick Development Workflows

**Local Development Workflow:**
```bash
# Start supporting services
cd docker && docker-compose up -d

# Start development servers
npm run dev

# Open browser at http://localhost:3000
```

**Docker Development Workflow:**
```bash
# Start everything in containers
cd docker && docker-compose up -d

# Access at http://localhost:3001 (frontend & API)
# Service status at http://localhost:3001/api/services/status
```

**Common Environment Customizations:**

**For Local Development (.env):**
- Change `LMSTUDIO_URL` if LM Studio runs on different port
- Add `OPENAI_API_KEY` for OpenAI instead of LM Studio
- Modify service URLs if running services on different ports

**For Docker Deployment (docker-compose.yml):**
- Modify `LMSTUDIO_URL` in frontend service environment
- Update model name in `LOCAL_MODEL`
- Adjust service URLs if needed (ChromaDB, SearX, Steel Browser)
- Environment variables are auto-detected based on `DOCKER_CONTAINER=true`

## Architecture Overview

Scout combines four core components for powerful, private AI research in a unified architecture:

### Unified Full-Stack Application (Next.js)
- **Frontend**: Modern React interface with real-time streaming
- **API**: Integrated Next.js API routes handling all backend functionality
- **Streaming**: Server-Sent Events for real-time AI responses
- **Service Discovery**: Auto-detection of Docker vs localhost environments

### Memory System (ChromaDB)
Persistent vector storage that learns from every interaction, enabling contextual recall and knowledge accumulation across sessions.

### Research Agent (LangChain)
Intelligent agent that orchestrates web search, content analysis, and multi-source synthesis for comprehensive research capabilities.

### Containerized Services
Docker-based deployment with SearX (privacy-focused search), Redis, Steel Browser, and PostgreSQL for optimal performance and easy setup.

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Migration Notes

### Architecture Evolution
Scout has evolved from a microservices architecture (separate frontend/backend) to a unified full-stack application:

- **Before**: Fastify backend (port 8777) + Next.js frontend (port 3001)
- **After**: Next.js full-stack app (port 3001) with integrated API routes
- **Benefits**: Simplified deployment, better performance, easier development

### Key Changes
- ✅ API routes moved from `/apps/backend` to `/apps/frontend/src/app/api`
- ✅ Environment variables simplified (no NEXT_PUBLIC_BACKEND_URL needed)
- ✅ Streaming responses implemented with Server-Sent Events
- ✅ Service status monitoring integrated
- ✅ Docker deployment unified into single container

## Acknowledgments

- **Original AgenticSeek**: For the inspiration and core concepts
- **SearX**: For the excellent search engine
- **ChromaDB**: For powerful vector storage
- **LangChain**: For the AI framework foundation
- **Next.js**: For the excellent full-stack framework
- **Node.js**: For the reliable runtime
- **Biome**: For the amazing developer tools
- **Steel Browser**: For programmatic browser automation



