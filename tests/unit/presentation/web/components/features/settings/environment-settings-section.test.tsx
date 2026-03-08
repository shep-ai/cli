import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentSettingsSection } from '@/components/features/settings/environment-settings-section';
import { EditorType } from '@shepai/core/domain/generated/output';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('EnvironmentSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders editor select', () => {
    render(
      <EnvironmentSettingsSection
        environment={{ defaultEditor: EditorType.VsCode, shellPreference: 'bash' }}
      />
    );
    expect(screen.getByTestId('editor-select')).toBeDefined();
    expect(screen.getByText('IDE & Terminal')).toBeDefined();
  });

  it('renders shell select', () => {
    render(
      <EnvironmentSettingsSection
        environment={{ defaultEditor: EditorType.VsCode, shellPreference: 'bash' }}
      />
    );
    expect(screen.getByTestId('shell-select')).toBeDefined();
  });

  it('does not render a save button (auto-saves on change)', () => {
    render(
      <EnvironmentSettingsSection
        environment={{ defaultEditor: EditorType.VsCode, shellPreference: 'bash' }}
      />
    );
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('renders section description', () => {
    render(
      <EnvironmentSettingsSection
        environment={{ defaultEditor: EditorType.VsCode, shellPreference: 'bash' }}
      />
    );
    expect(screen.getByText('Configure your default editor and shell preferences')).toBeDefined();
  });
});
