import type { Meta, StoryObj } from '@storybook/react';
import { ShepLogo } from './shep-logo';

const meta: Meta<typeof ShepLogo> = {
  title: 'Composed/ShepLogo',
  component: ShepLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 16,
  },
};

export const Large: Story = {
  args: {
    size: 48,
  },
};
