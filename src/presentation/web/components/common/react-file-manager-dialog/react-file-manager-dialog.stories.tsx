import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ReactFileManagerDialog } from './react-file-manager-dialog';

const meta: Meta<typeof ReactFileManagerDialog> = {
  title: 'Composed/ReactFileManagerDialog',
  component: ReactFileManagerDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onOpenChange: fn().mockName('onOpenChange'),
    onSelect: fn().mockName('onSelect'),
  },
};

export default meta;
type Story = StoryObj<typeof ReactFileManagerDialog>;

export const Default: Story = {};

export const WithInitialPath: Story = {
  args: {
    initialPath: '/tmp',
  },
};

export const Closed: Story = {
  args: {
    open: false,
  },
};
