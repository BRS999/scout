# Scout - Docker Setup

Run the complete Scout system locally using Docker with a single command!

> 📁 **Docker files are located in the `docker/` directory**

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/agentic-seek-ts.git
cd agentic-seek-ts

# Start everything with Docker (from project root)
./start-services.sh
# or from docker directory:
cd docker && ./start-docker.sh
```

That's it! The entire system will be running at:
- **Frontend + API**: http://localhost:3001
- **SearxNG Search**: http://localhost:8080

## 🏗️ Architecture

The Docker setup includes:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend + API  │    │   SearxNG       │    │   Redis         │
│   (Next.js)     │◄──►│   (Search)      │◄──►│   (Cache)       │
│   Port: 3001    │    │   Port: 8080    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   LLM Studio    │
│   (AI Model)    │
│   Port: 1234    │
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

### 🌐 Frontend + API (Next.js)
- **Purpose**: Unified React UI with API routes
- **Port**: 3001
- **Features**:
  - Real-time chat
  - Agent monitoring
  - Tool execution viewer
  - API routes for agent interaction
  - LLM Studio integration
  - Responsive design

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
LLM_STUDIO_BASE_URL=http://localhost:1234/v1

# Frontend + API Configuration (container)
NODE_ENV=production
HOSTNAME=0.0.0.0

# LLM Configuration
LMSTUDIO_URL=http://host.docker.internal:1234/v1
LMSTUDIO_API_KEY=lm-studio
LOCAL_MODEL=Llama-3.1-8B-Instruct
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

### Frontend + API Not Starting
```bash
# From docker directory
cd docker

# Check frontend logs
docker-compose logs frontend

# Check if API is responding
curl http://localhost:3001/api/health

# Check if SearxNG is ready
curl http://localhost:8080
```

### LLM Not Working
```bash
# Ensure LLM Studio is running
curl http://localhost:1234/v1/models

# From docker directory
cd docker

# Check backend logs for LLM errors
docker-compose logs backend
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
# Frontend health
curl http://localhost:3001

# API health
curl http://localhost:3001/api/health
```

### API Testing
```bash
# Test chat functionality
curl -X POST http://localhost:3001/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello, how are you?"}]}'
```

## 📁 Project Structure

```
agentic-seek-ts/
├── apps/
│   ├── backend/           # Fastify API server
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/          # Next.js React app
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── packages/              # Shared packages
│   ├── shared/           # TypeScript types & utils
│   ├── llm/             # LLM providers
│   ├── core/            # Core framework
│   └── agents/          # Agent implementations
├── docker/                # 🆕 Docker files moved here
│   ├── docker-compose.yml     # Docker orchestration
│   ├── docker-compose.override.yml
│   ├── start-docker.sh       # Startup script
│   └── README-DOCKER.md      # This file
├── start-services.sh     # Launcher script (project root)
```

## 🎉 Features

- ✅ **Complete Local Setup** - Everything runs in Docker
- ✅ **Privacy-Focused** - No cloud dependencies
- ✅ **AI-Powered** - LLM integration with GPT-OSS
- ✅ **Modern UI** - Built with Next.js and shadcn/ui
- ✅ **Real-time** - Live updates and monitoring
- ✅ **Scalable** - Microservices architecture
- ✅ **Developer Friendly** - Hot reload and debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `./start-docker.sh`
5. Submit a pull request

## 📄 License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.

---

**Happy coding with Scout! 🚀**
