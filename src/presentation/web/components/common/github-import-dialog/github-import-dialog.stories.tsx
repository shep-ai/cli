import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { GitHubImportDialog } from './github-import-dialog';

const meta: Meta<typeof GitHubImportDialog> = {
  title: 'Composed/GitHubImportDialog',
  component: GitHubImportDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onOpenChange: fn().mockName('onOpenChange'),
    onImportComplete: fn().mockName('onImportComplete'),
  },
};

export default meta;
type Story = StoryObj<typeof GitHubImportDialog>;

export const Default: Story = {};

export const URLTab: Story = {
  // Default tab is URL, so this is the same as Default
};

export const BrowseTab: Story = {
  // User clicks Browse tab to see repo list
};

export const Loading: Story = {
  // Loading state happens during import — interact with the story to see it
};
