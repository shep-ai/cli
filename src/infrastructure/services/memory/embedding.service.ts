import { pipeline, env } from '@xenova/transformers';
import { homedir } from 'os';
import { join } from 'path';

/**
 * EmbeddingService - Generates embeddings using Transformers.js
 *
 * Uses mixedbread-ai/mxbai-embed-xsmall-v1 model to generate 384-dimensional vectors.
 * Models are cached locally to avoid repeated downloads.
 */
/**
 * Type for the Transformers.js pipeline function result
 */
type EmbeddingPipeline = (text: string) => Promise<{ data: Float32Array }>;

export class EmbeddingService {
  private pipeline: EmbeddingPipeline | null = null;

  constructor() {
    // Configure model cache path to ~/.shep/memory/models/embeddings/
    env.cacheDir = join(homedir(), '.shep', 'memory', 'models', 'embeddings');
  }

  /**
   * Lazy-load the embedding pipeline on first use
   */
  private async initialize(): Promise<void> {
    if (this.pipeline === null) {
      this.pipeline = (await pipeline(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1'
      )) as EmbeddingPipeline;
    }
  }

  /**
   * Generate embedding for a single text
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
   * Generate embeddings for multiple texts
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

    // Process all texts
    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await this.pipeline(text);
      embeddings.push(Array.from(result.data));
    }

    return embeddings;
  }
}
