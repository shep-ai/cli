import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IStructuredAgentCaller } from '@/application/ports/output/agents/structured-agent-caller.interface.js';
import { MetadataGenerator } from '@/application/use-cases/features/create/metadata-generator.js';

describe('MetadataGenerator', () => {
  let mockCaller: IStructuredAgentCaller;
  let generator: MetadataGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCaller = { call: vi.fn() } as any;
    generator = new MetadataGenerator(mockCaller);
  });

  describe('generateMetadata', () => {
    it('should return metadata from AI response', async () => {
      const aiResponse = {
        slug: 'user-auth',
        name: 'User Authentication',
        description: 'Implement OAuth login with GitHub',
      };

      (mockCaller.call as any).mockResolvedValue(aiResponse);

      const result = await generator.generateMetadata('Add GitHub OAuth login');

      expect(result).toEqual({
        slug: 'user-auth',
        name: 'User Authentication',
        description: 'Implement OAuth login with GitHub',
      });
      expect(mockCaller.call).toHaveBeenCalledWith(
        expect.stringContaining('Add GitHub OAuth login'),
        expect.objectContaining({ type: 'object', required: ['slug', 'name', 'description'] }),
        { maxTurns: 10, allowedTools: [], silent: true }
      );
    });

    it('should truncate user input to MAX_INPUT_FOR_AI', async () => {
      const longInput = 'a'.repeat(600);
      const aiResponse = {
        slug: 'test',
        name: 'Test',
        description: 'Test',
      };

      (mockCaller.call as any).mockResolvedValue(aiResponse);

      await generator.generateMetadata(longInput);

      const callArgs = (mockCaller.call as any).mock.calls[0][0];
      expect(callArgs).toContain(`${'a'.repeat(500)}...`);
      expect(callArgs).not.toContain('a'.repeat(600));
    });

    it('should propagate error when AI executor fails', async () => {
      (mockCaller.call as any).mockRejectedValue(new Error('API error'));

      await expect(generator.generateMetadata('Add GitHub OAuth login')).rejects.toThrow(
        'API error'
      );
    });

    it('should throw when AI response missing required fields', async () => {
      (mockCaller.call as any).mockResolvedValue({ slug: 'test' });

      await expect(generator.generateMetadata('Add GitHub OAuth login')).rejects.toThrow(
        'Missing required fields in AI response'
      );
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
