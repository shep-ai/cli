import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn(() => ({
    execute: mockExecute,
  })),
}));

const { listGitHubOrganizations } = await import('@/app/actions/list-github-organizations');

const { GitHubAuthError } = await import(
  '@shepai/core/application/ports/output/services/github-repository-service.interface'
);

describe('listGitHubOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns orgs array on success', async () => {
    const orgs = [
      { login: 'org-a', description: 'Organization A' },
      { login: 'org-b', description: '' },
    ];
    mockExecute.mockResolvedValue(orgs);

    const result = await listGitHubOrganizations();

    expect(result).toEqual({ orgs });
    expect(mockExecute).toHaveBeenCalled();
  });

  it('returns error on GitHubAuthError', async () => {
    mockExecute.mockRejectedValue(new GitHubAuthError('Not logged in'));

    const result = await listGitHubOrganizations();

    expect(result).toEqual({
      error: 'GitHub CLI is not authenticated. Run `gh auth login` to sign in.',
    });
  });

  it('returns error message for other Error instances', async () => {
    mockExecute.mockRejectedValue(new Error('Network timeout'));

    const result = await listGitHubOrganizations();

    expect(result).toEqual({ error: 'Network timeout' });
  });

  it('returns fallback error for non-Error throws', async () => {
    mockExecute.mockRejectedValue('unknown');

    const result = await listGitHubOrganizations();

    expect(result).toEqual({ error: 'Failed to list organizations' });
  });
});
