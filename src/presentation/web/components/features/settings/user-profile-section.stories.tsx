import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { UserProfileSection } from './user-profile-section';
import type { UserProfile } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof UserProfileSection> = {
  title: 'Features/Settings/UserProfileSection',
  component: UserProfileSection,
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

const filledProfile: UserProfile = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  githubUsername: 'janedoe',
};

const emptyProfile: UserProfile = {
  name: '',
  email: '',
  githubUsername: '',
};

const partialProfile: UserProfile = {
  name: 'Jane Doe',
  email: '',
  githubUsername: 'janedoe',
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    data: filledProfile,
  },
};

export const Empty: Story = {
  args: {
    data: emptyProfile,
  },
};

export const Partial: Story = {
  args: {
    data: partialProfile,
  },
};
