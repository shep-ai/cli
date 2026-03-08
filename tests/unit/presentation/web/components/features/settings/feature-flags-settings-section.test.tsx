import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureFlagsSettingsSection } from '@/components/features/settings/feature-flags-settings-section';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultFlags = { skills: false, envDeploy: false, debug: false };

describe('FeatureFlagsSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders 3 feature flag toggles with descriptions', () => {
    render(<FeatureFlagsSettingsSection featureFlags={defaultFlags} />);
    expect(screen.getByTestId('switch-flag-skills')).toBeDefined();
    expect(screen.getByTestId('switch-flag-envDeploy')).toBeDefined();
    expect(screen.getByTestId('switch-flag-debug')).toBeDefined();
    expect(screen.getByText('Skills')).toBeDefined();
    expect(screen.getByText('Deployments')).toBeDefined();
    expect(screen.getByText('Debug')).toBeDefined();
  });

  it('renders description text for each flag', () => {
    render(<FeatureFlagsSettingsSection featureFlags={defaultFlags} />);
    expect(
      screen.getByText('Enable Skills navigation and functionality in the web UI')
    ).toBeDefined();
    expect(screen.getByText('Enable environment deployment features in the web UI')).toBeDefined();
    expect(
      screen.getByText('Enable debug UI elements and verbose client-side logging')
    ).toBeDefined();
  });

  it('save button is disabled initially when no changes', () => {
    render(<FeatureFlagsSettingsSection featureFlags={defaultFlags} />);
    expect(screen.getByTestId('feature-flags-save-button')).toHaveProperty('disabled', true);
  });

  it('renders title', () => {
    render(<FeatureFlagsSettingsSection featureFlags={defaultFlags} />);
    expect(screen.getByText('Feature Flags')).toBeDefined();
  });
});
