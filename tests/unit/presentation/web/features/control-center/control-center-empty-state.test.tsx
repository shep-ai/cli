import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/app/actions/get-all-agent-models', () => ({
  getAllAgentModels: vi.fn(() =>
    Promise.resolve([
      {
        agentType: 'claude-code',
        label: 'Claude Code',
        models: [{ id: 'opus-4', displayName: 'Opus 4', description: 'Best' }],
      },
    ])
  ),
}));

vi.mock('@/app/actions/check-agent-tool', () => ({
  checkAgentTool: vi.fn(() =>
    Promise.resolve({
      agentType: 'claude-code',
      toolId: 'claude-code',
      tool: null,
      installed: true,
    })
  ),
}));

vi.mock('@/app/actions/update-agent-and-model', () => ({
  updateAgentAndModel: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock('@/hooks/use-tool-install-stream', () => ({
  useToolInstallStream: () => ({
    logs: [],
    status: 'idle',
    result: null,
    startInstall: vi.fn(),
  }),
}));

vi.mock('@/components/common/feature-node/agent-type-icons', () => ({
  getAgentTypeIcon: () => {
    function MockIcon(props: Record<string, unknown>) {
      return <span data-testid="agent-icon" {...props} />;
    }
    return MockIcon;
  },
}));

vi.mock('@/lib/model-metadata', () => ({
  getModelMeta: (id: string) => ({
    displayName: id,
    description: `Description for ${id}`,
  }),
}));

vi.mock('next/image', () => ({
  default: function MockImage(props: Record<string, unknown>) {
    return <img {...props} />;
  },
}));

vi.mock('@/components/common/add-repository-button/pick-folder', () => ({
  pickFolder: vi.fn(() => Promise.resolve(null)),
}));

import { ControlCenterEmptyState } from '@/components/features/control-center/control-center-empty-state';

describe('ControlCenterEmptyState', () => {
  it('renders agent setup first, not repo section', async () => {
    render(<ControlCenterEmptyState />);

    await waitFor(() => {
      expect(screen.getByTestId('welcome-agent-setup')).toBeInTheDocument();
    });

    // Repo section should not be visible yet
    expect(screen.queryByTestId('empty-state-add-repository')).not.toBeInTheDocument();
  });

  it('renders page header', async () => {
    render(<ControlCenterEmptyState />);

    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Control Center')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ControlCenterEmptyState className="custom-class" />);

    const container = screen.getByTestId('control-center-empty-state');
    expect(container).toHaveClass('custom-class');
  });
});
