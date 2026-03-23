import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock radix-ui tooltip
vi.mock('radix-ui', () => ({
  Tooltip: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: () => null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  Slot: {
    Root: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock dropdown-menu with functional open/close behavior + submenu support
vi.mock('@/components/ui/dropdown-menu', () => {
  const DropdownMenuContext = React.createContext<{
    open: boolean;
    setOpen: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
  }>({ open: false, setOpen: () => undefined });

  return {
    DropdownMenu: ({
      children,
      onOpenChange,
    }: {
      children: React.ReactNode;
      onOpenChange?: (open: boolean) => void;
    }) => {
      const [open, setOpen] = React.useState(false);
      return (
        <DropdownMenuContext.Provider value={{ open, setOpen, onOpenChange }}>
          {children}
        </DropdownMenuContext.Provider>
      );
    },
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => {
      const ctx = React.useContext(DropdownMenuContext);
      return (
        <div
          onClickCapture={() => {
            const newOpen = !ctx.open;
            ctx.setOpen(newOpen);
            ctx.onOpenChange?.(newOpen);
          }}
        >
          {children}
        </div>
      );
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => {
      const ctx = React.useContext(DropdownMenuContext);
      if (!ctx.open) return null;
      return <div role="menu">{children}</div>;
    },
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      [key: string]: unknown;
    }) => (
      <button role="menuitem" onClick={onClick}>
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSubTrigger: ({
      children,
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div>{children}</div>,
    DropdownMenuSubContent: ({
      children,
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div>{children}</div>,
    DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const REPO_PATH = '/home/user/project';

const mockSessions = [
  {
    id: 'session-abc',
    preview: 'Add authentication middleware',
    messageCount: 24,
    firstMessageAt: new Date(Date.now() - 3_600_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 1_800_000).toISOString(),
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    projectPath: REPO_PATH,
  },
  {
    id: 'session-def',
    preview: 'Fix failing tests',
    messageCount: 12,
    firstMessageAt: new Date(Date.now() - 86_400_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 82_800_000).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    projectPath: REPO_PATH,
  },
];

const mockActiveSessions = [
  {
    id: 'session-active',
    preview: 'Currently running task',
    messageCount: 5,
    firstMessageAt: new Date(Date.now() - 120_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago — active
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    projectPath: REPO_PATH,
  },
];

// Mock the sessions context to provide test data directly
let mockGetSessions: (path: string) => unknown[] = () => [];
let mockHasActive: (path: string) => boolean = () => false;

vi.mock('@/hooks/sessions-provider', () => ({
  useSessionsContext: () => ({
    getSessionsForPath: (path: string) => mockGetSessions(path),
    hasActiveSessions: (path: string) => mockHasActive(path),
  }),
  SessionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { FeatureSessionsDropdown } from '@/components/common/feature-node/feature-sessions-dropdown';

describe('FeatureSessionsDropdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetSessions = () => [];
    mockHasActive = () => false;
  });

  it('renders the sessions trigger button', () => {
    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);
    expect(screen.getByTestId('feature-node-sessions-button')).toBeDefined();
  });

  it('shows count badge from context data', () => {
    mockGetSessions = (path: string) => (path === REPO_PATH ? mockSessions : []);

    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);

    // Count badge should be visible immediately (no fetch needed)
    expect(screen.getByTestId('feature-node-sessions-count').textContent).toBe('2');
  });

  it('displays session previews after opening', async () => {
    mockGetSessions = (path: string) => (path === REPO_PATH ? mockSessions : []);

    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(screen.getByText('Add authentication middleware')).toBeDefined();
      expect(screen.getByText('Fix failing tests')).toBeDefined();
    });
  });

  it('shows empty state when no sessions found', async () => {
    mockGetSessions = () => [];

    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(screen.getByText('No sessions found')).toBeDefined();
    });
  });

  it('displays message counts for sessions', async () => {
    mockGetSessions = (path: string) => (path === REPO_PATH ? mockSessions : []);

    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(screen.getByText('24')).toBeDefined();
      expect(screen.getByText('12')).toBeDefined();
    });
  });

  it('shows green dot indicator when context reports active sessions', () => {
    mockGetSessions = (path: string) => (path === REPO_PATH ? mockActiveSessions : []);
    mockHasActive = (path: string) => path === REPO_PATH;

    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);

    const button = screen.getByTestId('feature-node-sessions-button');
    const dot = button.querySelector('.bg-emerald-500');
    expect(dot).toBeInTheDocument();
  });

  it('does not highlight when no active sessions', () => {
    mockGetSessions = (path: string) => (path === REPO_PATH ? mockSessions : []);
    mockHasActive = () => false;

    render(<FeatureSessionsDropdown repositoryPath={REPO_PATH} />);

    const button = screen.getByTestId('feature-node-sessions-button');
    expect(button.className).toContain('text-muted-foreground');
    const dot = button.querySelector('.bg-emerald-500');
    expect(dot).toBeNull();
  });
});
