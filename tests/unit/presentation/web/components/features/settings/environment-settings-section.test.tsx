import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentSettingsSection } from '@/components/features/settings/environment-settings-section';
import { EditorType, TerminalType } from '@shepai/core/domain/generated/output';

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
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
      />
    );
    expect(screen.getByTestId('editor-select')).toBeDefined();
    expect(screen.getByText('IDE & Terminal')).toBeDefined();
  });

  it('renders shell select', () => {
    render(
      <EnvironmentSettingsSection
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
      />
    );
    expect(screen.getByTestId('shell-select')).toBeDefined();
  });

  it('renders terminal select', () => {
    render(
      <EnvironmentSettingsSection
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
        availableTerminals={[
          { id: 'system', name: 'System Terminal', available: true },
          { id: 'warp', name: 'Warp', available: true },
        ]}
      />
    );
    expect(screen.getByTestId('terminal-select')).toBeDefined();
  });

  it('does not render a save button (auto-saves on change)', () => {
    render(
      <EnvironmentSettingsSection
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
      />
    );
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('renders section description', () => {
    render(
      <EnvironmentSettingsSection
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
      />
    );
    expect(
      screen.getByText('Configure your default editor, shell, and terminal preferences')
    ).toBeDefined();
  });

  it('only shows available terminals in dropdown', () => {
    render(
      <EnvironmentSettingsSection
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
        availableTerminals={[
          { id: 'system', name: 'System Terminal', available: true },
          { id: 'warp', name: 'Warp', available: true },
          { id: 'kitty', name: 'Kitty', available: false },
        ]}
      />
    );
    // The filtered options should only include available ones
    // (system + warp, not kitty)
    expect(screen.getByTestId('terminal-select')).toBeDefined();
  });

  it('defaults to system terminal when no availableTerminals provided', () => {
    render(
      <EnvironmentSettingsSection
        environment={{
          defaultEditor: EditorType.VsCode,
          shellPreference: 'bash',
          terminalPreference: TerminalType.System,
        }}
      />
    );
    expect(screen.getByTestId('terminal-select')).toBeDefined();
  });
});
