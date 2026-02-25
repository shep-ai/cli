import type { Meta, StoryObj } from '@storybook/react';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { DeploymentStatusBadge } from './deployment-status-badge';

const meta: Meta<typeof DeploymentStatusBadge> = {
  title: 'Common/DeploymentStatusBadge',
  component: DeploymentStatusBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeploymentStatusBadge>;

/** Booting — blue badge with animated spinner. */
export const Booting: Story = {
  args: { status: DeploymentState.Booting },
};

/** Ready — green badge with clickable URL and external link icon. */
export const Ready: Story = {
  args: { status: DeploymentState.Ready, url: 'http://localhost:3000' },
};

/** Stopped — renders nothing (badge disappears). */
export const Stopped: Story = {
  args: { status: DeploymentState.Stopped },
};

/** No deployment — renders nothing. */
export const NoDeployment: Story = {
  args: { status: null },
};
