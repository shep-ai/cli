import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DeleteFeatureDialog } from './delete-feature-dialog';

const meta: Meta<typeof DeleteFeatureDialog> = {
  title: 'Composed/DeleteFeatureDialog',
  component: DeleteFeatureDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onOpenChange: fn().mockName('onOpenChange'),
    onConfirm: fn().mockName('onConfirm'),
    isDeleting: false,
    featureName: 'User Authentication',
    featureId: 'feat-abc-123',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteFeatureDialog>;

export const Default: Story = {};

export const WithChildren: Story = {
  args: {
    hasChildren: true,
  },
};

export const Deleting: Story = {
  args: {
    isDeleting: true,
  },
};

export const DeletingWithChildren: Story = {
  args: {
    isDeleting: true,
    hasChildren: true,
  },
};

export const WithOpenPr: Story = {
  args: {
    hasOpenPr: true,
  },
};

export const WithOpenPrAndChildren: Story = {
  args: {
    hasOpenPr: true,
    hasChildren: true,
  },
};

export const DeletingWithOpenPr: Story = {
  args: {
    isDeleting: true,
    hasOpenPr: true,
  },
};
