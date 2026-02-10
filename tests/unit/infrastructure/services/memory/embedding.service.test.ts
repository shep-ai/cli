import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmbeddingService } from '@/infrastructure/services/memory/embedding.service';

// Mock @xenova/transformers to avoid downloading models during tests
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(),
  env: {
    cacheDir: '/tmp/test-models',
  },
}));

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  let mockPipeline: any;

  beforeEach(async () => {
    // Create mock pipeline that returns a 384-dim vector
    mockPipeline = vi.fn().mockResolvedValue({
      data: new Float32Array(384).fill(0.5),
    });

    const { pipeline } = await import('@xenova/transformers');
    (pipeline as any).mockResolvedValue(mockPipeline);

    embeddingService = new EmbeddingService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEmbedding()', () => {
    it('should generate 384-dimensional vector for text input', async () => {
      // RED: This test should FAIL because EmbeddingService doesn't exist yet
      const text = 'test input';
      const embedding = await embeddingService.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
      expect(embedding.every((val: number) => typeof val === 'number')).toBe(true);
    });

    it('should throw error for empty string input', async () => {
      // RED: This test should FAIL
      await expect(embeddingService.generateEmbedding('')).rejects.toThrow(
        'Input text cannot be empty'
      );
    });

    it('should throw error for null input', async () => {
      // RED: This test should FAIL
      await expect(embeddingService.generateEmbedding(null as any)).rejects.toThrow(
        'Input text cannot be null or undefined'
      );
    });
  });

  describe('generateBatch()', () => {
    it('should batch process array of texts', async () => {
      // RED: This test should FAIL
      const texts = ['text one', 'text two', 'text three'];
      const embeddings = await embeddingService.generateBatch(texts);

      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(3);
      embeddings.forEach((embedding: number[]) => {
        expect(embedding.length).toBe(384);
        expect(embedding.every((val: number) => typeof val === 'number')).toBe(true);
      });
    });

    it('should handle empty array', async () => {
      // RED: This test should FAIL
      const embeddings = await embeddingService.generateBatch([]);

      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(0);
    });

    it('should process large batches with chunking', async () => {
      // Create 150 texts to trigger batch optimization (>100 threshold)
      const texts = Array.from({ length: 150 }, (_, i) => `text ${i + 1}`);
      const embeddings = await embeddingService.generateBatch(texts);

      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(150);
      embeddings.forEach((embedding: number[]) => {
        expect(embedding.length).toBe(384);
        expect(embedding.every((val: number) => typeof val === 'number')).toBe(true);
      });
    });
  });

  describe('initialize()', () => {
    it('should lazy load model on first call', async () => {
      // RED: This test should FAIL
      const { pipeline } = await import('@xenova/transformers');

      // First call should initialize the pipeline
      await embeddingService.generateEmbedding('test');

      // Pipeline should be called once for initialization
      expect(pipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1'
      );
    });

    it('should not reinitialize on subsequent calls', async () => {
      // RED: This test should FAIL
      const { pipeline } = await import('@xenova/transformers');

      // Make multiple calls
      await embeddingService.generateEmbedding('test 1');
      await embeddingService.generateEmbedding('test 2');

      // Pipeline should only be initialized once
      expect(pipeline).toHaveBeenCalledTimes(1);
    });
  });
});
