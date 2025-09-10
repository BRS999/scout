# Scout - Docker Setup

Run the complete Scout AI system locally using Docker with a single command!

> 📁 **Docker files are located in the `docker/` directory**

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/scout.git
cd scout

# Start everything with Docker (from project root)
./start-services.sh
# or from docker directory:
cd docker && ./start-docker.sh
```

That's it! The entire system will be running at:
- **Frontend & API**: http://localhost:3001
- **SearxNG Search**: http://localhost:8080
- **Service Status**: http://localhost:3001/api/services/status

## 🏗️ Architecture

The Docker setup includes:

```
┌─────────────────────────────────┐    ┌─────────────────┐
│   Frontend & API                │    │   SearxNG       │
│   (Next.js with integrated API) │◄──►│   (Search)      │
│   Port: 3001                    │    │   Port: 8080    │
└─────────────────────────────────┘    └─────────────────┘
                │                        │
                ▼                        ▼
       ┌─────────────────┐    ┌─────────────────┐
       │   Redis         │    │   LLM Studio    │
       │   (Cache)       │    │   (AI Model)    │
       │   Port: 6379    │    │   Port: 1234    │
       └─────────────────┘    └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │   Steel Browser │
       │   (Web Tools)   │
       │   Port: 3003    │
       └─────────────────┘
```

## 📋 Prerequisites

- **Docker** (with Docker Compose)
- **Git**
- **LLM Studio** (optional, for AI features)

### Install Docker

**macOS:**
```bash
brew install --cask docker
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin
```

**Windows:**
Download from: https://www.docker.com/products/docker-desktop

## 🛠️ Services Included

### 🔴 Redis
- **Purpose**: Caching and data storage
- **Port**: 6379 (internal only)
- **Image**: valkey/valkey:8-alpine

### 🔍 SearxNG
- **Purpose**: Privacy-focused metasearch engine
- **Port**: 8080
- **Image**: searxng/searxng:latest
- **Features**:
  - No tracking
  - Multiple search engines
  - JSON API support

### 🌐 Frontend & API (Next.js)
- **Purpose**: Full-stack application with integrated API
- **Port**: 3001
- **Features**:
  - Real-time chat interface
  - Agent orchestration with streaming responses
  - Service status monitoring
  - Tool execution viewer
  - Responsive design
  - Integrated API routes (/api/*)

### 🔧 Steel Browser
- **Purpose**: Headless browser for web automation
- **Port**: 3003 (API), 9224 (Chrome DevTools)
- **Image**: ghcr.io/steel-dev/steel-browser-api:latest
- **Features**:
  - Web scraping and navigation
  - Screenshot capture
  - PDF generation
  - JavaScript execution

## 🎯 AI Features Setup

For full AI functionality, you'll need LLM Studio:

### 1. Download LLM Studio
```bash
# Download from: https://lmstudio.ai/
```

### 2. Start LLM Studio Server
1. Open LLM Studio
2. Go to "Local Server" tab
3. Load a model (e.g., GPT-OSS)
4. Start the server on port 1234
5. The Docker containers will automatically connect

### 3. Supported Models
- **GPT-OSS** (recommended)
- Any OpenAI-compatible model
- Custom fine-tuned models

## 📊 Environment Variables

Create a `.env` file in the project root:

```bash
# SearxNG Configuration
SEARXNG_BASE_URL=http://localhost:8080/
SEARXNG_SECRET_KEY=your-secret-key-here

# LLM Studio Configuration
LMSTUDIO_URL=http://host.docker.internal:1234/v1
LMSTUDIO_API_KEY=lm-studio
LOCAL_MODEL=openai/gpt-oss-20b

# Frontend Configuration (API is integrated - no backend URL needed)
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0

# Database and Service Connections (Docker service names)
CHROMADB_URL=http://chromadb:8000
STEEL_BROWSER_URL=http://steel-browser:3000
REDIS_URL=redis://redis:6379
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=scout_cron
POSTGRES_USER=scout
POSTGRES_PASSWORD=scout_password
```

## 🚦 Usage

### Start Services
```bash
# From project root
./start-services.sh

