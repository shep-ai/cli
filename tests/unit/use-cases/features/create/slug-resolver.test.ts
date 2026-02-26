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
      remoteBranchExists: vi.fn(),
    } as any;

    resolver = new SlugResolver(mockFeatureRepo, mockWorktreeService);
  });

  describe('resolveUniqueSlug', () => {
    it('should return original slug if it is unique (no DB or git conflicts)', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);
      (mockWorktreeService.remoteBranchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('unique-slug', '/repo/path');

      expect(result).toEqual({
        slug: 'unique-slug',
        branch: 'feat/unique-slug',
      });
      expect(result.warning).toBeUndefined();
    });

    it('should generate random suffix when slug exists in DB', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue({ id: 'existing' });

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result.slug).toMatch(/^my-feature-[0-9a-f]{6}$/);
      expect(result.branch).toBe(`feat/${result.slug}`);
      expect(result.warning).toContain('feat/my-feature');
      expect(result.warning).toContain(result.branch);
    });

    it('should generate random suffix when local worktree branch exists', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(true);

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result.slug).toMatch(/^my-feature-[0-9a-f]{6}$/);
      expect(result.warning).toContain('already exists');
    });

    it('should generate random suffix when local git branch exists', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(true);

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result.slug).toMatch(/^my-feature-[0-9a-f]{6}$/);
      expect(result.warning).toContain('already exists');
    });

    it('should generate random suffix when remote branch exists on origin', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);
      (mockWorktreeService.remoteBranchExists as any).mockResolvedValue(true);

      const result = await resolver.resolveUniqueSlug('my-feature', '/repo/path');

      expect(result.slug).toMatch(/^my-feature-[0-9a-f]{6}$/);
      expect(result.warning).toContain('already exists');
    });

    it('should check DB, worktree, local branch, and remote branch', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);
      (mockWorktreeService.remoteBranchExists as any).mockResolvedValue(false);

      await resolver.resolveUniqueSlug('test-slug', '/repo/path');

      expect(mockFeatureRepo.findBySlug).toHaveBeenCalledWith('test-slug', '/repo/path');
      expect(mockWorktreeService.exists).toHaveBeenCalledWith('/repo/path', 'feat/test-slug');
      expect(mockWorktreeService.branchExists).toHaveBeenCalledWith('/repo/path', 'feat/test-slug');
      expect(mockWorktreeService.remoteBranchExists).toHaveBeenCalledWith(
        '/repo/path',
        'feat/test-slug'
      );
    });

    it('should format branch name as feat/SLUG', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue(null);
      (mockWorktreeService.exists as any).mockResolvedValue(false);
      (mockWorktreeService.branchExists as any).mockResolvedValue(false);
      (mockWorktreeService.remoteBranchExists as any).mockResolvedValue(false);

      const result = await resolver.resolveUniqueSlug('github-oauth', '/repo/path');

      expect(result.branch).toBe('feat/github-oauth');
    });

    it('should short-circuit checks on first failure (DB hit skips branch checks)', async () => {
      (mockFeatureRepo.findBySlug as any).mockResolvedValue({ id: 'existing' });

      await resolver.resolveUniqueSlug('taken', '/repo/path');

      // Should not check branches if DB already says it's taken
      expect(mockWorktreeService.exists).not.toHaveBeenCalled();
      expect(mockWorktreeService.branchExists).not.toHaveBeenCalled();
      expect(mockWorktreeService.remoteBranchExists).not.toHaveBeenCalled();
    });
  });
});
