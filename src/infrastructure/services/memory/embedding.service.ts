/**
 * EmbeddingService - Generates embeddings using Transformers.js
 *
 * RED phase: This is a stub to allow tests to compile.
 * Implementation will be added in GREEN phase (Task 3).
 */
export class EmbeddingService {
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(_text: string): Promise<number[]> {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateBatch(_texts: string[]): Promise<number[][]> {
    throw new Error('Not implemented - RED phase stub');
  }
}
