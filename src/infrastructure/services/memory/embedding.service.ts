import { pipeline, env } from '@xenova/transformers';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Model configuration constants
 */
const MODEL_NAME = 'mixedbread-ai/mxbai-embed-xsmall-v1';
/** Embedding dimension for the model (exported for documentation) */
export const EMBEDDING_DIM = 384;
const CACHE_DIR = join(homedir(), '.shep', 'memory', 'models', 'embeddings');

/**
 * Batch processing constants
 */
const BATCH_SIZE = 32;
const PROGRESS_LOG_THRESHOLD = 10;

/**
 * Type for the Transformers.js pipeline function result
 */
type EmbeddingPipeline = (text: string) => Promise<{ data: Float32Array }>;

/**
 * EmbeddingService - Generates embeddings using Transformers.js
 *
 * Uses mixedbread-ai/mxbai-embed-xsmall-v1 model to generate 384-dimensional vectors.
 * Models are cached locally to avoid repeated downloads.
 *
 * @example
 * ```typescript
 * const service = new EmbeddingService();
 * const embedding = await service.generateEmbedding('Hello world');
 * console.log(embedding.length); // 384
 * ```
 */
export class EmbeddingService {
  private pipeline: EmbeddingPipeline | null = null;

  constructor() {
    // Configure model cache path
    env.cacheDir = CACHE_DIR;
  }

  /**
   * Lazy-load the embedding pipeline on first use
   * @private
   */
  private async initialize(): Promise<void> {
    this.pipeline ??= (await pipeline('feature-extraction', MODEL_NAME)) as EmbeddingPipeline;
  }

  /**
   * Generate a 384-dimensional embedding vector for a single text input
   *
   * @param text - The text to generate an embedding for
   * @returns A 384-dimensional embedding vector
   * @throws {Error} If text is null, undefined, or empty
   *
   * @example
   * ```typescript
   * const embedding = await service.generateEmbedding('Hello world');
   * console.log(embedding.length); // 384
   * ```
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Validate input
    if (text === null || text === undefined) {
      throw new Error('Input text cannot be null or undefined');
    }
    if (text === '') {
      throw new Error('Input text cannot be empty');
    }

    // Lazy-load pipeline
    await this.initialize();

    // Pipeline should be initialized at this point
    if (!this.pipeline) {
      throw new Error('Failed to initialize embedding pipeline');
    }

    // Generate embedding
    const result = await this.pipeline(text);
    return Array.from(result.data);
  }

  /**
   * Generate embeddings for multiple texts with automatic batching
   *
   * For large arrays (>100 texts), automatically chunks into batches of 32
   * to optimize memory usage and processing speed.
   *
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of 384-dimensional embedding vectors
   *
   * @example
   * ```typescript
   * const texts = ['Hello', 'World', 'Test'];
   * const embeddings = await service.generateBatch(texts);
   * console.log(embeddings.length); // 3
   * console.log(embeddings[0].length); // 384
   * ```
   */
  async generateBatch(texts: string[]): Promise<number[][]> {
    // Handle empty array
    if (texts.length === 0) {
      return [];
    }

    // Lazy-load pipeline
    await this.initialize();

    // Pipeline should be initialized at this point
    if (!this.pipeline) {
      throw new Error('Failed to initialize embedding pipeline');
    }

    // Show progress for large batches
    if (texts.length > PROGRESS_LOG_THRESHOLD) {
      // eslint-disable-next-line no-console
      console.log(`Generating embeddings for ${texts.length} texts...`);
    }

    const embeddings: number[][] = [];

    // Optimize batch processing for large arrays
    if (texts.length > 100) {
      // Chunk into batches of 32
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const chunk = texts.slice(i, i + BATCH_SIZE);
        const chunkNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalChunks = Math.ceil(texts.length / BATCH_SIZE);

        // eslint-disable-next-line no-console
        console.log(`Processing batch ${chunkNum}/${totalChunks}...`);

        for (const text of chunk) {
          const result = await this.pipeline(text);
          embeddings.push(Array.from(result.data));
        }
      }
    } else {
      // Process all texts directly for small arrays
      for (const text of texts) {
        const result = await this.pipeline(text);
        embeddings.push(Array.from(result.data));
      }
    }

    return embeddings;
  }
}
