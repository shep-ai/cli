import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPickFolder = vi.fn();
const mockImportGitHubRepository = vi.fn();
const mockListGitHubRepositories = vi.fn();

vi.mock('@/components/common/add-repository-button/pick-folder', () => ({
  pickFolder: (...args: unknown[]) => mockPickFolder(...args),
}));

vi.mock('@/app/actions/import-github-repository', () => ({
  importGitHubRepository: (...args: unknown[]) => mockImportGitHubRepository(...args),
}));

vi.mock('@/app/actions/list-github-repositories', () => ({
  listGitHubRepositories: (...args: unknown[]) => mockListGitHubRepositories(...args),
}));

vi.mock('@/hooks/feature-flags-context', () => ({
  useFeatureFlags: () => ({ skills: false, envDeploy: false, debug: false, githubImport: true }),
}));

import { AddRepositoryButton } from '@/components/common/add-repository-button';

describe('AddRepositoryButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListGitHubRepositories.mockResolvedValue({ repos: [] });
  });

  it('renders button that opens popover on click', async () => {
    const user = userEvent.setup();
    render(<AddRepositoryButton />);

    const button = screen.getByTestId('add-repository-button');
    expect(button).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('add-repo-local-folder')).toBeInTheDocument();
    });
  });

  it('popover shows "Local folder" and "From GitHub" options', async () => {
    const user = userEvent.setup();
    render(<AddRepositoryButton />);

    await user.click(screen.getByTestId('add-repository-button'));

    await waitFor(() => {
      expect(screen.getByText('Local folder')).toBeInTheDocument();
      expect(screen.getByText('From GitHub')).toBeInTheDocument();
    });
  });

  it('"Local folder" calls pickFolder and onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mockPickFolder.mockResolvedValue('/home/user/my-repo');

    render(<AddRepositoryButton onSelect={onSelect} />);

    await user.click(screen.getByTestId('add-repository-button'));
    await waitFor(() => {
      expect(screen.getByTestId('add-repo-local-folder')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('add-repo-local-folder'));

    await waitFor(() => {
      expect(mockPickFolder).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('/home/user/my-repo');
    });
  });

  it('"From GitHub" opens GitHubImportDialog', async () => {
    const user = userEvent.setup();
    render(<AddRepositoryButton />);

    await user.click(screen.getByTestId('add-repository-button'));
    await waitFor(() => {
      expect(screen.getByTestId('add-repo-from-github')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('add-repo-from-github'));

    await waitFor(() => {
      expect(screen.getByText('Import from GitHub')).toBeInTheDocument();
    });
  });

  it('popover closes after selecting local folder', async () => {
    const user = userEvent.setup();
    mockPickFolder.mockResolvedValue(null);

    render(<AddRepositoryButton />);

    await user.click(screen.getByTestId('add-repository-button'));
    await waitFor(() => {
      expect(screen.getByTestId('add-repo-local-folder')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('add-repo-local-folder'));

    await waitFor(() => {
      expect(screen.queryByTestId('add-repo-local-folder')).not.toBeInTheDocument();
    });
  });
});
