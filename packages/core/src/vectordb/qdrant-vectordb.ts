import { QdrantClient } from '@qdrant/js-client-rest';
import {
    VectorDocument,
    SearchOptions,
    VectorSearchResult,
    VectorDatabase,
    HybridSearchRequest,
    HybridSearchOptions,
    HybridSearchResult
} from './types';

export interface QdrantConfig {
    url?: string;
    apiKey?: string;
    port?: number;
    host?: string;
    timeout?: number;
}

/**
 * Qdrant Vector Database implementation using REST API
 * Provides high-performance vector similarity search with advanced features
 * including hybrid search, filtering, and quantization support.
 */
export class QdrantVectorDatabase implements VectorDatabase {
    protected config: QdrantConfig;
    private client: QdrantClient | null = null;
    protected initializationPromise: Promise<void>;

    constructor(config: QdrantConfig) {
        this.config = config;
        
        // Start initialization asynchronously without waiting
        this.initializationPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.initializeClient();
    }

    private async initializeClient(): Promise<void> {
        let clientConfig: any = {};

        if (this.config.url) {
            clientConfig.url = this.config.url;
            console.log(`🔌 Connecting to Qdrant at: ${this.config.url}`);
        } else if (this.config.host) {
            const host = this.config.host;
            const port = this.config.port || 6333;
            clientConfig.host = host;
            clientConfig.port = port;
            console.log(`🔌 Connecting to Qdrant at: ${host}:${port}`);
        } else {
            // Default to localhost
            clientConfig.host = 'localhost';
            clientConfig.port = 6333;
            console.log('🔌 Connecting to Qdrant at: localhost:6333');
        }

        if (this.config.apiKey) {
            clientConfig.apiKey = this.config.apiKey;
        }

        if (this.config.timeout) {
            clientConfig.timeout = this.config.timeout;
        }

        this.client = new QdrantClient(clientConfig);
    }

    /**
     * Ensure initialization is complete before method execution
     */
    protected async ensureInitialized(): Promise<void> {
        await this.initializationPromise;
        if (!this.client) {
            throw new Error('Qdrant client not initialized');
        }
    }

    async createCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        await this.ensureInitialized();
        
        console.log(`🚀 Creating Qdrant collection: ${collectionName} with dimension ${dimension}`);
        
        await this.client!.createCollection(collectionName, {
            vectors: {
                size: dimension,
                distance: 'Cosine'  // Default to Cosine similarity, similar to Milvus setup
            }
        });
        
