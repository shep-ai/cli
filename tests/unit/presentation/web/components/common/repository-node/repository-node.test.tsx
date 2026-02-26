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

// Mock the useDeployAction hook
const mockDeploy = vi.fn();
const mockStop = vi.fn();
let mockDeployHookReturn = {
  deploy: mockDeploy,
  stop: mockStop,
  deployLoading: false,
  stopLoading: false,
  deployError: null as string | null,
  status: null as string | null,
  url: null as string | null,
};

vi.mock('@/hooks/use-deploy-action', () => ({
  useDeployAction: () => mockDeployHookReturn,
}));

// Mock feature flags — enable envDeploy so deploy buttons render
vi.mock('@/lib/feature-flags', () => ({
  featureFlags: { envDeploy: true, skills: false },
}));

// Mock DeploymentStatusBadge
vi.mock('@/components/common/deployment-status-badge', () => ({
  DeploymentStatusBadge: ({ status, url }: { status: string | null; url?: string | null }) =>
    status ? (
      <div data-testid="deployment-status-badge" data-status={status} data-url={url} />
    ) : null,
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

// Mock shadcn AlertDialog — controlled by `open` prop
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <>{children}</> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="alertdialog">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="alert-dialog-confirm" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
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
    mockDeploy.mockReset();
    mockStop.mockReset();
    mockHookReturn = {
      openInIde: mockOpenInIde,
      openInShell: mockOpenInShell,
      ideLoading: false,
      shellLoading: false,
      ideError: null,
      shellError: null,
    };
    mockDeployHookReturn = {
      deploy: mockDeploy,
      stop: mockStop,
      deployLoading: false,
      stopLoading: false,
      deployError: null,
      status: null,
      url: null,
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

  describe('delete button', () => {
    it('renders delete button when onDelete and id are provided', () => {
      renderNode({ ...dataWithRepoPath, id: 'repo-abc', onDelete: vi.fn() });

      expect(screen.getByTestId('repository-node-delete-button')).toBeInTheDocument();
    });

    it('does not render delete button when onDelete is absent', () => {
      renderNode(dataWithRepoPath);

      expect(screen.queryByTestId('repository-node-delete-button')).not.toBeInTheDocument();
    });

    it('does not render delete button when id is absent', () => {
      renderNode({ ...dataWithRepoPath, onDelete: vi.fn() });

      expect(screen.queryByTestId('repository-node-delete-button')).not.toBeInTheDocument();
    });

    it('opens confirmation dialog when delete button is clicked', () => {
      renderNode({ ...dataWithRepoPath, id: 'repo-abc', onDelete: vi.fn() });

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('repository-node-delete-button'));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Remove repository?')).toBeInTheDocument();
    });

    it('calls onDelete only after confirming in the dialog', () => {
      const onDelete = vi.fn();
      renderNode({ ...dataWithRepoPath, id: 'repo-abc', onDelete });

      fireEvent.click(screen.getByTestId('repository-node-delete-button'));
      expect(onDelete).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('alert-dialog-confirm'));
      expect(onDelete).toHaveBeenCalledWith('repo-abc');
    });

    it('does not call onDelete when cancel is clicked', () => {
      const onDelete = vi.fn();
      renderNode({ ...dataWithRepoPath, id: 'repo-abc', onDelete });

      fireEvent.click(screen.getByTestId('repository-node-delete-button'));
      fireEvent.click(screen.getByTestId('alert-dialog-cancel'));

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('delete button click does not trigger parent onClick', () => {
      const onClick = vi.fn();
      const onDelete = vi.fn();
      renderNode({ ...dataWithRepoPath, id: 'repo-abc', onClick, onDelete });

      fireEvent.click(screen.getByTestId('repository-node-delete-button'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('deploy button', () => {
    it('renders Deploy button when repositoryPath is provided', () => {
      renderNode(dataWithRepoPath);

      expect(screen.getByRole('button', { name: /start dev server/i })).toBeInTheDocument();
    });

    it('does not render Deploy button when repositoryPath is absent', () => {
      renderNode(defaultData);

      expect(screen.queryByRole('button', { name: /start dev server/i })).not.toBeInTheDocument();
    });

    it('clicking Deploy calls the deploy action', () => {
      renderNode(dataWithRepoPath);

      fireEvent.click(screen.getByRole('button', { name: /start dev server/i }));

      expect(mockDeploy).toHaveBeenCalledOnce();
    });

    it('shows Stop button when deployment is active', () => {
      mockDeployHookReturn = { ...mockDeployHookReturn, status: 'Booting' };
      renderNode(dataWithRepoPath);

      expect(screen.getByRole('button', { name: /stop dev server/i })).toBeInTheDocument();
    });

    it('clicking Stop calls the stop action', () => {
      mockDeployHookReturn = { ...mockDeployHookReturn, status: 'Ready' };
      renderNode(dataWithRepoPath);

      fireEvent.click(screen.getByRole('button', { name: /stop dev server/i }));

      expect(mockStop).toHaveBeenCalledOnce();
    });

    it('renders DeploymentStatusBadge when status is Booting or Ready', () => {
      mockDeployHookReturn = {
        ...mockDeployHookReturn,
        status: 'Ready',
        url: 'http://localhost:3000',
      };
      renderNode(dataWithRepoPath);

      const badge = screen.getByTestId('deployment-status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-status', 'Ready');
    });

    it('does not render DeploymentStatusBadge when status is null', () => {
      renderNode(dataWithRepoPath);

      expect(screen.queryByTestId('deployment-status-badge')).not.toBeInTheDocument();
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
