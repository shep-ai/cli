import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddRepositoryButton } from '@/components/common/add-repository-node';

// Mock the pickFolder module
vi.mock('@/components/common/add-repository-node/pick-folder', () => ({
  pickFolder: vi.fn(),
}));

import { pickFolder } from '@/components/common/add-repository-node/pick-folder';

const mockPickFolder = vi.mocked(pickFolder);

describe('AddRepositoryButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has aria-label="Add Repository" for accessibility', () => {
    render(<AddRepositoryButton />);
    const button = screen.getByTestId('add-repository-button');
    expect(button).toHaveAttribute('aria-label', 'Add Repository');
  });

  it('does not render text content', () => {
    render(<AddRepositoryButton />);
    expect(screen.queryByText('Add Repository')).not.toBeInTheDocument();
    expect(screen.queryByText('Opening...')).not.toBeInTheDocument();
  });

  it('renders FolderPlus icon with h-5 w-5 classes', () => {
    const { container } = render(<AddRepositoryButton />);
    const svg = container.querySelector('svg.lucide-folder-plus');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-5', 'w-5');
  });

  it('renders as a ghost icon button', () => {
    render(<AddRepositoryButton />);
    const button = screen.getByTestId('add-repository-button');
    expect(button.tagName).toBe('BUTTON');
  });

  it('renders tooltip trigger', () => {
    render(<AddRepositoryButton />);
    const trigger = screen.getByTestId('add-repository-button');
    expect(trigger.closest('[data-slot="tooltip-trigger"]')).toBeInTheDocument();
  });

  it('still fires pickFolder on click', async () => {
    const onSelect = vi.fn();
    mockPickFolder.mockResolvedValue('/Users/dev/my-repo');

    render(<AddRepositoryButton onSelect={onSelect} />);
    const button = screen.getByTestId('add-repository-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPickFolder).toHaveBeenCalledOnce();
      expect(onSelect).toHaveBeenCalledWith('/Users/dev/my-repo');
    });
  });

  it('shows Loader2 spinner with h-5 w-5 during loading', async () => {
    let resolvePickFolder: (value: string | null) => void;
    mockPickFolder.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePickFolder = resolve;
        })
    );

    const { container } = render(<AddRepositoryButton />);
    const button = screen.getByTestId('add-repository-button');
    fireEvent.click(button);

    await waitFor(() => {
      const loader = container.querySelector('svg.lucide-loader-circle');
      expect(loader).toBeInTheDocument();
      expect(loader).toHaveClass('h-5', 'w-5', 'animate-spin');
    });

    resolvePickFolder!(null);
  });
});
