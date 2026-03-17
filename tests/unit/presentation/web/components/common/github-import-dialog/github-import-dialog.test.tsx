import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockImportGitHubRepository = vi.fn();
const mockListGitHubRepositories = vi.fn();

vi.mock('@/app/actions/import-github-repository', () => ({
  importGitHubRepository: (...args: unknown[]) => mockImportGitHubRepository(...args),
}));

vi.mock('@/app/actions/list-github-repositories', () => ({
  listGitHubRepositories: (...args: unknown[]) => mockListGitHubRepositories(...args),
}));

import { GitHubImportDialog } from '@/components/common/github-import-dialog/github-import-dialog';

describe('GitHubImportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListGitHubRepositories.mockResolvedValue({ repos: [] });
  });

  it('renders dialog with two tabs when open', () => {
    render(<GitHubImportDialog {...defaultProps} />);
    expect(screen.getByText('Import from GitHub')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /url/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /browse/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<GitHubImportDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Import from GitHub')).not.toBeInTheDocument();
  });

  it('URL tab submission triggers import action', async () => {
    const user = userEvent.setup();
    const onImportComplete = vi.fn();
    const repo = {
      id: '1',
      name: 'repo',
      path: '/repos/repo',
      remoteUrl: 'https://github.com/owner/repo',
    };
    mockImportGitHubRepository.mockResolvedValue({ repository: repo });

    render(<GitHubImportDialog {...defaultProps} onImportComplete={onImportComplete} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'owner/repo{Enter}');

    await waitFor(() => {
      expect(mockImportGitHubRepository).toHaveBeenCalledWith({ url: 'owner/repo' });
    });

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledWith(repo);
    });
  });

  it('Browse tab selection triggers import action', async () => {
    const user = userEvent.setup();
    const onImportComplete = vi.fn();
    const repos = [
      {
        name: 'my-repo',
        nameWithOwner: 'owner/my-repo',
        description: 'A repo',
        isPrivate: false,
        pushedAt: '2025-01-01T00:00:00Z',
      },
    ];
    mockListGitHubRepositories.mockResolvedValue({ repos });
    const repo = {
      id: '1',
      name: 'my-repo',
      path: '/repos/my-repo',
      remoteUrl: 'https://github.com/owner/my-repo',
    };
    mockImportGitHubRepository.mockResolvedValue({ repository: repo });

    render(<GitHubImportDialog {...defaultProps} onImportComplete={onImportComplete} />);

    // Switch to Browse tab
    await user.click(screen.getByRole('tab', { name: /browse/i }));

    // Wait for repos to load
    await waitFor(() => {
      expect(screen.getByText('owner/my-repo')).toBeInTheDocument();
    });

    // Click the repo
    await user.click(screen.getByText('owner/my-repo'));

    await waitFor(() => {
      expect(mockImportGitHubRepository).toHaveBeenCalledWith({ url: 'owner/my-repo' });
    });

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledWith(repo);
    });
  });

  it('shows error on import failure', async () => {
    const user = userEvent.setup();
    mockImportGitHubRepository.mockResolvedValue({ error: 'Clone failed: Permission denied' });

    render(<GitHubImportDialog {...defaultProps} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'owner/repo{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Clone failed: Permission denied');
    });
  });

  it('closes dialog on successful import', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const repo = { id: '1', name: 'repo', path: '/repos/repo' };
    mockImportGitHubRepository.mockResolvedValue({ repository: repo });

    render(<GitHubImportDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'owner/repo{Enter}');

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
