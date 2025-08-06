# Qdrant Usage Example

This example demonstrates how to use Claude Context with Qdrant as the vector database backend.

## Prerequisites

1. **Qdrant Server**: You can run Qdrant locally or use Qdrant Cloud
   
   **Local Installation (Docker):**
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```
   
   **Qdrant Cloud:** Sign up at [cloud.qdrant.io](https://cloud.qdrant.io/) and get your cluster URL and API key.

2. **OpenAI API Key**: Get your API key from [platform.openai.com](https://platform.openai.com/api-keys)

## Configuration Options

### Option 1: Local Qdrant
```bash
export OPENAI_API_KEY=sk-your-openai-api-key
export VECTOR_DATABASE=Qdrant
export QDRANT_HOST=localhost
export QDRANT_PORT=6333
```

### Option 2: Qdrant Cloud
```bash
export OPENAI_API_KEY=sk-your-openai-api-key
export VECTOR_DATABASE=Qdrant
export QDRANT_URL=https://your-cluster-url.qdrant.io
export QDRANT_API_KEY=your-qdrant-api-key
```

### Option 3: Using Qdrant with Different Embedding Providers

**With Ollama:**
```bash
export EMBEDDING_PROVIDER=Ollama
export EMBEDDING_MODEL=nomic-embed-text
export VECTOR_DATABASE=Qdrant
export QDRANT_HOST=localhost
```

**With VoyageAI:**
```bash
export EMBEDDING_PROVIDER=VoyageAI
export VOYAGEAI_API_KEY=pa-your-voyage-api-key
export VECTOR_DATABASE=Qdrant
export QDRANT_URL=https://your-cluster-url.qdrant.io
export QDRANT_API_KEY=your-qdrant-api-key
```

## Running with MCP Server

```bash
# Set your environment variables (choose one option above)
export OPENAI_API_KEY=sk-your-openai-api-key
export VECTOR_DATABASE=Qdrant
export QDRANT_HOST=localhost

# Start the MCP server
npx @zilliz/claude-context-mcp@latest
```

## Programmatic Usage

You can also use Qdrant directly in your code:

```typescript
import { Context, QdrantVectorDatabase, OpenAIEmbedding } from '@zilliz/claude-context-core';

// Initialize Qdrant vector database
const vectorDatabase = new QdrantVectorDatabase({
    url: 'https://your-cluster-url.qdrant.io',
    apiKey: 'your-qdrant-api-key'
    // OR for local:
    // host: 'localhost',
    // port: 6333
});

// Initialize embedding provider
const embedding = new OpenAIEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-small'
});

// Create context instance
const context = new Context({
    embedding,
    vectorDatabase
});

// Index your codebase
const stats = await context.indexCodebase('./your-project', (progress) => {
    console.log(`${progress.phase} - ${progress.percentage}%`);
});
console.log(`Indexed ${stats.indexedFiles} files, ${stats.totalChunks} chunks`);

// Perform semantic search
const results = await context.semanticSearch('./your-project', 'authentication functions', 5);
console.log('Search results:', results);
```

## Advantages of Using Qdrant

1. **Performance**: Up to 40x faster searches with binary quantization
2. **Memory Efficiency**: Up to 97% less RAM usage with built-in quantization
3. **Advanced Filtering**: Rich payload filtering capabilities
4. **Real-time Updates**: Efficient incremental indexing
5. **Hybrid Search**: Native support for dense + sparse vector combinations
6. **Multiple Deployment Options**: Local, cloud, or self-hosted

## Troubleshooting

### Connection Issues
- Ensure Qdrant is running on the specified host/port
- For Qdrant Cloud, verify your cluster URL and API key
- Check firewall settings for local deployments

### Performance Optimization
- Use quantization for large collections
- Enable async indexing for better throughput
- Configure appropriate batch sizes for your use case

### Environment Variables
Run the MCP server with `--help` to see all available environment variables:
```bash
npx @zilliz/claude-context-mcp@latest --help
```