/**
 * ImportGitHubRepositoryUseCase Unit Tests
 *
 * Tests for the GitHub repository import use case.
 * Uses mock services for IGitHubRepositoryService, IRepositoryRepository,
 * and AddRepositoryUseCase.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportGitHubRepositoryUseCase } from '@/application/use-cases/repositories/import-github-repository.use-case.js';
import type { IGitHubRepositoryService } from '@/application/ports/output/services/github-repository-service.interface.js';
import {
  GitHubAuthError,
  GitHubUrlParseError,
} from '@/application/ports/output/services/github-repository-service.interface.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import type { AddRepositoryUseCase } from '@/application/use-cases/repositories/add-repository.use-case.js';
import type { Repository } from '@/domain/generated/output.js';

function createMockRepository(overrides?: Partial<Repository>): Repository {
  return {
    id: 'repo-1',
    name: 'my-project',
    path: '/home/user/repos/my-project',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('ImportGitHubRepositoryUseCase', () => {
  let useCase: ImportGitHubRepositoryUseCase;
  let mockGitHubService: IGitHubRepositoryService;
  let mockRepoRepository: IRepositoryRepository;
  let mockAddRepoUseCase: AddRepositoryUseCase;

  beforeEach(() => {
    mockGitHubService = {
      checkAuth: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      cloneRepository: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      listUserRepositories: vi.fn().mockResolvedValue([]),
      parseGitHubUrl: vi.fn().mockReturnValue({
        owner: 'octocat',
        repo: 'my-project',
        nameWithOwner: 'octocat/my-project',
      }),
    };

    mockRepoRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByPath: vi.fn(),
      findByPathIncludingDeleted: vi.fn(),
      findByRemoteUrl: vi.fn<() => Promise<Repository | null>>().mockResolvedValue(null),
      list: vi.fn(),
      remove: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      update: vi
        .fn<(id: string, fields: Partial<Repository>) => Promise<Repository>>()
        .mockImplementation(async (id, fields) => {
          return createMockRepository({ id, ...fields });
        }),
    };

    mockAddRepoUseCase = {
      execute: vi.fn<() => Promise<Repository>>().mockResolvedValue(createMockRepository()),
    } as unknown as AddRepositoryUseCase;

    useCase = new ImportGitHubRepositoryUseCase(
      mockGitHubService,
      mockRepoRepository,
      mockAddRepoUseCase
    );
  });

  describe('successful import', () => {
    it('should clone and register a repository with a valid URL', async () => {
      const result = await useCase.execute({
        url: 'https://github.com/octocat/my-project',
      });

      expect(mockGitHubService.parseGitHubUrl).toHaveBeenCalledWith(
        'https://github.com/octocat/my-project'
      );
      expect(mockGitHubService.checkAuth).toHaveBeenCalled();
      expect(mockGitHubService.cloneRepository).toHaveBeenCalled();
      expect(mockAddRepoUseCase.execute).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('repo-1');
    });

    it('should use dest when provided', async () => {
      await useCase.execute({
        url: 'https://github.com/octocat/my-project',
        dest: '/custom/path',
      });

      expect(mockGitHubService.cloneRepository).toHaveBeenCalledWith(
        'octocat/my-project',
        '/custom/path',
        undefined
      );
      expect(mockAddRepoUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/custom/path' })
      );
    });

    it('should use defaultCloneDir/repoName when dest is not provided', async () => {
      await useCase.execute({
        url: 'https://github.com/octocat/my-project',
        defaultCloneDir: '/home/user/repos',
      });

      expect(mockGitHubService.cloneRepository).toHaveBeenCalledWith(
        'octocat/my-project',
        '/home/user/repos/my-project',
        undefined
      );
    });

    it('should fall back to ~/repos/repoName when no dest or defaultCloneDir', async () => {
      await useCase.execute({
        url: 'https://github.com/octocat/my-project',
      });

      // The clone destination should end with /my-project
      const cloneCall = vi.mocked(mockGitHubService.cloneRepository).mock.calls[0];
      expect(cloneCall[1]).toMatch(/\/my-project$/);
    });

    it('should call AddRepositoryUseCase with the cloned path', async () => {
      await useCase.execute({
        url: 'https://github.com/octocat/my-project',
        dest: '/repos/my-project',
      });

      expect(mockAddRepoUseCase.execute).toHaveBeenCalledWith({
        path: '/repos/my-project',
        name: 'my-project',
      });
    });

    it('should update repository with normalized remoteUrl after registration', async () => {
      vi.mocked(mockAddRepoUseCase.execute).mockResolvedValue(
        createMockRepository({ id: 'new-repo-id' })
      );

      await useCase.execute({
        url: 'https://github.com/octocat/my-project',
      });

      expect(mockRepoRepository.update).toHaveBeenCalledWith('new-repo-id', {
        remoteUrl: 'https://github.com/octocat/my-project',
      });
    });
  });

  describe('URL normalization', () => {
    it('should normalize remoteUrl to lowercase and strip .git suffix', async () => {
      vi.mocked(mockGitHubService.parseGitHubUrl).mockReturnValue({
        owner: 'Octocat',
        repo: 'My-Project',
        nameWithOwner: 'Octocat/My-Project',
      });
      vi.mocked(mockAddRepoUseCase.execute).mockResolvedValue(
        createMockRepository({ id: 'new-id' })
      );

      await useCase.execute({
        url: 'https://github.com/Octocat/My-Project.git',
      });

      expect(mockRepoRepository.update).toHaveBeenCalledWith('new-id', {
        remoteUrl: 'https://github.com/octocat/my-project',
      });
    });
  });

  describe('duplicate detection', () => {
    it('should return existing repo when remoteUrl is already tracked', async () => {
      const existingRepo = createMockRepository({
        id: 'existing-id',
        remoteUrl: 'https://github.com/octocat/my-project',
      });
      vi.mocked(mockRepoRepository.findByRemoteUrl).mockResolvedValue(existingRepo);

      const result = await useCase.execute({
        url: 'https://github.com/octocat/my-project',
      });

      expect(result).toBe(existingRepo);
      expect(mockGitHubService.cloneRepository).not.toHaveBeenCalled();
      expect(mockAddRepoUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw GitHubUrlParseError for invalid URL', async () => {
      vi.mocked(mockGitHubService.parseGitHubUrl).mockImplementation(() => {
        throw new GitHubUrlParseError('Invalid GitHub URL: not-a-url');
      });

      await expect(useCase.execute({ url: 'not-a-url' })).rejects.toThrow(GitHubUrlParseError);
    });

    it('should throw GitHubAuthError when not authenticated', async () => {
      vi.mocked(mockGitHubService.checkAuth).mockRejectedValue(
        new GitHubAuthError('GitHub CLI is not authenticated')
      );

      await expect(
        useCase.execute({ url: 'https://github.com/octocat/my-project' })
      ).rejects.toThrow(GitHubAuthError);
      expect(mockGitHubService.cloneRepository).not.toHaveBeenCalled();
    });

    it('should call checkAuth before cloning', async () => {
      const callOrder: string[] = [];
      vi.mocked(mockGitHubService.checkAuth).mockImplementation(async () => {
        callOrder.push('checkAuth');
      });
      vi.mocked(mockGitHubService.cloneRepository).mockImplementation(async () => {
        callOrder.push('cloneRepository');
      });

      await useCase.execute({ url: 'https://github.com/octocat/my-project' });

      expect(callOrder.indexOf('checkAuth')).toBeLessThan(callOrder.indexOf('cloneRepository'));
    });
  });

  describe('clone options', () => {
    it('should pass cloneOptions through to cloneRepository', async () => {
      const onProgress = vi.fn();

      await useCase.execute({
        url: 'https://github.com/octocat/my-project',
        dest: '/repos/my-project',
        cloneOptions: { onProgress },
      });

      expect(mockGitHubService.cloneRepository).toHaveBeenCalledWith(
        'octocat/my-project',
        '/repos/my-project',
        { onProgress }
      );
    });
  });
});
