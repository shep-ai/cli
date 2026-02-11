import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './page-header';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Composed/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
  },
};

export const WithDescription: Story = {
  args: {
    title: 'Projects',
    description: 'Manage and monitor all your active projects.',
  },
};

export const WithAction: Story = {
  args: {
    title: 'Features',
    description: 'Track features through the development lifecycle.',
    children: <Button>Create Feature</Button>,
  },
};

export const FullExample: Story = {
  args: {
    title: 'Settings',
    description: 'Configure your application preferences and integrations.',
    className: 'border-b pb-4',
    children: (
      <div className="flex gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    ),
  },
};
