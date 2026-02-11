import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Features', href: '/features' },
  { label: 'Settings', href: '/settings' },
];

export const Default: Story = {
  args: {
    items: defaultItems,
    pathname: '/',
  },
};

export const WithActiveItem: Story = {
  args: {
    items: defaultItems,
    pathname: '/features',
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <span>📊</span> },
      { label: 'Features', href: '/features', icon: <span>🔧</span> },
      { label: 'Settings', href: '/settings', icon: <span>⚙️</span> },
    ],
    pathname: '/dashboard',
  },
};

export const Empty: Story = {
  args: {
    items: [],
    pathname: '/',
  },
};
