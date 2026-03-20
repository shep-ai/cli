import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPrService } from '@/infrastructure/services/git/git-pr.service';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<object>('node:fs');
  return { ...actual, readFileSync: vi.fn() };
});

describe('GitPrService.getBranchSyncStatus', () => {
  let mockExec: ExecFunction;
  let service: GitPrService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitPrService(mockExec);
  });

  it('should return ahead and behind counts', async () => {
    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: '5\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '3\n', stderr: '' });

    const result = await service.getBranchSyncStatus('/repo', 'feat/my-branch', 'main');

    expect(result).toEqual({ ahead: 5, behind: 3 });
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['rev-list', '--count', 'origin/main..feat/my-branch'],
      { cwd: '/repo' }
    );
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['rev-list', '--count', 'feat/my-branch..origin/main'],
      { cwd: '/repo' }
    );
  });

  it('should return zeros when branches are in sync', async () => {
    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: '0\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '0\n', stderr: '' });

    const result = await service.getBranchSyncStatus('/repo', 'feat/x', 'main');
    expect(result).toEqual({ ahead: 0, behind: 0 });
  });

  it('should handle non-numeric output gracefully', async () => {
    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: '\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' });

    const result = await service.getBranchSyncStatus('/repo', 'feat/x', 'main');
    expect(result).toEqual({ ahead: 0, behind: 0 });
  });

  it('should throw GitPrError on git failure', async () => {
    vi.mocked(mockExec).mockRejectedValue(new Error('fatal: bad revision'));

    await expect(service.getBranchSyncStatus('/repo', 'feat/x', 'main')).rejects.toThrow();
  });
});
