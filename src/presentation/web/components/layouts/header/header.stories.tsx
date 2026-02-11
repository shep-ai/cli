import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './header';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Feature Details',
    breadcrumbs: (
      <nav className="text-muted-foreground text-sm">
        <span>Home</span> / <span>Features</span> / <span>Feature Details</span>
      </nav>
    ),
  },
};

export const WithActions: Story = {
  args: {
    title: 'Features',
    actions: (
      <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">
        New Feature
      </button>
    ),
  },
};

export const FullExample: Story = {
  args: {
    title: 'Feature Details',
    breadcrumbs: (
      <nav className="text-muted-foreground text-sm">
        <span>Home</span> / <span>Features</span> / <span>Auth Module</span>
      </nav>
    ),
    actions: (
      <div className="flex gap-2">
        <button className="rounded-md border px-4 py-2 text-sm">Edit</button>
        <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">
          Deploy
        </button>
      </div>
    ),
  },
};
