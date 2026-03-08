import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationSettingsSection } from '@/components/features/settings/notification-settings-section';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultNotifications = {
  inApp: { enabled: true },
  browser: { enabled: true },
  desktop: { enabled: false },
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
};

describe('NotificationSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders 3 channel toggles with correct labels', () => {
    render(<NotificationSettingsSection notifications={defaultNotifications} />);
    expect(screen.getByTestId('switch-in-app')).toBeDefined();
    expect(screen.getByTestId('switch-browser')).toBeDefined();
    expect(screen.getByTestId('switch-desktop')).toBeDefined();
    expect(screen.getByText('In-App')).toBeDefined();
    expect(screen.getByText('Browser')).toBeDefined();
    expect(screen.getByText('Desktop')).toBeDefined();
  });

  it('renders 9 event type toggles', () => {
    render(<NotificationSettingsSection notifications={defaultNotifications} />);
    expect(screen.getByTestId('switch-event-agentStarted')).toBeDefined();
    expect(screen.getByTestId('switch-event-phaseCompleted')).toBeDefined();
    expect(screen.getByTestId('switch-event-waitingApproval')).toBeDefined();
    expect(screen.getByTestId('switch-event-agentCompleted')).toBeDefined();
    expect(screen.getByTestId('switch-event-agentFailed')).toBeDefined();
    expect(screen.getByTestId('switch-event-prMerged')).toBeDefined();
    expect(screen.getByTestId('switch-event-prClosed')).toBeDefined();
    expect(screen.getByTestId('switch-event-prChecksPassed')).toBeDefined();
    expect(screen.getByTestId('switch-event-prChecksFailed')).toBeDefined();
  });

  it('renders event type labels', () => {
    render(<NotificationSettingsSection notifications={defaultNotifications} />);
    expect(screen.getByText('Agent Started')).toBeDefined();
    expect(screen.getByText('Phase Completed')).toBeDefined();
    expect(screen.getByText('Waiting Approval')).toBeDefined();
    expect(screen.getByText('Agent Completed')).toBeDefined();
    expect(screen.getByText('Agent Failed')).toBeDefined();
    expect(screen.getByText('PR Merged')).toBeDefined();
    expect(screen.getByText('PR Closed')).toBeDefined();
    expect(screen.getByText('PR Checks Passed')).toBeDefined();
    expect(screen.getByText('PR Checks Failed')).toBeDefined();
  });

  it('save button is disabled initially when no changes', () => {
    render(<NotificationSettingsSection notifications={defaultNotifications} />);
    expect(screen.getByTestId('notification-save-button')).toHaveProperty('disabled', true);
  });
});
