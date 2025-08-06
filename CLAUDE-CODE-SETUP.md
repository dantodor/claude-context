# 🤖 Claude Code Integration Guide

This guide shows you how to configure Claude Code to use your Docker-hosted Claude Context MCP server for semantic code search.

## 📋 Prerequisites

1. **Docker Setup Running**: Make sure your Claude Context Docker stack is running
   ```bash
   docker-compose ps  # Should show all services as "Up (healthy)"
   ```

2. **Claude Code Installed**: Ensure you have Claude Code CLI installed
   ```bash
   claude --version  # Should show version info
   ```

## 🚀 Quick Setup

### Step 1: Add MCP Server to Claude Code

```bash
# Add the Docker-hosted MCP server
claude mcp add claude-context-docker -- docker exec -i claude-context-mcp node packages/mcp/dist/index.js
```

### Step 2: Verify Installation

```bash
# List configured MCP servers
claude mcp list

# You should see "claude-context-docker" in the list
```

### Step 3: Test the Integration

Open Claude Code and try these commands:

```
Please check what MCP tools are available
```

You should see these tools:
- ✅ `index_codebase` - Index a codebase for semantic search
- ✅ `search_code` - Search indexed codebases 
- ✅ `clear_index` - Clear search indexes
- ✅ `get_indexing_status` - Check indexing progress

## 🔧 Alternative Configuration Methods

### Method 1: Manual MCP Configuration

If the CLI method doesn't work, you can configure manually:

1. Open Claude Code settings
2. Navigate to MCP Servers section
3. Add a new server with:
   - **Name**: `claude-context-docker`
   - **Command**: `docker`
   - **Args**: `["exec", "-i", "claude-context-mcp", "node", "packages/mcp/dist/index.js"]`

### Method 2: Shell Wrapper Script

Create a wrapper script for easier management:

```bash
# Create wrapper script
cat > ~/claude-context-docker.sh << 'EOF'
#!/bin/bash
docker exec -i claude-context-mcp node packages/mcp/dist/index.js
EOF

# Make executable
chmod +x ~/claude-context-docker.sh

# Add to Claude Code
claude mcp add claude-context-docker -- ~/claude-context-docker.sh
```

### Method 3: Direct JSON Configuration

If you prefer direct configuration, add this to your Claude Code MCP settings JSON:

```json
{
  "mcpServers": {
    "claude-context-docker": {
      "command": "docker",
      "args": ["exec", "-i", "claude-context-mcp", "node", "packages/mcp/dist/index.js"]
    }
  }
}
```

## 📝 Usage Examples

Once configured, you can use natural language to interact with your codebase:

### Index a Codebase

```
Please index the codebase at /Users/myname/projects/my-app
```

Expected response: The system will start indexing and show progress updates.

### Search for Code

```
Find functions that handle user authentication in /Users/myname/projects/my-app
```

```
Show me error handling patterns in /Users/myname/projects/my-app
```

```
Find API endpoints related to user management in /Users/myname/projects/my-app
```

### Check Indexing Status

```
What's the indexing status for /Users/myname/projects/my-app?
```

### Clear Index

```
Clear the search index for /Users/myname/projects/my-app
```

## 🛠️ Troubleshooting

### Issue: MCP Server Not Responding

**Symptoms**: Tools don't appear or give "connection error"

**Solutions**:
```bash
# 1. Check if Docker containers are running
docker-compose ps

# 2. Check MCP server logs
docker-compose logs claude-context-mcp

# 3. Restart MCP server
docker-compose restart claude-context-mcp

# 4. Remove and re-add the MCP server
claude mcp remove claude-context-docker
claude mcp add claude-context-docker -- docker exec -i claude-context-mcp node packages/mcp/dist/index.js
```

### Issue: Docker Permission Denied

**Symptoms**: "permission denied" when executing docker commands

**Solutions**:
```bash
# Check Docker daemon is running
docker ps

# On Linux/macOS, add user to docker group
sudo usermod -aG docker $USER
# Then logout and login again

# Or run Claude Code with sufficient permissions
```

### Issue: Services Not Healthy

**Symptoms**: MCP server starts but tools don't work properly

