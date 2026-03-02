import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPageClient } from '@/components/features/settings/settings-page-client';
import type { Settings } from '@shepai/core/domain/generated/output';
import { EditorType, AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

function makeSettings(overrides?: Partial<Settings>): Settings {
  return {
    id: 'settings-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingComplete: false,
    models: {
      analyze: 'claude-sonnet-4-5',
      requirements: 'claude-sonnet-4-5',
      plan: 'claude-sonnet-4-5',
      implement: 'claude-sonnet-4-5',
    },
    user: {
      name: '',
      email: '',
      githubUsername: '',
    },
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
    },
    system: {
      autoUpdate: true,
      logLevel: 'info',
    },
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
      token: '',
    },
    notifications: {
      inApp: { enabled: true },
      browser: { enabled: true },
      desktop: { enabled: true },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
      },
    },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
    },
    ...overrides,
  };
}

describe('SettingsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders the settings page with data-testid', () => {
    render(<SettingsPageClient settings={makeSettings()} />);
    expect(screen.getByTestId('settings-page-client')).toBeInTheDocument();
  });

  it('renders heading with "Settings" text', () => {
    render(<SettingsPageClient settings={makeSettings()} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders 7 tab triggers with correct labels', () => {
    render(<SettingsPageClient settings={makeSettings()} />);
    expect(screen.getByTestId('settings-tab-models')).toHaveTextContent('Models');
    expect(screen.getByTestId('settings-tab-profile')).toHaveTextContent('Profile');
    expect(screen.getByTestId('settings-tab-environment')).toHaveTextContent('Environment');
    expect(screen.getByTestId('settings-tab-system')).toHaveTextContent('System');
    expect(screen.getByTestId('settings-tab-agent')).toHaveTextContent('Agent');
    expect(screen.getByTestId('settings-tab-notifications')).toHaveTextContent('Notifications');
    expect(screen.getByTestId('settings-tab-workflow')).toHaveTextContent('Workflow');
  });

  it('renders Save button', () => {
    render(<SettingsPageClient settings={makeSettings()} />);
    expect(screen.getByTestId('settings-save-button')).toBeInTheDocument();
  });

  it('Save button is disabled when form is clean', () => {
    render(<SettingsPageClient settings={makeSettings()} />);
    expect(screen.getByTestId('settings-save-button')).toBeDisabled();
  });

  it('Save button becomes enabled when form is dirty', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    const analyzeInput = screen.getByRole('textbox', { name: /analyze model/i });
    await user.clear(analyzeInput);
    await user.type(analyzeInput, 'gpt-4');

    expect(screen.getByTestId('settings-save-button')).not.toBeDisabled();
  });

  // Models section
  it('Models tab shows 4 labeled input fields', () => {
    render(<SettingsPageClient settings={makeSettings()} />);
    expect(screen.getByTestId('settings-section-models')).toBeInTheDocument();
    expect(screen.getByText('Analyze Model')).toBeInTheDocument();
    expect(screen.getByText('Requirements Model')).toBeInTheDocument();
    expect(screen.getByText('Plan Model')).toBeInTheDocument();
    expect(screen.getByText('Implement Model')).toBeInTheDocument();
  });

  // Profile section
  it('Profile tab shows 3 labeled input fields', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-profile'));
    expect(screen.getByTestId('settings-section-profile')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('GitHub Username')).toBeInTheDocument();
  });

  // Environment section
  it('Environment tab shows editor dropdown and shell input', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-environment'));
    expect(screen.getByTestId('settings-section-environment')).toBeInTheDocument();
    expect(screen.getByText('Default Editor')).toBeInTheDocument();
    expect(screen.getByText('Shell Preference')).toBeInTheDocument();
  });

  // System section
  it('System tab shows autoUpdate switch and logLevel', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-system'));
    expect(screen.getByTestId('settings-section-system')).toBeInTheDocument();
    expect(screen.getByText('Auto Update')).toBeInTheDocument();
    expect(screen.getByText('Log Level')).toBeInTheDocument();
  });

  // Agent section
  it('Agent tab shows agent type and auth method dropdowns', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-agent'));
    expect(screen.getByTestId('settings-section-agent')).toBeInTheDocument();
    expect(screen.getByText('Agent Type')).toBeInTheDocument();
    expect(screen.getByText('Auth Method')).toBeInTheDocument();
  });

  it('token field is hidden when authMethod is session', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-agent'));
    expect(screen.queryByText('API Token')).not.toBeInTheDocument();
  });

  it('token field is visible when authMethod is token', async () => {
    const user = userEvent.setup();
    const settings = makeSettings({
      agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Token, token: 'sk-test' },
    });
    render(<SettingsPageClient settings={settings} />);

    await user.click(screen.getByTestId('settings-tab-agent'));
    expect(screen.getByText('API Token')).toBeInTheDocument();
  });

  it('clicking reveal toggle shows and hides token value', async () => {
    const user = userEvent.setup();
    const settings = makeSettings({
      agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Token, token: 'sk-test' },
    });
    render(<SettingsPageClient settings={settings} />);

    await user.click(screen.getByTestId('settings-tab-agent'));

    const tokenInput = screen.getByPlaceholderText('Enter your API token');
    expect(tokenInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByTestId('token-reveal-toggle'));
    expect(tokenInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByTestId('token-reveal-toggle'));
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  // Notifications section
  it('Notifications tab renders 12 switch toggles total', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-notifications'));
    expect(screen.getByTestId('settings-section-notifications')).toBeInTheDocument();

    // 3 channels + 9 events = 12 switches
    const switches = screen
      .getByTestId('settings-section-notifications')
      .querySelectorAll('button[role="switch"]');
    expect(switches).toHaveLength(12);
  });

  it('Notifications tab shows channel and event labels', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-notifications'));
    expect(screen.getByText('In-App')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Agent Started')).toBeInTheDocument();
    expect(screen.getByText('PR Merged')).toBeInTheDocument();
    expect(screen.getByText('PR Checks Failed')).toBeInTheDocument();
  });

  // Workflow section
  it('Workflow tab renders switch toggles and number inputs', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-workflow'));
    expect(screen.getByTestId('settings-section-workflow')).toBeInTheDocument();

    // 5 switches: openPr + 4 approval gates
    const switches = screen
      .getByTestId('settings-section-workflow')
      .querySelectorAll('button[role="switch"]');
    expect(switches).toHaveLength(5);

    // 3 number inputs
    expect(screen.getByText('Max Fix Attempts')).toBeInTheDocument();
    expect(screen.getByText('Watch Timeout (ms)')).toBeInTheDocument();
    expect(screen.getByText('Log Max Characters')).toBeInTheDocument();
  });

  it('Workflow tab shows approval gate labels', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-workflow'));
    expect(screen.getByText('Allow PRD')).toBeInTheDocument();
    expect(screen.getByText('Allow Plan')).toBeInTheDocument();
    expect(screen.getByText('Allow Merge')).toBeInTheDocument();
    expect(screen.getByText('Push on Implementation Complete')).toBeInTheDocument();
  });

  // Save flow
  it('submitting form calls fetch with PUT /api/settings', async () => {
    const user = userEvent.setup();
    const settings = makeSettings();
    const updatedSettings = { ...settings, models: { ...settings.models, analyze: 'gpt-4' } };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedSettings),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<SettingsPageClient settings={settings} />);

    const analyzeInput = screen.getByRole('textbox', { name: /analyze model/i });
    await user.clear(analyzeInput);
    await user.type(analyzeInput, 'gpt-4');

    await user.click(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Settings saved');
    });
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    const settings = makeSettings();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<SettingsPageClient settings={settings} />);

    const analyzeInput = screen.getByRole('textbox', { name: /analyze model/i });
    await user.clear(analyzeInput);
    await user.type(analyzeInput, 'gpt-4');

    await user.click(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Server error');
    });
  });

  it('shows error toast when fetch throws', async () => {
    const user = userEvent.setup();
    const settings = makeSettings();

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    render(<SettingsPageClient settings={settings} />);

    const analyzeInput = screen.getByRole('textbox', { name: /analyze model/i });
    await user.clear(analyzeInput);
    await user.type(analyzeInput, 'gpt-4');

    await user.click(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Network error');
    });
  });

  // Validation
  it('invalid email shows validation error on submit', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={makeSettings()} />);

    await user.click(screen.getByTestId('settings-tab-profile'));

    const emailInput = screen.getByPlaceholderText('you@example.com');
    await user.type(emailInput, 'not-an-email');

    await user.click(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/invalid/i);
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });
  });
});
