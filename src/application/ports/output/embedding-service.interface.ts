/**
 * IEmbeddingService - Port interface for embedding generation
 *
 * Defines the contract for generating vector embeddings from text.
 * Implementations should provide local embedding generation without
 * requiring external API keys.
 *
 * @example
 * ```typescript
 * class TransformersEmbeddingService implements IEmbeddingService {
 *   async generateEmbedding(text: string): Promise<number[]> {
 *     // Use Transformers.js to generate embedding
 *     return embedding;
 *   }
 *
 *   async generateBatch(texts: string[]): Promise<number[][]> {
 *     // Batch process multiple texts
 *     return embeddings;
 *   }
 * }
 * ```
 */

/**
 * Type alias for embedding vectors
 * Standard dimension is 384 for mixedbread-ai/mxbai-embed-xsmall-v1
 */
export type EmbeddingVector = number[];

/**
 * Embedding service interface for generating vector embeddings from text
 */
export interface IEmbeddingService {
  /**
   * Generate embedding vector for a single text input
   *
   * @param text - Input text to embed (must not be empty)
   * @returns Promise resolving to embedding vector (typically 384-dimensional)
   * @throws Error if text is empty or null
   *
   * @example
   * ```typescript
   * const embedding = await embeddingService.generateEmbedding('Hello world');
   * console.log(embedding.length); // 384
   * ```
   */
  generateEmbedding(text: string): Promise<EmbeddingVector>;

  /**
   * Generate embeddings for multiple texts in a single batch
   *
   * More efficient than calling generateEmbedding multiple times.
   * Implementations should optimize batch processing (e.g., chunking large batches).
   *
   * @param texts - Array of input texts to embed
   * @returns Promise resolving to array of embedding vectors
   * @throws Error if any text is empty or null
   *
   * @example
   * ```typescript
   * const embeddings = await embeddingService.generateBatch([
   *   'First text',
   *   'Second text',
   *   'Third text'
   * ]);
   * console.log(embeddings.length); // 3
   * console.log(embeddings[0].length); // 384
   * ```
   */
  generateBatch(texts: string[]): Promise<EmbeddingVector[]>;
}
