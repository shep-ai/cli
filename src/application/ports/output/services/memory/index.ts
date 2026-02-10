/**
 * Memory Service Port Interfaces
 *
 * Abstractions for the memory layer: embeddings, vector storage, graph storage, and orchestration.
 */

export type { IEmbeddingService, EmbeddingVector } from './embedding-service.interface.js';
export type { IVectorStoreService, VectorSearchResult } from './vector-store-service.interface.js';
export type { IGraphStoreService, SparqlResult } from './graph-store-service.interface.js';
export type { IMemoryService } from './memory-service.interface.js';
