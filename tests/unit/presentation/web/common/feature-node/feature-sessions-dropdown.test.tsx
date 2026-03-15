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

import { FeatureSessionsDropdown } from '@/components/common/feature-node/feature-sessions-dropdown';

const mockSessions = [
  {
    id: 'session-abc',
    preview: 'Add authentication middleware',
    messageCount: 24,
    firstMessageAt: new Date(Date.now() - 3_600_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 1_800_000).toISOString(),
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    projectPath: '~/workspaces/my-project',
  },
  {
    id: 'session-def',
    preview: 'Fix failing tests',
    messageCount: 12,
    firstMessageAt: new Date(Date.now() - 86_400_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 82_800_000).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    projectPath: '~/workspaces/my-project',
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
    projectPath: '~/workspaces/my-project',
  },
];

describe('FeatureSessionsDropdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the sessions trigger button', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sessions: [] }) })
    );
    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);
    expect(screen.getByTestId('feature-node-sessions-button')).toBeDefined();
  });

  it('probes for active sessions on mount and fetches full list on dropdown open', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: mockSessions }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);

    // Should probe with limit=1 on mount (lightweight active check)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('limit=1'));
    });

    // Should fetch full list (limit=10) when dropdown opens
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
    });
  });

  it('displays session previews after opening', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: mockSessions }),
      })
    );

    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);

    // Wait for eager fetch, then open
    await waitFor(() => expect(screen.getByTestId('feature-node-sessions-button')).toBeDefined());
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(screen.getByText('Add authentication middleware')).toBeDefined();
      expect(screen.getByText('Fix failing tests')).toBeDefined();
    });
  });

  it('shows empty state when no sessions found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: [] }),
      })
    );

    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);

    await waitFor(() => expect(screen.getByTestId('feature-node-sessions-button')).toBeDefined());
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(screen.getByText('No sessions found')).toBeDefined();
    });
  });

  it('displays message counts for sessions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: mockSessions }),
      })
    );

    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);

    await waitFor(() => expect(screen.getByTestId('feature-node-sessions-button')).toBeDefined());
    await userEvent.click(screen.getByTestId('feature-node-sessions-button'));

    await waitFor(() => {
      expect(screen.getByText('24')).toBeDefined();
      expect(screen.getByText('12')).toBeDefined();
    });
  });

  it('highlights the icon green on mount when a session is active (< 5 min)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: mockActiveSessions }),
      })
    );

    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);

    // The lightweight mount probe detects the active session
    await waitFor(() => {
      const button = screen.getByTestId('feature-node-sessions-button');
      expect(button.className).toContain('text-emerald-600');
    });
  });

  it('does not highlight when no active sessions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: mockSessions }), // all > 5 min old
      })
    );

    render(<FeatureSessionsDropdown repositoryPath="/home/user/project" />);

    await waitFor(() => {
      const button = screen.getByTestId('feature-node-sessions-button');
      expect(button.className).toContain('text-muted-foreground');
      expect(button.className).not.toContain('text-emerald-600');
    });
  });
});
