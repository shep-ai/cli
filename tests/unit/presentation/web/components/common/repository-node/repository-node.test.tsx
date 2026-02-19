import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RepositoryNode } from '@/components/common/repository-node/repository-node';
import type { RepositoryNodeData } from '@/components/common/repository-node/repository-node-config';

// Mock @xyflow/react — RepositoryNode uses Handle and Position
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: { Left: 'left', Right: 'right' },
}));

// Mock the useRepositoryActions hook
const mockOpenInIde = vi.fn();
const mockOpenInShell = vi.fn();
let mockHookReturn = {
  openInIde: mockOpenInIde,
  openInShell: mockOpenInShell,
  ideLoading: false,
  shellLoading: false,
  ideError: null as string | null,
  shellError: null as string | null,
};

vi.mock('@/components/common/repository-node/use-repository-actions', () => ({
  useRepositoryActions: () => mockHookReturn,
}));

// Mock radix-ui tooltip — render trigger children directly, hide content to avoid DOM noise
vi.mock('radix-ui', () => ({
  Tooltip: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
      <>{children}</>
    ),
    Content: ({ children }: { children: React.ReactNode }) => (
      <div role="tooltip" hidden>
        {children}
      </div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Arrow: () => null,
  },
  Slot: {
    Root: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const defaultData: RepositoryNodeData = {
  name: 'shep-ai/cli',
};

const dataWithRepoPath: RepositoryNodeData = {
  name: 'shep-ai/cli',
  repositoryPath: '/home/user/my-repo',
};

function renderNode(data: RepositoryNodeData = defaultData) {
  return render(<RepositoryNode data={data} />);
}

describe('RepositoryNode', () => {
  beforeEach(() => {
    mockOpenInIde.mockReset();
    mockOpenInShell.mockReset();
    mockHookReturn = {
      openInIde: mockOpenInIde,
      openInShell: mockOpenInShell,
      ideLoading: false,
      shellLoading: false,
      ideError: null,
      shellError: null,
    };
  });

  describe('action buttons rendering', () => {
    it('renders IDE and Shell buttons when repositoryPath is provided', () => {
      renderNode(dataWithRepoPath);

      expect(screen.getByRole('button', { name: /open in ide/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open in shell/i })).toBeInTheDocument();
    });

    it('does not render action buttons when repositoryPath is absent', () => {
      renderNode(defaultData);

      expect(screen.queryByRole('button', { name: /open in ide/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /open in shell/i })).not.toBeInTheDocument();
    });
  });

  describe('action button clicks', () => {
    it('IDE button click calls openInIde', () => {
      renderNode(dataWithRepoPath);

      fireEvent.click(screen.getByRole('button', { name: /open in ide/i }));

      expect(mockOpenInIde).toHaveBeenCalledOnce();
    });

    it('Shell button click calls openInShell', () => {
      renderNode(dataWithRepoPath);

      fireEvent.click(screen.getByRole('button', { name: /open in shell/i }));

      expect(mockOpenInShell).toHaveBeenCalledOnce();
    });

    it('action button click does not trigger parent onClick', () => {
      const onClick = vi.fn();
      renderNode({ ...dataWithRepoPath, onClick });

      fireEvent.click(screen.getByRole('button', { name: /open in ide/i }));

      expect(onClick).not.toHaveBeenCalled();
      expect(mockOpenInIde).toHaveBeenCalledOnce();
    });
  });

  describe('loading states', () => {
    it('shows loading spinner on IDE button when ideLoading is true', () => {
      mockHookReturn = { ...mockHookReturn, ideLoading: true };
      renderNode(dataWithRepoPath);

      const ideButton = screen.getByRole('button', { name: /open in ide/i });
      expect(ideButton.querySelector('.animate-spin')).toBeInTheDocument();
      expect(ideButton).toBeDisabled();
    });

    it('shows loading spinner on Shell button when shellLoading is true', () => {
      mockHookReturn = { ...mockHookReturn, shellLoading: true };
      renderNode(dataWithRepoPath);

      const shellButton = screen.getByRole('button', { name: /open in shell/i });
      expect(shellButton.querySelector('.animate-spin')).toBeInTheDocument();
      expect(shellButton).toBeDisabled();
    });
  });

  describe('error states', () => {
    it('shows error icon on IDE button when ideError is set', () => {
      mockHookReturn = { ...mockHookReturn, ideError: 'IDE not found' };
      renderNode(dataWithRepoPath);

      const ideButton = screen.getByRole('button', { name: /open in ide/i });
      expect(ideButton.querySelector('.lucide-circle-alert')).toBeInTheDocument();
      expect(ideButton).toHaveClass('text-destructive');
    });

    it('shows error icon on Shell button when shellError is set', () => {
      mockHookReturn = { ...mockHookReturn, shellError: 'Shell error' };
      renderNode(dataWithRepoPath);

      const shellButton = screen.getByRole('button', { name: /open in shell/i });
      expect(shellButton.querySelector('.lucide-circle-alert')).toBeInTheDocument();
      expect(shellButton).toHaveClass('text-destructive');
    });
  });

  describe('tooltip accessibility', () => {
    it('IDE button has aria-label "Open in IDE"', () => {
      renderNode(dataWithRepoPath);

      expect(screen.getByRole('button', { name: /open in ide/i })).toHaveAttribute(
        'aria-label',
        'Open in IDE'
      );
    });

    it('Shell button has aria-label "Open in Shell"', () => {
      renderNode(dataWithRepoPath);

      expect(screen.getByRole('button', { name: /open in shell/i })).toHaveAttribute(
        'aria-label',
        'Open in Shell'
      );
    });
  });

  describe('node width', () => {
    it('uses w-72 class on the main button element', () => {
      renderNode(dataWithRepoPath);

      const card = screen.getByTestId('repository-node-card');
      expect(card).toHaveClass('w-72');
    });
  });

  describe('existing behavior preserved', () => {
    it('renders repository name', () => {
      renderNode(defaultData);

      expect(screen.getByTestId('repository-node-name')).toHaveTextContent('shep-ai/cli');
    });

    it('renders add button when onAdd is provided', () => {
      renderNode({ ...defaultData, onAdd: vi.fn() });

      expect(screen.getByTestId('repository-node-add-button')).toBeInTheDocument();
    });

    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      renderNode({ ...defaultData, onClick });

      fireEvent.click(screen.getByTestId('repository-node-card'));

      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
