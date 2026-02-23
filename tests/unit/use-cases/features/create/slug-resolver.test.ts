import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import { SlugResolver } from '@/application/use-cases/features/create/slug-resolver.js';

describe('SlugResolver', () => {
  let mockFeatureRepo: IFeatureRepository;
  let mockWorktreeService: IWorktreeService;
  let resolver: SlugResolver;

  beforeEach(() => {
    mockFeatureRepo = {
      findBySlug: vi.fn(),
    } as any;

    mockWorktreeService = {
      exists: vi.fn(),
      branchExists: vi.fn(),
    } as any;

    resolver = new SlugResolver(mockFeatureRepo, mockWorktreeService);
  });

  describe('resolveUniqueSlug', () => {
    it('should return original slug if it is unique (no DB or git conflicts)', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('unique-slug', '/repo/path');

      expect(result).toEqual({
        slug: 'unique-slug',
        branch: 'feat/unique-slug',
      });
      expect(result.warning).toBeUndefined();
    });

    it('should try suffixed versions if original slug exists in DB', async () => {
      // First call (original): exists in DB
      // Second call (-2): does not exist
      (mockFeatureRepo.findBySlug as any)
        .mockResolvedValueOnce({ id: 'existing' }) // original exists
        .mockResolvedValueOnce(null); // -2 does not exist
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result).toEqual({
        slug: 'my-feature-2',
        branch: 'feat/my-feature-2',
        warning: 'Branch "feat/my-feature" already exists, using "feat/my-feature-2" instead',
      });
    });

    it('should try suffixed versions if git worktree branch exists', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      // First call (original): branch exists as worktree
      // Second call (-2): branch does not exist
      (mockWorktreeService.exists as any)
        .mockResolvedValueOnce(true) // original exists
        .mockResolvedValueOnce(false); // -2 does not exist
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result).toEqual({
        slug: 'my-feature-2',
        branch: 'feat/my-feature-2',
        warning: 'Branch "feat/my-feature" already exists, using "feat/my-feature-2" instead',
      });
    });

    it('should try suffixed versions if standalone git branch exists (no worktree)', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false); // no worktree
      // First call (original): branch exists in git
      // Second call (-2): branch does not exist
      (mockWorktreeService.branchExists as any)
        .mockResolvedValueOnce(true) // original branch exists
        .mockResolvedValueOnce(false); // -2 does not exist

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result).toEqual({
        slug: 'my-feature-2',
        branch: 'feat/my-feature-2',
        warning: 'Branch "feat/my-feature" already exists, using "feat/my-feature-2" instead',
      });
    });

    it('should increment suffix until finding unique slug', async () => {
      // Simulate original and -2 existing, -3 is free
      (mockFeatureRepo.findBySlug as any)
        .mockResolvedValueOnce({ id: 'existing' }) // original exists
        .mockResolvedValueOnce({ id: 'existing-2' }) // -2 exists
        .mockResolvedValueOnce(null); // -3 is free

      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('test', '/repo/path');

      expect(result.slug).toBe('test-3');
    });

    it('should throw error if MAX_SUFFIX exceeded', async () => {
      // All suffixes up to MAX_SUFFIX (10) are taken
      (mockFeatureRepo.findBySlug as any).mockResolvedValue({ id: 'existing' });
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      await expect(async () => {
        await resolver.resolveUniqueSlug('collision', '/repo/path');
      }).rejects.toThrow(/Could not find a unique slug/);
    });

    it('should check DB, worktree, and git branch for each attempt', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      await resolver.resolveUniqueSlug('test-slug', '/repo/path');

      expect(mockFeatureRepo.findBySlug).toHaveBeenCalledWith('test-slug', '/repo/path');
      expect(mockWorktreeService.exists).toHaveBeenCalledWith('/repo/path', 'feat/test-slug');
      expect(mockWorktreeService.branchExists).toHaveBeenCalledWith('/repo/path', 'feat/test-slug');
    });

    it('should format branch name as feat/SLUG', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('github-oauth', '/repo/path');

      expect(result.branch).toBe('feat/github-oauth');
    });
  });
});
