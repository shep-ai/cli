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

  it('renders Plus icon with h-6 w-6 classes', () => {
    const { container } = render(<AddRepositoryButton />);
    const svg = container.querySelector('svg.lucide-plus');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  it('renders as a circular FAB with blue styling', () => {
    render(<AddRepositoryButton />);
    const button = screen.getByTestId('add-repository-button');
    expect(button).toHaveClass('h-12', 'w-12', 'rounded-full', 'bg-blue-500', 'shadow-lg');
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

  it('shows Loader2 spinner with h-6 w-6 during loading', async () => {
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
      expect(loader).toHaveClass('h-6', 'w-6', 'animate-spin');
    });

    resolvePickFolder!(null);
  });
});
