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

  it('save button is disabled initially when no changes', () => {
    render(
      <EnvironmentSettingsSection
        environment={{ defaultEditor: EditorType.VsCode, shellPreference: 'bash' }}
      />
    );
    expect(screen.getByTestId('environment-save-button')).toHaveProperty('disabled', true);
  });
});
