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

vi.mock('@/app/actions/update-agent-and-model', () => ({
  updateAgentAndModel: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock('@/app/actions/check-agent-auth', () => ({
  checkAgentAuth: vi.fn(() =>
    Promise.resolve({
      agentType: 'claude-code',
      installed: true,
      authenticated: true,
      label: 'Claude Code',
      binaryName: 'claude',
      authCommand: null,
      installCommand: null,
    })
  ),
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

vi.mock('@/app/actions/agent-setup-flag', () => ({
  isAgentSetupComplete: vi.fn(() => Promise.resolve(false)),
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

    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });
    expect(screen.getByText('Control Center')).toBeInTheDocument();
  });

  it('applies custom className', async () => {
    render(<ControlCenterEmptyState className="custom-class" />);

    await waitFor(() => {
      expect(screen.getByTestId('control-center-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('control-center-empty-state')).toHaveClass('custom-class');
  });
});
