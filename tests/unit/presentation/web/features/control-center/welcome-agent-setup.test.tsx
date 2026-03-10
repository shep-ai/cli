import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGroups = [
  {
    agentType: 'claude-code',
    label: 'Claude Code',
    models: [
      { id: 'opus-4', displayName: 'Opus 4', description: 'Most capable' },
      { id: 'sonnet-4', displayName: 'Sonnet 4', description: 'Fast' },
    ],
  },
  {
    agentType: 'dev',
    label: 'Demo',
    models: [],
  },
];

vi.mock('@/app/actions/get-all-agent-models', () => ({
  getAllAgentModels: vi.fn(() => Promise.resolve(mockGroups)),
}));

vi.mock('@/app/actions/check-agent-tool', () => ({
  checkAgentTool: vi.fn((agentType: string) => {
    if (agentType === 'dev') {
      return Promise.resolve({ agentType, toolId: null, tool: null, installed: true });
    }
    return Promise.resolve({
      agentType,
      toolId: 'claude-code',
      tool: {
        id: 'claude-code',
        name: 'Claude Code',
        status: { status: 'available', toolName: 'claude-code' },
        autoInstall: true,
      },
      installed: true,
    });
  }),
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

import { WelcomeAgentSetup } from '@/components/features/control-center/welcome-agent-setup';

describe('WelcomeAgentSetup', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders agent list after loading', async () => {
    render(<WelcomeAgentSetup onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('agent-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('agent-option-claude-code')).toBeInTheDocument();
    expect(screen.getByTestId('agent-option-dev')).toBeInTheDocument();
  });

  it('shows model list after selecting an agent with models', async () => {
    const user = userEvent.setup();
    render(<WelcomeAgentSetup onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('agent-option-claude-code')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('agent-option-claude-code'));

    await waitFor(() => {
      expect(screen.getByTestId('model-list')).toBeInTheDocument();
    });
  });

  it('skips model selection for agents without models and shows tool check', async () => {
    const user = userEvent.setup();
    render(<WelcomeAgentSetup onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('agent-option-dev')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('agent-option-dev'));

    await waitFor(() => {
      expect(screen.getByText('No additional tools required')).toBeInTheDocument();
    });
  });

  it('shows tool status after selecting agent and model', async () => {
    const user = userEvent.setup();
    render(<WelcomeAgentSetup onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('agent-option-claude-code')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('agent-option-claude-code'));

    await waitFor(() => {
      expect(screen.getByTestId('model-list')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('model-option-opus-4'));

    await waitFor(() => {
      expect(screen.getByText(/installed/i)).toBeInTheDocument();
    });
  });

  it('calls onComplete after confirming setup', async () => {
    const user = userEvent.setup();
    render(<WelcomeAgentSetup onComplete={onComplete} />);

    // Select dev agent (no models, no tool needed)
    await waitFor(() => {
      expect(screen.getByTestId('agent-option-dev')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('agent-option-dev'));

    await waitFor(() => {
      expect(screen.getByTestId('agent-setup-confirm')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('agent-setup-confirm'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('shows loading state initially', () => {
    render(<WelcomeAgentSetup onComplete={onComplete} />);
    expect(screen.getByText('Loading agents...')).toBeInTheDocument();
  });

  it('renders step indicator', async () => {
    render(<WelcomeAgentSetup onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('welcome-agent-setup')).toBeInTheDocument();
    });

    expect(screen.getByText('Choose your agent')).toBeInTheDocument();
  });
});
