import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolDetailDrawer } from '@/components/features/tools/tool-detail-drawer';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

const mockStartInstall = vi.fn();

vi.mock('@/hooks/use-tool-install-stream', () => ({
  useToolInstallStream: () => ({
    logs: [],
    status: 'idle',
    result: null,
    startInstall: mockStartInstall,
  }),
}));

function makeTool(overrides: Partial<ToolItem> = {}): ToolItem {
  return {
    id: 'tmux',
    name: 'tmux',
    summary: 'Terminal multiplexer',
    description: 'tmux is a terminal multiplexer for session management.',
    tags: ['terminal'],
    iconUrl: 'https://cdn.simpleicons.org/tmux',
    autoInstall: true,
    required: false,
    openDirectory: 'tmux new-session -c {dir}',
    documentationUrl: 'https://github.com/tmux/tmux/wiki',
    installCommand: 'sudo apt-get install -y tmux',
    status: { status: 'missing', toolName: 'tmux' },
    ...overrides,
  };
}

describe('ToolDetailDrawer', () => {
  it('renders tool name and description when open', () => {
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'tmux' })).toBeDefined();
    expect(
      screen.getByText('tmux is a terminal multiplexer for session management.')
    ).toBeDefined();
  });

  it('shows install command in code block', () => {
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('sudo apt-get install -y tmux')).toBeDefined();
  });

  it('shows install button for missing autoInstall tool', () => {
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: `Install ${makeTool().name}` })).toBeDefined();
  });

  it('shows installed badge for available tool', () => {
    const installed = makeTool({ status: { status: 'available' as const, toolName: 'tmux' } });
    render(<ToolDetailDrawer tool={installed} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Installed')).toBeDefined();
  });

  it('shows missing badge for missing tool', () => {
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Missing')).toBeDefined();
  });

  it('shows error badge for error tool', () => {
    const errorTool = makeTool({
      status: { status: 'error' as const, toolName: 'tmux', errorMessage: 'Permission denied' },
    });
    render(<ToolDetailDrawer tool={errorTool} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Error')).toBeDefined();
  });

  it('shows tag badges', () => {
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Terminal')).toBeDefined();
  });

  it('does not show install button for non-autoInstall tool', () => {
    const manual = makeTool({ autoInstall: false });
    render(<ToolDetailDrawer tool={manual} open={true} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^install$/i })).toBeNull();
  });

  it('shows launch button for installed launchable tool', () => {
    const installed = makeTool({
      status: { status: 'available' as const, toolName: 'tmux' },
      openDirectory: 'tmux new-session -c {dir}',
    });
    render(<ToolDetailDrawer tool={installed} open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /launch/i })).toBeDefined();
  });

  it('shows documentation link', () => {
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /documentation/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('https://github.com/tmux/tmux/wiki');
  });

  it('calls startInstall when install button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolDetailDrawer tool={makeTool()} open={true} onClose={vi.fn()} />);
    const installBtn = screen.getByRole('button', { name: `Install ${makeTool().name}` });
    await user.click(installBtn);
    expect(mockStartInstall).toHaveBeenCalledOnce();
  });
});
