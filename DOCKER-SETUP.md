# 🐳 Docker Setup Guide

This guide shows you how to run Claude Context with a complete self-hosted stack using Docker Compose, including:

- **Claude Context MCP Server** - The main semantic search service
- **Qdrant** - High-performance vector database 
- **Ollama** - Local embedding model server with nomic-embed-text

## 🚀 Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- At least 4GB of available RAM (8GB recommended)
- 10GB free disk space for models and data

### 2. Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/zilliztech/claude-context.git
cd claude-context

# Start the complete stack (no .env file needed for defaults!)
docker-compose up -d

# Optional: Only create .env if you want to customize defaults
# cp .env.example .env  # Then edit .env with your customizations
```

### 3. Wait for Services to Initialize

The first startup will take several minutes as it:
- Downloads the Ollama nomic-embed-text model (~280MB)
- Initializes Qdrant database
- Builds the MCP server

Monitor the progress:
```bash
# Watch all logs
docker-compose logs -f

# Watch specific service logs
docker-compose logs -f ollama-setup  # Model download progress
docker-compose logs -f claude-context-mcp  # MCP server
```

### 4. Verify Services

```bash
# Check service status
docker-compose ps

# Test Qdrant
curl http://localhost:6333/health

# Test Ollama
curl http://localhost:11434/api/tags

# Check available models
docker-compose exec ollama ollama list
```

## 📋 Service Details

### Qdrant Vector Database
- **Port**: 6333 (HTTP API), 6334 (gRPC)
- **Web UI**: http://localhost:6333/dashboard
- **Data**: Persisted in Docker volume `qdrant_storage`

### Ollama Embedding Server  
- **Port**: 11434
- **Model**: nomic-embed-text (automatically downloaded)
- **Data**: Persisted in Docker volume `ollama_storage`

### Claude Context MCP Server
- **Protocol**: Model Context Protocol (stdio)
- **Configuration**: Automatically configured to use Ollama + Qdrant
- **Volumes**: Current directory mounted as `/workspace` (read-only)

## ⚙️ Configuration Options

### Environment Variables

Edit your `.env` file to customize the setup:

```bash
# Use OpenAI instead of Ollama
EMBEDDING_PROVIDER=OpenAI
OPENAI_API_KEY=sk-your-key-here

# Use different Ollama model
OLLAMA_MODEL=all-minilm  # Smaller, faster model
OLLAMA_MODEL=nomic-embed-text  # Better quality (default)

# Custom file processing
CUSTOM_EXTENSIONS=.vue,.svelte,.astro
CUSTOM_IGNORE_PATTERNS=static/**,*.tmp

# Performance tuning
EMBEDDING_BATCH_SIZE=50  # Reduce for lower memory usage
```

### Volume Mounting

Mount additional codebases by editing `docker-compose.yml`:

```yaml
claude-context-mcp:
  volumes:
    - ./:/workspace:ro
    - /path/to/your/project:/projects/my-app:ro
    - /another/project:/projects/other-app:ro
```

### Memory Limits

For resource-constrained environments, uncomment memory limits in `.env`:

```bash
OLLAMA_MEMORY_LIMIT=2g
QDRANT_MEMORY_LIMIT=1g
MCP_MEMORY_LIMIT=512m
```

## 🔧 Usage with AI Assistants

### Claude Code

Add the Docker-hosted MCP server to Claude Code:

```bash
# Point to the containerized MCP server
claude mcp add claude-context-docker -- docker exec -i claude-context-mcp node packages/mcp/dist/index.js
```

### Other MCP Clients

Configure your MCP client to execute:
```bash
docker exec -i claude-context-mcp node packages/mcp/dist/index.js
```

## 🐛 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check system resources
docker system df
docker system prune  # Free up space if needed

# Check port conflicts
lsof -i :6333  # Qdrant
lsof -i :11434  # Ollama
```

**Ollama model not downloading:**
```bash
# Manually pull the model
docker-compose exec ollama ollama pull nomic-embed-text

# Check available space
docker exec ollama df -h
```

**MCP server connection issues:**
```bash
# Restart just the MCP service
docker-compose restart claude-context-mcp

# Check logs for errors
docker-compose logs claude-context-mcp
```

**Performance issues:**
```bash
# Monitor resource usage
docker stats

# Reduce batch size in .env
EMBEDDING_BATCH_SIZE=25
```

### GPU Support (Optional)

For NVIDIA GPU acceleration with Ollama, uncomment the GPU section in `docker-compose.yml`:

```yaml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

## 📊 Monitoring and Maintenance

### Health Checks

All services include health checks:
```bash
# View health status
docker-compose ps

# Check specific service health
docker-compose exec qdrant curl -f http://localhost:6333/health
docker-compose exec ollama curl -f http://localhost:11434/api/tags
```

### Data Backup

```bash
# Backup Qdrant data
docker run --rm -v claude-context_qdrant_storage:/data -v $(pwd):/backup ubuntu tar czf /backup/qdrant-backup.tar.gz /data

# Backup Ollama models
docker run --rm -v claude-context_ollama_storage:/data -v $(pwd):/backup ubuntu tar czf /backup/ollama-backup.tar.gz /data
```

### Updates

```bash
# Update images
docker-compose pull

# Rebuild MCP server
docker-compose build --no-cache claude-context-mcp

# Restart services
docker-compose down && docker-compose up -d
```

## 🔧 Advanced Configuration

### Custom Qdrant Configuration

Create `qdrant-config.yaml` and mount it:

```yaml
# In docker-compose.yml, add to qdrant service:
volumes:
  - ./qdrant-config.yaml:/qdrant/config/production.yaml
```

### Custom Ollama Models

```bash
# Pull additional models
docker-compose exec ollama ollama pull codellama:7b-code
docker-compose exec ollama ollama pull mistral:7b

# Use in .env
OLLAMA_MODEL=codellama:7b-code
```

### Production Deployment

For production use:

1. **Use external volumes** for better backup/restore
2. **Set resource limits** based on your infrastructure  
3. **Enable TLS** for Qdrant if exposing publicly
4. **Use secrets management** for API keys
5. **Configure log rotation** to prevent disk filling

Example production `docker-compose.override.yml`:

```yaml
version: '3.8'
services:
  qdrant:
    deploy:
      resources:
        limits:
          memory: 4g
          cpus: '2.0'
    restart: always
    
  ollama:
    deploy:
      resources:
        limits:
          memory: 8g
          cpus: '4.0'
    restart: always
```

## 🎯 Next Steps

1. **Index your first codebase** using the MCP tools in Claude Code
2. **Monitor performance** with Docker stats and Qdrant metrics
3. **Customize file processing** with CUSTOM_EXTENSIONS and CUSTOM_IGNORE_PATTERNS
4. **Scale up** by adding more worker containers if needed

For more details, see the [main README](README.md) and [examples](examples/) directory.