# Or from docker directory
cd docker && ./start-docker.sh
```

### View Logs
```bash
# From docker directory
cd docker

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Stop Services
```bash
# From docker directory
cd docker && docker-compose down
```

### Restart Services
```bash
# From docker directory
cd docker && docker-compose restart
```

### Clean Up (remove volumes)
```bash
# From docker directory
cd docker && docker-compose down -v
```

## 🔍 Troubleshooting

### Backend Not Starting
```bash
# From docker directory
cd docker

# Check frontend logs
docker-compose logs frontend

# Check if SearxNG is ready
curl http://localhost:8080
```

### Frontend Not Loading
```bash
# From docker directory
cd docker

# Check frontend logs
docker-compose logs frontend

# Verify frontend API connectivity
curl http://localhost:3001/api/health

# Test service status endpoint
curl http://localhost:3001/api/services/status
```

### LLM Not Working
```bash
# Ensure LLM Studio is running
curl http://localhost:1234/v1/models

# From docker directory
cd docker

# Check frontend logs for LLM errors
docker-compose logs frontend
```

### Port Conflicts
If ports are already in use:
```bash
# From docker directory
cd docker

# Stop conflicting services or change ports in docker-compose.yml
docker-compose down
```

## 🧪 Testing the System

### Health Checks
```bash
# Frontend & API health
curl http://localhost:3001/api/health

# Service status monitoring
curl http://localhost:3001/api/services/status
```

### API Testing
```bash
# Test streaming chat functionality
curl -X POST http://localhost:3001/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello, how are you?"}]}'

# Test regular agent API
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello, how are you?"}]}'
```

## 📁 Project Structure

```
scout/
├── apps/
│   └── frontend/          # Next.js React app with integrated API
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/  # API routes (/api/*)
│       │   │   └── page.tsx
│       │   └── components/
│       ├── Dockerfile     # Multi-stage build with Turbo
│       └── package.json
├── packages/              # Shared packages
│   ├── agent/            # LangChain-based agent implementation
│   │   ├── src/
│   │   │   ├── index.ts  # Main agent exports
│   │   │   ├── model.ts  # LLM model configuration
│   │   │   └── tools/    # Agent tools (search, browser, etc.)
│   │   └── package.json
│   ├── memory/           # ChromaDB vector store integration
│   │   ├── src/
│   │   │   ├── index.ts  # Memory management
│   │   │   └── chroma-client.ts
│   │   └── package.json
│   └── cron/             # Cron job scheduling system
│       ├── src/
│       │   ├── index.ts  # Cron management
│       │   └── runner.ts # Job execution
│       └── package.json
├── docker/                # Docker orchestration
│   ├── docker-compose.yml     # Service definitions
│   ├── start-docker.sh       # Startup script
│   └── README-DOCKER.md      # This documentation
├── start-services.sh     # Launcher script (project root)
└── turbo.json           # Build orchestration
```

## 🎉 Features

- ✅ **Unified Architecture** - Frontend & API integrated in Next.js
- ✅ **Streaming Responses** - Real-time AI agent responses
- ✅ **Service Monitoring** - Live status dashboard for all services
- ✅ **Complete Local Setup** - Everything runs in Docker
- ✅ **Privacy-Focused** - No cloud dependencies required
- ✅ **AI-Powered** - LLM integration with GPT-OSS models
- ✅ **Modern UI** - Built with Next.js and shadcn/ui
- ✅ **Real-time Updates** - Live streaming and monitoring
- ✅ **Vector Store** - ChromaDB integration for memory
- ✅ **Web Automation** - Steel Browser for web scraping
- ✅ **Developer Friendly** - Hot reload and comprehensive logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker:
   ```bash
   cd docker && ./start-docker.sh
   ```
5. Verify API endpoints:
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/services/status
   ```
6. Submit a pull request

### Development Notes

- **API Integration**: The API is integrated into the Next.js frontend (no separate backend)
- **Environment Variables**: No `NEXT_PUBLIC_BACKEND_URL` needed - frontend uses `window.location.origin`
- **Streaming**: Agent responses use Server-Sent Events (SSE) for real-time updates
- **Service Discovery**: Components auto-detect Docker vs localhost environments

## 📄 License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.

---

**Happy coding with Scout! 🚀**
