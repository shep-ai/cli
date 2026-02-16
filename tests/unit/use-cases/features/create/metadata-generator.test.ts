import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IAgentExecutor } from '../../../../../src/application/ports/output/agents/agent-executor.interface.js';
import type { IAgentExecutorProvider } from '../../../../../src/application/ports/output/agents/agent-executor-provider.interface.js';
import { MetadataGenerator } from '../../../../../src/application/use-cases/features/create/metadata-generator.js';

describe('MetadataGenerator', () => {
  let mockExecutor: IAgentExecutor;
  let mockProvider: IAgentExecutorProvider;
  let generator: MetadataGenerator;

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn(),
    } as any;

    mockProvider = {
      getExecutor: vi.fn().mockReturnValue(mockExecutor),
    } as any;

    generator = new MetadataGenerator(mockProvider);
  });

  describe('generateMetadata', () => {
    it('should return metadata from AI response with valid JSON', async () => {
      const aiResponse = {
        slug: 'user-auth',
        name: 'User Authentication',
        description: 'Implement OAuth login with GitHub',
      };

      (mockExecutor.execute as any).mockResolvedValue({
        result: JSON.stringify(aiResponse),
      });

      const result = await generator.generateMetadata('Add GitHub OAuth login');

      expect(result).toEqual({
        slug: 'user-auth',
        name: 'User Authentication',
        description: 'Implement OAuth login with GitHub',
      });
      expect(mockProvider.getExecutor).toHaveBeenCalled();
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should truncate user input to MAX_INPUT_FOR_AI', async () => {
      const longInput = 'a'.repeat(600);
      const aiResponse = {
        slug: 'test',
        name: 'Test',
        description: 'Test',
      };

      (mockExecutor.execute as any).mockResolvedValue({
        result: JSON.stringify(aiResponse),
      });

      await generator.generateMetadata(longInput);

      const callArgs = (mockExecutor.execute as any).mock.calls[0][0];
      // Check that the truncated part is in the prompt
      expect(callArgs).toContain(`${'a'.repeat(500)}...`);
      // The actual prompt will be longer due to the surrounding text, but the input should be capped
      expect(callArgs).not.toContain('a'.repeat(600));
    });

    it('should propagate error when AI executor fails', async () => {
      (mockExecutor.execute as any).mockRejectedValue(new Error('API error'));

      await expect(generator.generateMetadata('Add GitHub OAuth login')).rejects.toThrow(
        'API error'
      );
    });

    it('should propagate error when AI returns invalid JSON', async () => {
      (mockExecutor.execute as any).mockResolvedValue({
        result: 'not valid json',
      });

      await expect(generator.generateMetadata('Add GitHub OAuth login')).rejects.toThrow();
    });

    it('should propagate error when AI response missing required fields', async () => {
      (mockExecutor.execute as any).mockResolvedValue({
        result: JSON.stringify({ slug: 'test' }), // missing name and description
      });

      await expect(generator.generateMetadata('Add GitHub OAuth login')).rejects.toThrow(
        'Missing required fields in AI response'
      );
    });
  });

  describe('stripCodeFence', () => {
    it('should strip ```json wrapper', () => {
      const input = '```json\n{"slug": "test"}\n```';
      const result = generator['stripCodeFence'](input);
      expect(result).toBe('{"slug": "test"}');
    });

    it('should strip ```any-language wrapper', () => {
      const input = '```typescript\n{"slug": "test"}\n```';
      const result = generator['stripCodeFence'](input);
      expect(result).toBe('{"slug": "test"}');
    });

    it('should strip ``` wrapper with no language', () => {
      const input = '```\n{"slug": "test"}\n```';
      const result = generator['stripCodeFence'](input);
      expect(result).toBe('{"slug": "test"}');
    });

    it('should return raw JSON untouched', () => {
      const input = '{"slug": "test"}';
      const result = generator['stripCodeFence'](input);
      expect(result).toBe('{"slug": "test"}');
    });

    it('should handle whitespace around fenced block', () => {
      const input = '  \n```json\n{"slug": "test"}\n```\n  ';
      const result = generator['stripCodeFence'](input);
      expect(result).toBe('{"slug": "test"}');
    });

    it('should not strip if only opening fence', () => {
      const input = '```json\n{"slug": "test"}';
      const result = generator['stripCodeFence'](input);
      expect(result).toBe('```json\n{"slug": "test"}');
    });
  });

  describe('toSlug', () => {
    it('should convert text to kebab-case', () => {
      const result = generator['toSlug']('User Authentication Module');
      expect(result).toBe('user-authentication-module');
    });

    it('should remove special characters', () => {
      const result = generator['toSlug']('User@Auth#$%Module');
      expect(result).toBe('userauthmodule');
    });

    it('should handle multiple spaces', () => {
      const result = generator['toSlug']('User    Auth    Module');
      expect(result).toBe('user-auth-module');
    });

    it('should remove leading and trailing dashes', () => {
      const result = generator['toSlug']('---user-auth---');
      expect(result).toBe('user-auth');
    });

    it('should truncate to 50 characters at word boundary', () => {
      const longText = 'this-is-a-very-long-slug-that-exceeds-fifty-characters-limit';
      const result = generator['toSlug'](longText);

      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toMatch(/-$/); // No trailing dash
    });

    it('should handle text shorter than 50 characters', () => {
      const result = generator['toSlug']('short-slug');
      expect(result).toBe('short-slug');
    });

    it('should convert to lowercase', () => {
      const result = generator['toSlug']('UPPERCASE TEXT');
      expect(result).toBe('uppercase-text');
    });

    it('should collapse multiple consecutive dashes', () => {
      const result = generator['toSlug']('user---auth---module');
      expect(result).toBe('user-auth-module');
    });
  });
});
