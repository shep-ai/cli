import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPageClient } from '@/components/features/settings/settings-page-client';
import { createDefaultSettings } from '@shepai/core/domain/factories/settings-defaults.factory';
import { toast } from 'sonner';
import { updateSettings } from '@/app/actions/update-settings';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/actions/update-settings', () => ({
  updateSettings: vi.fn(),
}));

const mockUpdateSettings = vi.mocked(updateSettings);
const defaultSettings = createDefaultSettings();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SettingsPageClient', () => {
  it('renders page header with correct title', () => {
    render(<SettingsPageClient settings={defaultSettings} />);
    expect(screen.getByRole('heading', { level: 1, name: /Settings/ })).toBeInTheDocument();
  });

  it('renders page header description', () => {
    render(<SettingsPageClient settings={defaultSettings} />);
    expect(screen.getByText('Configure your platform preferences')).toBeInTheDocument();
  });

  it('renders all 7 tab triggers', () => {
    render(<SettingsPageClient settings={defaultSettings} />);
    expect(screen.getByRole('tab', { name: /Models/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Agent/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Workflow/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /User Profile/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Environment/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Notifications/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /System/ })).toBeInTheDocument();
  });

  it('defaults to Models tab', () => {
    render(<SettingsPageClient settings={defaultSettings} />);
    const modelsTab = screen.getByRole('tab', { name: /Models/ });
    expect(modelsTab).toHaveAttribute('data-state', 'active');
  });

  it('switches tabs when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={defaultSettings} />);

    const agentTab = screen.getByRole('tab', { name: /Agent/ });
    await user.click(agentTab);

    expect(agentTab).toHaveAttribute('data-state', 'active');
    const modelsTab = screen.getByRole('tab', { name: /Models/ });
    expect(modelsTab).toHaveAttribute('data-state', 'inactive');
  });

  it('renders ModelSettingsSection in Models tab with model inputs', () => {
    render(<SettingsPageClient settings={defaultSettings} />);
    expect(screen.getByLabelText('Analyze')).toBeInTheDocument();
    expect(screen.getByLabelText('Requirements')).toBeInTheDocument();
    expect(screen.getByLabelText('Plan')).toBeInTheDocument();
    expect(screen.getByLabelText('Implement')).toBeInTheDocument();
  });

  it('renders AgentSection when Agent tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={defaultSettings} />);

    await user.click(screen.getByRole('tab', { name: /Agent/ }));
    expect(screen.getByLabelText('Agent Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Authentication Method')).toBeInTheDocument();
  });

  it('renders SystemSection when System tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient settings={defaultSettings} />);

    await user.click(screen.getByRole('tab', { name: /System/ }));
    expect(screen.getByLabelText('Auto Update')).toBeInTheDocument();
    expect(screen.getByLabelText('Log Level')).toBeInTheDocument();
  });

  it('shows toast on successful save', async () => {
    const user = userEvent.setup();
    mockUpdateSettings.mockResolvedValue({ data: defaultSettings });

    render(<SettingsPageClient settings={defaultSettings} />);

    // Click Save in the Models tab (default tab)
    const saveButton = screen.getByRole('button', { name: /Save/ });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        section: 'models',
        data: expect.objectContaining({
          analyze: defaultSettings.models.analyze,
        }),
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Settings saved');
    });
  });

  it('shows error toast on failed save', async () => {
    const user = userEvent.setup();
    mockUpdateSettings.mockResolvedValue({ error: 'Database write failed' });

    render(<SettingsPageClient settings={defaultSettings} />);

    const saveButton = screen.getByRole('button', { name: /Save/ });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save settings', {
        description: 'Database write failed',
      });
    });
  });
});
