/**
 * GitHubRepositoryService.getViewerPermission() Unit Tests
 *
 * Tests for permission detection via `gh repo view --json viewerPermission`.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GitHubRepositoryService } from '@/infrastructure/services/external/github-repository.service.js';
import { GitHubPermissionError } from '@/application/ports/output/services/github-repository-service.interface.js';

// Mock child_process.spawn (required by the module even though getViewerPermission doesn't use it)
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs/promises.rm
vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
}));

describe('GitHubRepositoryService', () => {
  let service: GitHubRepositoryService;
  let mockExecFile: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFile = vi.fn();
    service = new GitHubRepositoryService(mockExecFile as any);
  });

  describe('getViewerPermission()', () => {
    it('should return ADMIN for admin repos', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({ viewerPermission: 'ADMIN' }),
        stderr: '',
      });

      const result = await service.getViewerPermission('/path/to/repo');

      expect(result).toBe('ADMIN');
    });

    it('should return WRITE for collaborator repos', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({ viewerPermission: 'WRITE' }),
        stderr: '',
      });

      const result = await service.getViewerPermission('/path/to/repo');

      expect(result).toBe('WRITE');
    });

    it('should return MAINTAIN for maintainer repos', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({ viewerPermission: 'MAINTAIN' }),
        stderr: '',
      });

      const result = await service.getViewerPermission('/path/to/repo');

      expect(result).toBe('MAINTAIN');
    });

    it('should return READ for read-only repos', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({ viewerPermission: 'READ' }),
        stderr: '',
      });

      const result = await service.getViewerPermission('/path/to/repo');

      expect(result).toBe('READ');
    });

    it('should return TRIAGE for triage-level repos', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({ viewerPermission: 'TRIAGE' }),
        stderr: '',
      });

      const result = await service.getViewerPermission('/path/to/repo');

      expect(result).toBe('TRIAGE');
    });

    it('should call execFile with correct args and cwd', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({ viewerPermission: 'ADMIN' }),
        stderr: '',
      });

      await service.getViewerPermission('/my/repo/path');

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['repo', 'view', '--json', 'viewerPermission'],
        { cwd: '/my/repo/path' }
      );
    });

    it('should throw GitHubPermissionError when gh is not installed (ENOENT)', async () => {
      const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFile.mockRejectedValue(err);

      await expect(service.getViewerPermission('/path/to/repo')).rejects.toThrow(
        GitHubPermissionError
      );
      await expect(service.getViewerPermission('/path/to/repo')).rejects.toThrow('not installed');
    });

    it('should throw GitHubPermissionError on generic exec failure', async () => {
      mockExecFile.mockRejectedValue(new Error('not authenticated'));

      await expect(service.getViewerPermission('/path/to/repo')).rejects.toThrow(
        GitHubPermissionError
      );
      await expect(service.getViewerPermission('/path/to/repo')).rejects.toThrow(
        'Failed to check repository permission'
      );
    });

    it('should include cause in GitHubPermissionError', async () => {
      const originalError = new Error('network timeout');
      mockExecFile.mockRejectedValue(originalError);

      try {
        await service.getViewerPermission('/path/to/repo');
        expect.fail('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubPermissionError);
        expect((error as GitHubPermissionError).cause).toBe(originalError);
      }
    });
  });
});
