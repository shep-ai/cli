import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

    it('should truncate user input exceeding combined limit', async () => {
      // Without a file reference, the effective limit is MAX_INPUT_FOR_AI + MAX_FILE_CONTENT_FOR_AI = 4500
      // So 600 chars is below that limit and should not be truncated
      const longInput = 'a'.repeat(5000);
      const aiResponse = {
        slug: 'test',
        name: 'Test',
        description: 'Test',
      };

      (mockCaller.call as any).mockResolvedValue(aiResponse);

      await generator.generateMetadata(longInput);

      const callArgs = (mockCaller.call as any).mock.calls[0][0];
      // Should be truncated since 5000 > 4500
      expect(callArgs).toContain('...');
      expect(callArgs).not.toContain('a'.repeat(5000));
    });

    it('should fall back to local extraction when AI executor fails', async () => {
      (mockCaller.call as any).mockRejectedValue(new Error('API error'));

      const result = await generator.generateMetadata('Add GitHub OAuth login');

      expect(result.slug).toBe('add-github-oauth-login');
      expect(result.name).toBeTruthy();
      expect(result.description).toBe('Add GitHub OAuth login');
    });

    it('should fall back to local extraction when AI response missing required fields', async () => {
      (mockCaller.call as any).mockResolvedValue({ slug: 'test' });

      const result = await generator.generateMetadata('Add GitHub OAuth login');

      expect(result.slug).toBe('add-github-oauth-login');
      expect(result.description).toBe('Add GitHub OAuth login');
    });

    it('should include file content in prompt when user input references a file', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'meta-gen-'));
      const specContent =
        '# API Rate Limiting\n\nImplement rate limiting for all public API endpoints.';
      writeFileSync(join(tmpDir, 'SPEC.md'), specContent, 'utf-8');

      const aiResponse = {
        slug: 'api-rate-limiting',
        name: 'API Rate Limiting',
        description: 'Implement rate limiting for all public API endpoints',
      };
      (mockCaller.call as any).mockResolvedValue(aiResponse);

      const result = await generator.generateMetadata(
        'Develop based on the current SPEC.md',
        undefined,
        tmpDir
      );

      expect(result).toEqual({
        slug: 'api-rate-limiting',
        name: 'API Rate Limiting',
        description: 'Implement rate limiting for all public API endpoints',
      });

      const callArgs = (mockCaller.call as any).mock.calls[0][0];
      expect(callArgs).toContain('API Rate Limiting');
      expect(callArgs).toContain('rate limiting for all public API endpoints');
      expect(callArgs).toContain(
        'Derive the feature name, slug, and description from the FILE CONTENT'
      );

      rmSync(tmpDir, { recursive: true });
    });

    it('should not include file hint when no file reference in user input', async () => {
      const aiResponse = {
        slug: 'user-auth',
        name: 'User Authentication',
        description: 'Add auth',
      };
      (mockCaller.call as any).mockResolvedValue(aiResponse);

      await generator.generateMetadata('Add user authentication', undefined, '/some/path');

      const callArgs = (mockCaller.call as any).mock.calls[0][0];
      expect(callArgs).not.toContain('FILE CONTENT');
    });

    it('should gracefully handle missing file reference', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'meta-gen-'));

      const aiResponse = {
        slug: 'some-feature',
        name: 'Some Feature',
        description: 'A feature',
      };
      (mockCaller.call as any).mockResolvedValue(aiResponse);

      await generator.generateMetadata('Develop based on the current SPEC.md', undefined, tmpDir);

      // Should still work, just without file content
      const callArgs = (mockCaller.call as any).mock.calls[0][0];
      expect(callArgs).not.toContain('FILE CONTENT');

      rmSync(tmpDir, { recursive: true });
    });
  });

  describe('resolveFileReference', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'meta-gen-ref-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true });
    });

    it('should resolve SPEC.md from "Develop based on the current SPEC.md"', () => {
      writeFileSync(join(tmpDir, 'SPEC.md'), '# My Feature\nDescription here', 'utf-8');
      const result = generator.resolveFileReference('Develop based on the current SPEC.md', tmpDir);
      expect(result).toContain('# My Feature');
      expect(result).toContain('Description here');
    });

    it('should resolve spec.md from "based on spec.md"', () => {
      writeFileSync(join(tmpDir, 'spec.md'), '# Lower case spec', 'utf-8');
      const result = generator.resolveFileReference('based on spec.md', tmpDir);
      expect(result).toContain('# Lower case spec');
    });

    it('should resolve from "use ./requirements.yaml"', () => {
      writeFileSync(join(tmpDir, 'requirements.yaml'), 'name: test-feature', 'utf-8');
      const result = generator.resolveFileReference('use ./requirements.yaml', tmpDir);
      expect(result).toContain('name: test-feature');
    });

    it('should resolve from "using SPEC.md"', () => {
      writeFileSync(join(tmpDir, 'SPEC.md'), '# Using test', 'utf-8');
      const result = generator.resolveFileReference('using SPEC.md', tmpDir);
      expect(result).toContain('# Using test');
    });

    it('should resolve from "see requirements.txt"', () => {
      writeFileSync(join(tmpDir, 'requirements.txt'), 'Feature requirements', 'utf-8');
      const result = generator.resolveFileReference('see requirements.txt', tmpDir);
      expect(result).toContain('Feature requirements');
    });

    it('should return undefined when no file reference pattern found', () => {
      const result = generator.resolveFileReference('Add user authentication', tmpDir);
      expect(result).toBeUndefined();
    });

    it('should return undefined when referenced file does not exist', () => {
      const result = generator.resolveFileReference('based on SPEC.md', tmpDir);
      expect(result).toBeUndefined();
    });

    it('should return undefined when file is empty', () => {
      writeFileSync(join(tmpDir, 'SPEC.md'), '', 'utf-8');
      const result = generator.resolveFileReference('based on SPEC.md', tmpDir);
      expect(result).toBeUndefined();
    });

    it('should truncate large file content', () => {
      const largeContent = 'x'.repeat(5000);
      writeFileSync(join(tmpDir, 'SPEC.md'), largeContent, 'utf-8');
      const result = generator.resolveFileReference('based on SPEC.md', tmpDir);
      expect(result).toBeDefined();
      expect(result!.length).toBeLessThanOrEqual(4003); // 4000 + '...'
      expect(result!.endsWith('...')).toBe(true);
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
