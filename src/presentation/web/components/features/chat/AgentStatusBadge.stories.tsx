import type { Meta, StoryObj } from '@storybook/react';
import { InteractiveSessionStatus } from '@shepai/core/domain/generated/output';
import { AgentStatusBadge } from './AgentStatusBadge';

const meta: Meta<typeof AgentStatusBadge> = {
  title: 'Features/Chat/AgentStatusBadge',
  component: AgentStatusBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AgentStatusBadge>;

/** Generic booting state — shown before a specific stage is known. */
export const Booting: Story = {
  args: {
    status: InteractiveSessionStatus.booting,
  },
};

/** First boot stage: spawning the agent OS process. */
export const Spawning: Story = {
  args: {
    status: 'spawning',
  },
};

/** Second boot stage: injecting feature context into the agent. */
export const LoadingContext: Story = {
  args: {
    status: 'loading-context',
  },
};

/** Agent is ready and accepting messages. */
export const Ready: Story = {
  args: {
    status: InteractiveSessionStatus.ready,
  },
};

/** Session was stopped manually or via auto-timeout. */
export const Stopped: Story = {
  args: {
    status: InteractiveSessionStatus.stopped,
  },
};

/** Session encountered an error (e.g. process crashed). */
export const Error: Story = {
  args: {
    status: InteractiveSessionStatus.error,
  },
};

/** All variants stacked for visual comparison. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      <AgentStatusBadge status={InteractiveSessionStatus.booting} />
      <AgentStatusBadge status="spawning" />
      <AgentStatusBadge status="loading-context" />
      <AgentStatusBadge status={InteractiveSessionStatus.ready} />
      <AgentStatusBadge status={InteractiveSessionStatus.stopped} />
      <AgentStatusBadge status={InteractiveSessionStatus.error} />
    </div>
  ),
};