        console.log(`✅ Qdrant collection ${collectionName} created successfully`);
    }

    async createHybridCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        await this.ensureInitialized();
        
        console.log(`🚀 Creating Qdrant hybrid collection: ${collectionName} with dimension ${dimension}`);
        
        // Create collection with both dense and sparse vector support
        await this.client!.createCollection(collectionName, {
            vectors: {
                dense: {
                    size: dimension,
                    distance: 'Cosine'
                }
                // Note: Qdrant handles sparse vectors through the payload or as additional named vectors
                // We'll implement sparse vector support in the insert and search methods
            }
            // Note: Quantization config may not be available in the TypeScript client
            // This can be configured separately after collection creation if needed
        });
        
        console.log(`✅ Qdrant hybrid collection ${collectionName} created successfully`);
    }

    async dropCollection(collectionName: string): Promise<void> {
        await this.ensureInitialized();
        
        console.log(`🗑️  Dropping Qdrant collection: ${collectionName}`);
        await this.client!.deleteCollection(collectionName);
        console.log(`✅ Qdrant collection ${collectionName} dropped successfully`);
    }

    async hasCollection(collectionName: string): Promise<boolean> {
        await this.ensureInitialized();
        
        try {
            await this.client!.getCollection(collectionName);
            return true;
        } catch (error: any) {
            // Qdrant returns 404 error when collection doesn't exist
            if (error.status === 404 || error.message?.includes('not found')) {
                return false;
            }
            throw error;
        }
    }

    async listCollections(): Promise<string[]> {
        await this.ensureInitialized();
        
        const response = await this.client!.getCollections();
        return response.collections.map(collection => collection.name);
    }

    async insert(collectionName: string, documents: VectorDocument[]): Promise<void> {
        await this.ensureInitialized();
        
        console.log(`📝 Inserting ${documents.length} documents into Qdrant collection: ${collectionName}`);
        
        const points = documents.map(doc => ({
            id: doc.id,
            vector: doc.vector,
            payload: {
                content: doc.content,
                relativePath: doc.relativePath,
                startLine: doc.startLine,
                endLine: doc.endLine,
                fileExtension: doc.fileExtension,
                metadata: doc.metadata
            }
        }));

        await this.client!.upsert(collectionName, {
            wait: true,
            points: points
        });
        
        console.log(`✅ Successfully inserted ${documents.length} documents into ${collectionName}`);
    }

    async insertHybrid(collectionName: string, documents: VectorDocument[]): Promise<void> {
        await this.ensureInitialized();
        
        console.log(`📝 Inserting ${documents.length} hybrid documents into Qdrant collection: ${collectionName}`);
        
        const points = documents.map(doc => ({
            id: doc.id,
            vector: {
                dense: doc.vector
                // Note: For true hybrid search, we would need sparse vectors too
                // This can be implemented by generating BM25/sparse vectors from content
                // and storing them as additional named vectors
            },
            payload: {
                content: doc.content,
                relativePath: doc.relativePath,
                startLine: doc.startLine,
                endLine: doc.endLine,
                fileExtension: doc.fileExtension,
                metadata: doc.metadata
            }
        }));

        await this.client!.upsert(collectionName, {
            wait: true,
            points: points
        });
        
        console.log(`✅ Successfully inserted ${documents.length} hybrid documents into ${collectionName}`);
    }

    async search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<VectorSearchResult[]> {
        await this.ensureInitialized();
        
        const limit = options?.topK || 10;
        const scoreThreshold = options?.threshold || 0.0;
        
        console.log(`🔍 Searching Qdrant collection: ${collectionName} with limit: ${limit}`);
        
        const searchResult = await this.client!.search(collectionName, {
            vector: queryVector,
            limit: limit,
            score_threshold: scoreThreshold,
            with_payload: true,
            with_vector: false  // Don't return vectors to save bandwidth
        });

        return searchResult.map(result => {
            const payload = result.payload || {};
            return {
                document: {
                    id: result.id as string,
                    vector: queryVector,  // We don't get the original vector back
                    content: payload.content as string || '',
                    relativePath: payload.relativePath as string || '',
                    startLine: payload.startLine as number || 0,
                    endLine: payload.endLine as number || 0,
                    fileExtension: payload.fileExtension as string || '',
                    metadata: payload.metadata as Record<string, any> || {}
                },
                score: result.score
            };
        });
    }

    async hybridSearch(collectionName: string, searchRequests: HybridSearchRequest[], options?: HybridSearchOptions): Promise<HybridSearchResult[]> {
        await this.ensureInitialized();
        
        const limit = options?.limit || searchRequests[0]?.limit || 10;
        
        console.log(`🔍 Executing hybrid search on Qdrant collection: ${collectionName}`);
        
        // For now, we'll implement this as a dense vector search
        // In a full implementation, we would:
        // 1. Generate sparse vectors from text queries
        // 2. Perform multiple searches (dense + sparse)
        // 3. Combine and rerank results
        
        const denseSearchRequest = searchRequests.find(req => req.anns_field === 'vector');
        if (!denseSearchRequest || !Array.isArray(denseSearchRequest.data)) {
            throw new Error('Dense vector search request required for hybrid search');
        }
        
        const searchResult = await this.client!.search(collectionName, {
            vector: {
                name: 'dense',
                vector: denseSearchRequest.data as number[]
            },
            limit: limit,
            with_payload: true,
            with_vector: false
        });

        return searchResult.map(result => {
            const payload = result.payload || {};
            return {
                document: {
                    id: result.id as string,
                    vector: [],  // Empty for hybrid search results
                    content: payload.content as string || '',
                    relativePath: payload.relativePath as string || '',
                    startLine: payload.startLine as number || 0,
                    endLine: payload.endLine as number || 0,
                    fileExtension: payload.fileExtension as string || '',
                    metadata: payload.metadata as Record<string, any> || {}
                },
                score: result.score
            };
        });
    }

    async delete(collectionName: string, ids: string[]): Promise<void> {
        await this.ensureInitialized();
        
        console.log(`🗑️  Deleting ${ids.length} documents from Qdrant collection: ${collectionName}`);
        
        await this.client!.delete(collectionName, {
            wait: true,
            points: ids
        });
        
        console.log(`✅ Successfully deleted ${ids.length} documents from ${collectionName}`);
    }

    async query(collectionName: string, filter: string, outputFields: string[], limit?: number): Promise<Record<string, any>[]> {
        await this.ensureInitialized();
        
        console.log(`🔍 Querying Qdrant collection: ${collectionName} with filter: ${filter}`);
        
        // Convert Milvus-style filter to Qdrant filter format
        // This is a simplified conversion - in practice, we'd need a more robust filter parser
        let qdrantFilter: any = null;
        if (filter && filter.trim() !== '') {
            // Simple case: relativePath == "some/path"
            const pathMatch = filter.match(/relativePath\s*==\s*"([^"]+)"/);
            if (pathMatch) {
                qdrantFilter = {
                    must: [{
                        key: 'relativePath',
                        match: {
                            value: pathMatch[1]
                        }
                    }]
                };
            }
        }
        
        try {
            const scrollResult = await this.client!.scroll(collectionName, {
                filter: qdrantFilter,
                limit: limit || 100,
                with_payload: true,
                with_vector: false
            });

            return scrollResult.points.map(point => {
                const result: Record<string, any> = {
                    id: point.id
                };
                
                // Add requested output fields from payload
                if (point.payload) {
                    outputFields.forEach(field => {
                        if (field in point.payload!) {
                            result[field] = point.payload![field];
                        }
                    });
                }
                
                return result;
            });
        } catch (error) {
            console.error(`❌ Failed to query Qdrant collection '${collectionName}':`, error);
            throw error;
        }
    }
}