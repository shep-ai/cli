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

/** Production mode — shows version only with neutral styling. */
export const Production: Story = {
  args: {
    version: '1.90.0',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    nodeVersion: 'v22.4.0',
    platform: 'linux x64',
  },
};

/** Development mode — amber styling with branch name. */
export const Development: Story = {
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/version-badge',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    nodeVersion: 'v22.4.0',
    platform: 'linux x64',
  },
};

/** Development mode with a long branch name — truncated. */
export const LongBranch: Story = {
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/056-version-badge-with-tooltip-and-build-info',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
  },
};

/** Minimal info — no optional fields. */
export const Minimal: Story = {
  args: {
    version: '1.0.0',
  },
};
