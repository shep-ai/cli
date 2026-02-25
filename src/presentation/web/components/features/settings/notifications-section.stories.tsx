import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { NotificationsSection } from './notifications-section';
import type { NotificationPreferences } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof NotificationsSection> = {
  title: 'Features/Settings/NotificationsSection',
  component: NotificationsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSave: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const defaultNotifications: NotificationPreferences = {
  inApp: { enabled: true },
  browser: { enabled: false },
  desktop: { enabled: false },
  events: {
    agentStarted: true,
    phaseCompleted: true,
    waitingApproval: true,
    agentCompleted: true,
    agentFailed: true,
    prMerged: false,
    prClosed: false,
    prChecksPassed: false,
    prChecksFailed: false,
  },
};

const allEnabledNotifications: NotificationPreferences = {
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

const allDisabledNotifications: NotificationPreferences = {
  inApp: { enabled: false },
  browser: { enabled: false },
  desktop: { enabled: false },
  events: {
    agentStarted: false,
    phaseCompleted: false,
    waitingApproval: false,
    agentCompleted: false,
    agentFailed: false,
    prMerged: false,
    prClosed: false,
    prChecksPassed: false,
    prChecksFailed: false,
  },
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    notifications: defaultNotifications,
  },
};

export const AllEnabled: Story = {
  args: {
    notifications: allEnabledNotifications,
  },
};

export const AllDisabled: Story = {
  args: {
    notifications: allDisabledNotifications,
  },
};
