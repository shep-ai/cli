import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OpenActionMenu } from './open-action-menu';
import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

const defaultActions: FeatureActionsState = {
  openInIde: fn().mockName('openInIde'),
  openInShell: fn().mockName('openInShell'),
  openSpecsFolder: fn().mockName('openSpecsFolder'),
  ideLoading: false,
  shellLoading: false,
  specsLoading: false,
  ideError: null,
  shellError: null,
  specsError: null,
};

const meta: Meta<typeof OpenActionMenu> = {
  title: 'Composed/OpenActionMenu',
  component: OpenActionMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof OpenActionMenu>;

/** Default menu with all actions including specs folder. */
export const Default: Story = {
  args: {
    actions: defaultActions,
    repositoryPath: '/Users/dev/my-project',
    showSpecs: true,
  },
};

/** Menu without specs folder action. */
export const WithoutSpecs: Story = {
  args: {
    actions: defaultActions,
    repositoryPath: '/Users/dev/my-project',
    showSpecs: false,
  },
};

/** Menu while IDE action is loading. */
export const Loading: Story = {
  args: {
    actions: { ...defaultActions, ideLoading: true },
    repositoryPath: '/Users/dev/my-project',
    showSpecs: true,
  },
};

/** Menu with an error on the IDE action. */
export const WithError: Story = {
  args: {
    actions: { ...defaultActions, ideError: 'Editor not found' },
    repositoryPath: '/Users/dev/my-project',
    showSpecs: true,
  },
};
