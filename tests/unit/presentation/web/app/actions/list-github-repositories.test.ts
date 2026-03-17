import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn(() => ({
    execute: mockExecute,
  })),
}));

const { listGitHubRepositories } = await import('@/app/actions/list-github-repositories');

const { GitHubAuthError } = await import(
  '@shepai/core/application/ports/output/services/github-repository-service.interface'
);

describe('listGitHubRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns repos array on success', async () => {
    const repos = [
      {
        name: 'repo-a',
        nameWithOwner: 'user/repo-a',
        description: 'A repo',
        isPrivate: false,
        pushedAt: '2025-01-01T00:00:00Z',
      },
      {
        name: 'repo-b',
        nameWithOwner: 'user/repo-b',
        description: 'B repo',
        isPrivate: true,
        pushedAt: '2025-01-02T00:00:00Z',
      },
    ];
    mockExecute.mockResolvedValue(repos);

    const result = await listGitHubRepositories();

    expect(result).toEqual({ repos });
    expect(mockExecute).toHaveBeenCalledWith(undefined);
  });

  it('passes search filter to use case', async () => {
    mockExecute.mockResolvedValue([]);

    await listGitHubRepositories({ search: 'my-project' });

    expect(mockExecute).toHaveBeenCalledWith({ search: 'my-project' });
  });

  it('passes limit option to use case', async () => {
    mockExecute.mockResolvedValue([]);

    await listGitHubRepositories({ limit: 10 });

    expect(mockExecute).toHaveBeenCalledWith({ limit: 10 });
  });

  it('passes both search and limit options', async () => {
    mockExecute.mockResolvedValue([]);

    await listGitHubRepositories({ search: 'test', limit: 5 });

    expect(mockExecute).toHaveBeenCalledWith({ search: 'test', limit: 5 });
  });

  it('returns error on GitHubAuthError', async () => {
    mockExecute.mockRejectedValue(new GitHubAuthError('Not logged in'));

    const result = await listGitHubRepositories();

    expect(result).toEqual({
      error: 'GitHub CLI is not authenticated. Run `gh auth login` to sign in.',
    });
  });

  it('returns error message for other Error instances', async () => {
    mockExecute.mockRejectedValue(new Error('Network timeout'));

    const result = await listGitHubRepositories();

    expect(result).toEqual({ error: 'Network timeout' });
  });

  it('returns fallback error for non-Error throws', async () => {
    mockExecute.mockRejectedValue('unknown');

    const result = await listGitHubRepositories();

    expect(result).toEqual({ error: 'Failed to list repositories' });
  });
});
