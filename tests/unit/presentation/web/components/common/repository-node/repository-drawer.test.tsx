import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepositoryDrawer } from '@/components/common/repository-node/repository-drawer';
import type { RepositoryNodeData } from '@/components/common/repository-node/repository-node-config';

// Mock useRepositoryActions
vi.mock('@/components/common/repository-node/use-repository-actions', () => ({
  useRepositoryActions: () => ({
    openInIde: vi.fn(),
    openInShell: vi.fn(),
    openFolder: vi.fn(),
    ideLoading: false,
    shellLoading: false,
    folderLoading: false,
    ideError: null,
    shellError: null,
    folderError: null,
  }),
}));

// Mock BaseDrawer — render children directly
vi.mock('@/components/common/base-drawer', () => ({
  BaseDrawer: ({
    open,
    children,
    header,
  }: {
    open: boolean;
    children?: React.ReactNode;
    header?: React.ReactNode;
    [key: string]: unknown;
  }) =>
    open ? (
      <div data-testid="base-drawer">
        {header}
        {children}
      </div>
    ) : null,
}));

// Mock UI primitives
vi.mock('@/components/ui/drawer', () => ({
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <span className={className} {...props}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/common/action-button', () => ({
  ActionButton: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

const baseData: RepositoryNodeData = {
  id: 'repo-1',
  name: 'shep-ai/cli',
  repositoryPath: '/home/user/shep-ai/cli',
};

const enrichedData: RepositoryNodeData = {
  ...baseData,
  branch: 'feat/my-feature',
  commitMessage: 'feat: add new feature',
  committer: 'Jane Doe',
  behindCount: 3,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
};

describe('RepositoryDrawer', () => {
  it('renders nothing when data is null', () => {
    render(<RepositoryDrawer data={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('base-drawer')).not.toBeInTheDocument();
  });

  it('renders drawer when data is provided', () => {
    render(<RepositoryDrawer data={baseData} onClose={vi.fn()} />);
    expect(screen.getByTestId('base-drawer')).toBeInTheDocument();
  });

  it('shows repository name in header', () => {
    render(<RepositoryDrawer data={baseData} onClose={vi.fn()} />);
    expect(screen.getByText('shep-ai/cli')).toBeInTheDocument();
  });

  it('shows repository path in header', () => {
    render(<RepositoryDrawer data={baseData} onClose={vi.fn()} />);
    expect(screen.getByText('/home/user/shep-ai/cli')).toBeInTheDocument();
  });

  describe('git status section', () => {
    it('shows GIT STATUS section when branch is provided', () => {
      render(<RepositoryDrawer data={enrichedData} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-git-section')).toBeInTheDocument();
    });

    it('does not show GIT STATUS section when no git info', () => {
      render(<RepositoryDrawer data={baseData} onClose={vi.fn()} />);
      expect(screen.queryByTestId('repository-drawer-git-section')).not.toBeInTheDocument();
    });

    it('shows branch name badge', () => {
      render(<RepositoryDrawer data={enrichedData} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-branch')).toHaveTextContent('feat/my-feature');
    });

    it('shows behind count badge when behindCount > 0', () => {
      render(<RepositoryDrawer data={enrichedData} onClose={vi.fn()} />);
      const behind = screen.getByTestId('repository-drawer-behind');
      expect(behind).toBeInTheDocument();
      expect(behind).toHaveTextContent('3 behind');
    });

    it('does not show behind badge when behindCount is 0', () => {
      render(<RepositoryDrawer data={{ ...enrichedData, behindCount: 0 }} onClose={vi.fn()} />);
      expect(screen.queryByTestId('repository-drawer-behind')).not.toBeInTheDocument();
    });

    it('does not show behind badge when behindCount is null', () => {
      render(<RepositoryDrawer data={{ ...enrichedData, behindCount: null }} onClose={vi.fn()} />);
      expect(screen.queryByTestId('repository-drawer-behind')).not.toBeInTheDocument();
    });
  });

  describe('commit section', () => {
    it('shows commit message', () => {
      render(<RepositoryDrawer data={enrichedData} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-commit-message')).toHaveTextContent(
        'feat: add new feature'
      );
    });

    it('shows committer name', () => {
      render(<RepositoryDrawer data={enrichedData} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-committer')).toHaveTextContent('Jane Doe');
    });

    it('does not show committer when absent', () => {
      render(
        <RepositoryDrawer data={{ ...enrichedData, committer: undefined }} onClose={vi.fn()} />
      );
      expect(screen.queryByTestId('repository-drawer-committer')).not.toBeInTheDocument();
    });

    it('shows git section when only commitMessage (no branch) is provided', () => {
      render(
        <RepositoryDrawer data={{ ...baseData, commitMessage: 'fix: bug' }} onClose={vi.fn()} />
      );
      expect(screen.getByTestId('repository-drawer-git-section')).toBeInTheDocument();
    });
  });

  describe('open with actions', () => {
    it('shows OPEN WITH section when repositoryPath is provided', () => {
      render(<RepositoryDrawer data={baseData} onClose={vi.fn()} />);
      expect(screen.getByText('Open in IDE')).toBeInTheDocument();
      expect(screen.getByText('Open in Shell')).toBeInTheDocument();
      expect(screen.getByText('Open Folder')).toBeInTheDocument();
    });

    it('does not show OPEN WITH section when repositoryPath is absent', () => {
      render(
        <RepositoryDrawer data={{ ...baseData, repositoryPath: undefined }} onClose={vi.fn()} />
      );
      expect(screen.queryByText('Open in IDE')).not.toBeInTheDocument();
    });
  });

  describe('metadata section', () => {
    it('shows INFO section when createdAt is provided', () => {
      render(<RepositoryDrawer data={enrichedData} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-metadata')).toBeInTheDocument();
      expect(screen.getByTestId('repository-drawer-created-at')).toBeInTheDocument();
    });

    it('does not show INFO section when createdAt is absent', () => {
      render(<RepositoryDrawer data={baseData} onClose={vi.fn()} />);
      expect(screen.queryByTestId('repository-drawer-metadata')).not.toBeInTheDocument();
    });

    it('shows "5 days ago" for createdAt 5 days in the past', () => {
      const fiveDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 5;
      render(<RepositoryDrawer data={{ ...baseData, createdAt: fiveDaysAgo }} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-created-at')).toHaveTextContent('5 days ago');
    });

    it('shows "Today" for createdAt less than 1 day ago', () => {
      const justNow = Date.now() - 1000 * 60 * 60;
      render(<RepositoryDrawer data={{ ...baseData, createdAt: justNow }} onClose={vi.fn()} />);
      expect(screen.getByTestId('repository-drawer-created-at')).toHaveTextContent('Today');
    });
  });
});
