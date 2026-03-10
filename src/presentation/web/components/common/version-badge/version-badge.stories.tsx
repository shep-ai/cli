import type { Meta, StoryObj } from '@storybook/react';
import { VersionBadge } from './version-badge';

const meta: Meta<typeof VersionBadge> = {
  title: 'Common/VersionBadge',
  component: VersionBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VersionBadge>;

/** Production mode — shows "v1.90.0" as dimmed text, no dev details in tooltip. */
export const Production: Story = {
  args: {
    version: '1.90.0',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
  },
};

/** Development mode — shows "1.90.0-dev", tooltip includes branch, commit, and path. */
export const Development: Story = {
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/version-badge',
    commitHash: '5a84c148b3e2f1a9c7d6e8b4a2f1c3d5e7f9a1b3',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    instancePath: '/home/user/projects/shep',
  },
};

/** Development mode with a long branch name — shown in tooltip. */
export const LongBranch: Story = {
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/056-version-badge-with-tooltip-and-build-info',
    commitHash: 'abc1234def5678',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    instancePath: '/home/user/very/deep/nested/project/path',
  },
};

/** Minimal info — no optional fields. */
export const Minimal: Story = {
  args: {
    version: '1.0.0',
  },
};
