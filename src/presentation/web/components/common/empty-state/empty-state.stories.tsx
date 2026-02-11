import type { Meta, StoryObj } from '@storybook/react';
import { Inbox, FileQuestion, Plus } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof EmptyState> = {
  title: 'Composed/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items found',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Inbox className="h-12 w-12" />,
    title: 'Your inbox is empty',
  },
};

export const WithDescription: Story = {
  args: {
    title: 'No results',
    description: 'Try adjusting your search or filter to find what you are looking for.',
  },
};

export const WithAction: Story = {
  args: {
    title: 'No projects yet',
    description: 'Get started by creating your first project.',
    action: (
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>
    ),
  },
};

export const FullExample: Story = {
  args: {
    icon: <FileQuestion className="h-12 w-12" />,
    title: 'No features found',
    description:
      'It looks like you have not created any features yet. Start by creating a new feature to track your development workflow.',
    action: (
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Feature
      </Button>
    ),
  },
};
