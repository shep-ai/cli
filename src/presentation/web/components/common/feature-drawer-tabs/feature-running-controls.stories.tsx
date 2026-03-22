import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FeatureRunningControls } from './feature-running-controls';
import type { FeatureNodeData } from '@/components/common/feature-node';

const meta: Meta<typeof FeatureRunningControls> = {
  title: 'Drawers/Feature/Tabs/FeatureRunningControls',
  component: FeatureRunningControls,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '560px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FeatureRunningControls>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const base: FeatureNodeData = {
  name: 'Auth Module',
  featureId: 'f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 65,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

/* ---------------------------------------------------------------------------
 * Stories — one per meaningful state
 * ------------------------------------------------------------------------- */

/** Running state — spinner in badge, Stop button visible. */
export const Running: Story = {
  args: { data: { ...base, state: 'running', onStop: fn() } },
};

/** Running state — no stop callback provided (button hidden). */
export const RunningNoStop: Story = {
  args: { data: { ...base, state: 'running' } },
};

/** Action-required state — amber badge, Stop button visible. */
export const ActionRequired: Story = {
  args: {
    data: {
      ...base,
      lifecycle: 'requirements',
      state: 'action-required',
      onStop: fn(),
    },
  },
};

/** Error state — red badge, Retry button visible. */
export const ErrorWithRetry: Story = {
  args: { data: { ...base, state: 'error', onRetry: fn() } },
};

/** Error state — no retry callback (button hidden). */
export const ErrorNoRetry: Story = {
  args: { data: { ...base, state: 'error' } },
};

/** Pending state — slate badge, Start button visible. */
export const PendingWithStart: Story = {
  args: {
    data: {
      ...base,
      lifecycle: 'pending',
      state: 'pending',
      onStart: fn(),
    },
  },
};

/** Done state — emerald badge, no action button. */
export const Done: Story = {
  args: { data: { ...base, lifecycle: 'maintain', state: 'done', progress: 100 } },
};

/** Blocked state — gray badge, no action button. */
export const Blocked: Story = {
  args: { data: { ...base, state: 'blocked' } },
};

/** Creating state — blue badge, no action button. */
export const Creating: Story = {
  args: { data: { ...base, state: 'creating', lifecycle: 'requirements' } },
};

/** Long lifecycle label — truncates gracefully. */
export const LongLabel: Story = {
  args: {
    data: {
      ...base,
      lifecycle: 'implementation',
      state: 'running',
      onStop: fn(),
    },
  },
};