**Solutions**:
```bash
# Check individual service health
docker-compose exec qdrant curl http://localhost:6333/health
docker-compose exec ollama curl http://localhost:11434/api/tags

# View detailed service logs
docker-compose logs qdrant
docker-compose logs ollama
docker-compose logs claude-context-mcp

# If Ollama model isn't loaded, manually pull it
docker-compose exec ollama ollama pull nomic-embed-text
```

### Issue: Indexing Fails

**Symptoms**: "Failed to index codebase" errors

**Solutions**:
```bash
# 1. Check if path is accessible from container
docker-compose exec claude-context-mcp ls -la /workspace

# 2. Ensure proper path mounting in docker-compose.yml
# The path should be mounted as a volume

# 3. Check available disk space
docker system df

# 4. Check MCP server logs for specific errors
docker-compose logs claude-context-mcp
```

### Issue: Search Returns No Results

**Symptoms**: Search completes but finds no matches

**Solutions**:
1. **Verify indexing completed**: Check indexing status first
2. **Try broader search terms**: Start with general terms
3. **Check file types**: Ensure your file extensions are supported
4. **Review ignore patterns**: Make sure important files aren't being ignored

## 🔄 Updating the Setup

### Updating Docker Images

```bash
# Pull latest images
docker-compose pull

# Rebuild MCP server
docker-compose build --no-cache claude-context-mcp

# Restart services
docker-compose down && docker-compose up -d
```

### Updating MCP Configuration

```bash
# Remove old configuration
claude mcp remove claude-context-docker

# Add new configuration
claude mcp add claude-context-docker -- docker exec -i claude-context-mcp node packages/mcp/dist/index.js

# Restart Claude Code to pick up changes
```

## 🔧 Advanced Configuration

### Using Different Embedding Models

To use a different Ollama model, modify your setup:

```bash
# Pull a different model
docker-compose exec ollama ollama pull codellama:7b-code

# Update environment variable
echo "OLLAMA_MODEL=codellama:7b-code" >> .env

# Restart MCP server
docker-compose restart claude-context-mcp
```

### Performance Tuning

For better performance with large codebases:

```bash
# Create/edit .env file
cat > .env << 'EOF'
# Increase batch size for faster indexing
EMBEDDING_BATCH_SIZE=200

# Set memory limits to prevent OOM
OLLAMA_MEMORY_LIMIT=6g
QDRANT_MEMORY_LIMIT=4g
MCP_MEMORY_LIMIT=2g
EOF

# Restart services
docker-compose down && docker-compose up -d
```

### Custom File Extensions

To index additional file types:

```bash
# Add to .env file
echo "CUSTOM_EXTENSIONS=.vue,.svelte,.astro,.razor" >> .env

# Restart MCP server
docker-compose restart claude-context-mcp
```

## 📊 Monitoring and Maintenance

### Health Monitoring

```bash
# Check all service health
docker-compose ps

# View resource usage
docker stats

# Check Qdrant web interface
open http://localhost:6333/dashboard
```

### Data Backup

```bash
# Backup Qdrant data
docker run --rm -v claude-context_qdrant_storage:/data -v $(pwd):/backup ubuntu tar czf /backup/qdrant-backup.tar.gz /data

# Backup Ollama models
docker run --rm -v claude-context_ollama_storage:/data -v $(pwd):/backup ubuntu tar czf /backup/ollama-backup.tar.gz /data
```

## 🎯 Best Practices

1. **Path Management**: Always use absolute paths when indexing codebases
2. **Resource Monitoring**: Keep an eye on Docker resource usage for large codebases
3. **Regular Updates**: Update Docker images periodically for latest features
4. **Backup Strategy**: Regularly backup your indexed data
5. **Testing**: Test the setup with a small codebase first

## 📚 Next Steps

Once you have Claude Code configured:

1. **Start with small projects** to test functionality
2. **Experiment with search queries** to understand capabilities
3. **Monitor performance** and adjust settings as needed
4. **Explore advanced features** like custom file processing
5. **Share feedback** with the Claude Context community

For more advanced usage patterns and troubleshooting, see:
- [Docker Setup Guide](DOCKER-SETUP.md)
- [Main README](README.md)
- [Examples directory](examples/)