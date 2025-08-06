import { Context, QdrantVectorDatabase, OpenAIEmbedding } from '@zilliz/claude-context-core';
import * as path from 'path';

/**
 * Basic example of using Claude Context with Qdrant vector database
 * 
 * Prerequisites:
 * 1. Qdrant running locally on port 6333 OR Qdrant Cloud cluster
 * 2. OpenAI API key set in environment variables
 */

async function main() {
    console.log('🚀 Claude Context + Qdrant Example');
    
    // Initialize Qdrant vector database
    // Option 1: Local Qdrant
    const vectorDatabase = new QdrantVectorDatabase({
        host: process.env.QDRANT_HOST || 'localhost',
        port: parseInt(process.env.QDRANT_PORT || '6333', 10)
    });
    
    // Option 2: Qdrant Cloud (uncomment and use instead of above)
    // const vectorDatabase = new QdrantVectorDatabase({
    //     url: process.env.QDRANT_URL,
    //     apiKey: process.env.QDRANT_API_KEY
    // });

    // Initialize OpenAI embedding
    const embedding = new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
        model: 'text-embedding-3-small'
    });

    // Create context instance
    const context = new Context({
        embedding,
        vectorDatabase
    });

    console.log('📊 Vector Database: Qdrant');
    console.log('🧠 Embedding Provider: OpenAI');

    // Example: Index a small project directory
    const projectPath = path.join(__dirname, '../basic-usage'); // Use the basic-usage example as test data
    
    try {
        console.log(`\n📁 Indexing codebase: ${projectPath}`);
        
        // Check if index already exists
        const hasIndex = await context.hasIndex(projectPath);
        if (hasIndex) {
            console.log('✅ Index already exists. Clearing and re-indexing...');
            await context.clearIndex(projectPath);
        }

        // Index the codebase with progress tracking
        const stats = await context.indexCodebase(projectPath, (progress) => {
            console.log(`   ${progress.phase} - ${progress.percentage}% (${progress.current}/${progress.total})`);
        });

        console.log(`\n✅ Indexing completed!`);
        console.log(`   📄 Files indexed: ${stats.indexedFiles}`);
        console.log(`   🧩 Total chunks: ${stats.totalChunks}`);
        console.log(`   📊 Status: ${stats.status}`);

        // Perform some example searches
        console.log('\n🔍 Performing semantic searches...');
        
        const queries = [
            'function that imports or requires modules',
            'error handling or try catch',
            'API key or authentication',
            'vector database operations'
        ];

        for (const query of queries) {
            console.log(`\n🔎 Query: "${query}"`);
            const results = await context.semanticSearch(projectPath, query, 3);
            
            if (results.length === 0) {
                console.log('   No results found');
            } else {
                results.forEach((result, index) => {
                    console.log(`   ${index + 1}. ${result.relativePath}:${result.startLine}-${result.endLine} (score: ${result.score.toFixed(3)})`);
                    console.log(`      ${result.content.substring(0, 100).replace(/\n/g, ' ')}...`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error during indexing or search:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});

// Run the example
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});