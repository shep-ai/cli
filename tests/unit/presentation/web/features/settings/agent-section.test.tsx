import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentAuthMethod, AgentType } from '@shepai/core/domain/generated/output';
import type { AgentConfig } from '@shepai/core/domain/generated/output';
import { AgentSection } from '@/components/features/settings/agent-section';

const defaultAgent: AgentConfig = {
  type: AgentType.ClaudeCode,
  authMethod: AgentAuthMethod.Session,
  token: undefined,
};

describe('AgentSection', () => {
  it('renders agent type selector with current value', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);

    // The select trigger should display the selected agent type label
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
  });

  it('renders agent type label', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);

    expect(screen.getByText('Agent Type')).toBeInTheDocument();
  });

  it('renders auth method selector with current value', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);

    // Should show Session as the current auth method
    expect(screen.getByText('Session')).toBeInTheDocument();
  });

  it('renders auth method label', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);

    expect(screen.getByText('Authentication Method')).toBeInTheDocument();
  });

  it('shows token input only when auth method is token', () => {
    render(
      <AgentSection
        agent={{ ...defaultAgent, authMethod: AgentAuthMethod.Token, token: '' }}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/api token/i)).toBeInTheDocument();
  });

  it('hides token input when auth method is session', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);

    expect(screen.queryByLabelText(/api token/i)).not.toBeInTheDocument();
  });

  it('renders token input as password type by default', () => {
    render(
      <AgentSection
        agent={{ ...defaultAgent, authMethod: AgentAuthMethod.Token, token: 'secret-token' }}
        onSave={vi.fn()}
      />
    );

    const tokenInput = screen.getByLabelText(/api token/i);
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('toggles token visibility with eye button', async () => {
    const user = userEvent.setup();
    render(
      <AgentSection
        agent={{ ...defaultAgent, authMethod: AgentAuthMethod.Token, token: 'secret-token' }}
        onSave={vi.fn()}
      />
    );

    const tokenInput = screen.getByLabelText(/api token/i);
    expect(tokenInput).toHaveAttribute('type', 'password');

    // Click the toggle button to reveal — aria-label is "Show token" when hidden
    const toggleButton = screen.getByRole('button', { name: /show token/i });
    await user.click(toggleButton);

    expect(tokenInput).toHaveAttribute('type', 'text');

    // After reveal, aria-label changes to "Hide token"
    const hideButton = screen.getByRole('button', { name: /hide token/i });
    await user.click(hideButton);
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('has autoComplete off on token input', () => {
    render(
      <AgentSection
        agent={{ ...defaultAgent, authMethod: AgentAuthMethod.Token, token: '' }}
        onSave={vi.fn()}
      />
    );

    const tokenInput = screen.getByLabelText(/api token/i);
    expect(tokenInput).toHaveAttribute('autoComplete', 'off');
  });

  it('renders save button', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave with agent config when save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);

    render(<AgentSection agent={defaultAgent} onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      })
    );
  });

  it('calls onSave with token when auth method is token', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);

    render(
      <AgentSection
        agent={{ ...defaultAgent, authMethod: AgentAuthMethod.Token, token: 'my-token' }}
        onSave={onSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Token,
        token: 'my-token',
      })
    );
  });

  it('renders card with agent configuration title', () => {
    render(<AgentSection agent={defaultAgent} onSave={vi.fn()} />);

    expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
  });

  it('displays token auth method value when set to token', () => {
    render(
      <AgentSection
        agent={{ ...defaultAgent, authMethod: AgentAuthMethod.Token, token: '' }}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Token')).toBeInTheDocument();
  });
});
