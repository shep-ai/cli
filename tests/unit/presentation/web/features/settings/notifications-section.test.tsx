import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NotificationPreferences } from '@shepai/core/domain/generated/output';
import { NotificationsSection } from '@/components/features/settings/notifications-section';

const defaultNotifications: NotificationPreferences = {
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
};

describe('NotificationsSection', () => {
  it('renders 3 channel toggles', () => {
    render(<NotificationsSection notifications={defaultNotifications} onSave={vi.fn()} />);

    expect(screen.getByLabelText('In-App')).toBeInTheDocument();
    expect(screen.getByLabelText('Browser')).toBeInTheDocument();
    expect(screen.getByLabelText('Desktop')).toBeInTheDocument();
  });

  it('renders 9 event filter toggles', () => {
    render(<NotificationsSection notifications={defaultNotifications} onSave={vi.fn()} />);

    expect(screen.getByLabelText('Agent Started')).toBeInTheDocument();
    expect(screen.getByLabelText('Phase Completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Waiting Approval')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Failed')).toBeInTheDocument();
    expect(screen.getByLabelText('PR Merged')).toBeInTheDocument();
    expect(screen.getByLabelText('PR Closed')).toBeInTheDocument();
    expect(screen.getByLabelText('PR Checks Passed')).toBeInTheDocument();
    expect(screen.getByLabelText('PR Checks Failed')).toBeInTheDocument();
  });

  it('renders Event Filters heading', () => {
    render(<NotificationsSection notifications={defaultNotifications} onSave={vi.fn()} />);

    expect(screen.getByText('Event Filters')).toBeInTheDocument();
  });

  it('initializes toggles with prop values', () => {
    const custom: NotificationPreferences = {
      inApp: { enabled: false },
      browser: { enabled: true },
      desktop: { enabled: false },
      events: {
        agentStarted: false,
        phaseCompleted: true,
        waitingApproval: false,
        agentCompleted: true,
        agentFailed: false,
        prMerged: true,
        prClosed: false,
        prChecksPassed: true,
        prChecksFailed: false,
      },
    };

    render(<NotificationsSection notifications={custom} onSave={vi.fn()} />);

    // Channel toggles
    expect(screen.getByLabelText('In-App')).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByLabelText('Browser')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('Desktop')).toHaveAttribute('data-state', 'unchecked');

    // Event toggles - check a few
    expect(screen.getByLabelText('Agent Started')).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByLabelText('Phase Completed')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('Agent Failed')).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByLabelText('PR Merged')).toHaveAttribute('data-state', 'checked');
  });

  it('calls onSave with updated notifications when save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);

    render(<NotificationsSection notifications={defaultNotifications} onSave={onSave} />);

    // Toggle off the In-App channel
    await user.click(screen.getByLabelText('In-App'));

    // Toggle off Agent Started event
    await user.click(screen.getByLabelText('Agent Started'));

    // Click save
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({
      inApp: { enabled: false },
      browser: { enabled: true },
      desktop: { enabled: true },
      events: {
        agentStarted: false,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
      },
    });
  });

  it('renders a save button', () => {
    render(<NotificationsSection notifications={defaultNotifications} onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
