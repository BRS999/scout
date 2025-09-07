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

## Features

- **TypeScript First**: Full type safety with modern TypeScript
- **Monorepo Architecture**: Organized packages for better maintainability
- **Vector Memory**: ChromaDB-powered semantic storage and retrieval
- **Web Research Agent**: Intelligent agent with web search and content analysis
- **Tool Integration**: Built-in tools for web scraping, search, and research
- **Real-time Chat**: WebSocket-based chat interface
- **Fast Linting**: Biome for lightning-fast code quality checks
- **Docker Ready**: Complete containerized deployment with SearX and Redis

## Project Structure

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

## Tech Stack

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

## Quick Start

Get started with Scout in minutes and maintain complete privacy with your local LLM setup.

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)
- **Docker & Docker Compose**
- **LM Studio** (recommended for local LLM) OR **OpenAI API Key**

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
```bash
# Copy environment template
cp .env.example .env

# For local LLM (default):
# Just ensure LM Studio is running - no API keys needed!

# For OpenAI (optional):
# OPENAI_API_KEY=your_api_key_here
```

4. **Start Services**:
```bash
# Start supporting services (SearX search, ChromaDB)
cd docker
docker-compose up -d

# Or use the convenience script
./start-services.sh
```

5. **Launch Scout**:
```bash
# Start the application
npm run dev

# Open http://localhost:3000 in your browser
```

### What You Get

- **Privacy-First AI**: Your conversations never leave your machine
- **Intelligent Research**: Web search and analysis capabilities
- **Persistent Memory**: Knowledge that grows with each session
- **Local Control**: No usage costs, no rate limits, no data sharing

### First Research Task

Once running, try asking Scout:
- "Research the latest developments in renewable energy"
- "Analyze the pros and cons of different JavaScript frameworks"
- "Help me understand quantum computing basics"

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

### Quick Development

```bash
# Start all services with Docker
cd docker && docker-compose up -d

# Start development servers
npm run dev

# Open browser at http://localhost:3000
```

## Architecture Overview

Scout combines three core components for powerful, private AI research:

### Memory System (ChromaDB)
Persistent vector storage that learns from every interaction, enabling contextual recall and knowledge accumulation across sessions.

### Research Agent (LangChain)
Intelligent agent that orchestrates web search, content analysis, and multi-source synthesis for comprehensive research capabilities.

### Web Interface (Next.js)
Real-time chat interface for seamless interaction, with WebSocket support for instant responses and conversation continuity.

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
- **LangChain**: For the AI framework foundation
- **Node.js**: For the reliable runtime
- **Biome**: For the amazing developer tools



