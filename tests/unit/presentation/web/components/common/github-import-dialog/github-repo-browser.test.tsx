import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitHubRepoBrowser } from '@/components/common/github-import-dialog/github-repo-browser';
import type { GitHubRepo } from '@shepai/core/application/ports/output/services/github-repository-service.interface';

const mockRepos: GitHubRepo[] = [
  {
    name: 'my-project',
    nameWithOwner: 'octocat/my-project',
    description: 'A cool project',
    isPrivate: false,
    pushedAt: '2025-01-15T00:00:00Z',
  },
  {
    name: 'secret-repo',
    nameWithOwner: 'octocat/secret-repo',
    description: 'Very private',
    isPrivate: true,
    pushedAt: '2025-01-14T00:00:00Z',
  },
];

describe('GitHubRepoBrowser', () => {
  const defaultProps = {
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    const fetchRepos = vi.fn().mockReturnValue(new Promise(vi.fn())); // never resolves
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);
    expect(screen.getByTestId('repo-browser-loading')).toBeInTheDocument();
  });

  it('displays repo list after fetch', async () => {
    const fetchRepos = vi.fn().mockResolvedValue({ repos: mockRepos });
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByText('octocat/my-project')).toBeInTheDocument();
    });

    expect(screen.getByText('octocat/secret-repo')).toBeInTheDocument();
    expect(screen.getByText('A cool project')).toBeInTheDocument();
    expect(screen.getByText('Very private')).toBeInTheDocument();
  });

  it('shows public and private badges', async () => {
    const fetchRepos = vi.fn().mockResolvedValue({ repos: mockRepos });
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByText('Public')).toBeInTheDocument();
    });
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('calls onSelect when repo clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const fetchRepos = vi.fn().mockResolvedValue({ repos: mockRepos });
    render(<GitHubRepoBrowser onSelect={onSelect} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByText('octocat/my-project')).toBeInTheDocument();
    });

    await user.click(screen.getByText('octocat/my-project'));
    expect(onSelect).toHaveBeenCalledWith('octocat/my-project');
  });

  it('filters repos via search input', async () => {
    const user = userEvent.setup();
    const fetchRepos = vi.fn().mockResolvedValue({ repos: mockRepos });
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByText('octocat/my-project')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search repositories...');
    await user.type(searchInput, 'secret');

    // Wait for debounced fetch
    await waitFor(() => {
      expect(fetchRepos).toHaveBeenCalledWith({ search: 'secret' });
    });
  });

  it('shows error state on fetch failure', async () => {
    const fetchRepos = vi.fn().mockResolvedValue({ error: 'Auth failed' });
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-browser-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });

  it('shows empty state when no repos match', async () => {
    const fetchRepos = vi.fn().mockResolvedValue({ repos: [] });
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-browser-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('No repositories found')).toBeInTheDocument();
  });

  it('shows error state when fetch throws', async () => {
    const fetchRepos = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<GitHubRepoBrowser {...defaultProps} fetchRepos={fetchRepos} />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-browser-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Failed to fetch repositories')).toBeInTheDocument();
  });
});
