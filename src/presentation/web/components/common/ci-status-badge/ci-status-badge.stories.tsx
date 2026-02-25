import type { Meta, StoryObj } from '@storybook/react';
import { CiStatus } from '@shepai/core/domain/generated/output';
import { CiStatusBadge } from './ci-status-badge';

const meta: Meta<typeof CiStatusBadge> = {
  title: 'Common/CiStatusBadge',
  component: CiStatusBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CiStatusBadge>;

/** CI passed — green badge with check icon. */
export const Success: Story = {
  args: { status: CiStatus.Success },
};

/** CI pending — yellow badge with animated spinner. */
export const Pending: Story = {
  args: { status: CiStatus.Pending },
};

/** CI failed — red badge with X icon. */
export const Failure: Story = {
  args: { status: CiStatus.Failure },
};
