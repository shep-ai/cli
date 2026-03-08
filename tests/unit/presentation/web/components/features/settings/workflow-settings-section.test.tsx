import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowSettingsSection } from '@/components/features/settings/workflow-settings-section';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultWorkflow = {
  openPrOnImplementationComplete: false,
  approvalGateDefaults: {
    allowPrd: false,
    allowPlan: false,
    allowMerge: false,
    pushOnImplementationComplete: false,
  },
};

describe('WorkflowSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders all 5 Switch toggles', () => {
    render(<WorkflowSettingsSection workflow={defaultWorkflow} />);
    expect(screen.getByTestId('switch-open-pr')).toBeDefined();
    expect(screen.getByTestId('switch-push-on-complete')).toBeDefined();
    expect(screen.getByTestId('switch-allow-prd')).toBeDefined();
    expect(screen.getByTestId('switch-allow-plan')).toBeDefined();
    expect(screen.getByTestId('switch-allow-merge')).toBeDefined();
  });

  it('renders 3 numeric inputs for CI settings', () => {
    render(<WorkflowSettingsSection workflow={defaultWorkflow} />);
    expect(screen.getByTestId('ci-max-fix-input')).toBeDefined();
    expect(screen.getByTestId('ci-timeout-input')).toBeDefined();
    expect(screen.getByTestId('ci-log-max-input')).toBeDefined();
  });

  it('save button is disabled initially when no changes', () => {
    render(<WorkflowSettingsSection workflow={defaultWorkflow} />);
    expect(screen.getByTestId('workflow-save-button')).toHaveProperty('disabled', true);
  });

  it('renders title and description', () => {
    render(<WorkflowSettingsSection workflow={defaultWorkflow} />);
    expect(screen.getByText('Workflow')).toBeDefined();
    expect(
      screen.getByText('Configure PR behavior, approval gates, and CI settings')
    ).toBeDefined();
  });
});
