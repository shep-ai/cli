import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FilterState } from '@/hooks/use-filter-state';
import type { SavedView } from '@/hooks/use-saved-views';
import { FilterBar } from './filter-bar';

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

const sampleViews: SavedView[] = [
  {
    id: 'v1',
    name: 'Active Features',
    filters: { lifecycle: ['implementation'], status: ['running'], agentType: [], repository: [] },
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'v2',
    name: 'Review Queue',
    filters: { lifecycle: ['review'], status: ['action-required'], agentType: [], repository: [] },
    createdAt: '2026-02-15T00:00:00.000Z',
  },
];

const meta: Meta<typeof FilterBar> = {
  title: 'Features/FilterBar/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  args: {
    onToggleFilter: fn(),
    onClearAllFilters: fn(),
    availableAgentTypes: ['claude-code', 'cursor', 'windsurf'],
    availableRepositories: ['/home/user/my-app', '/home/user/api-service'],
    onApplyView: fn(),
    onSaveView: fn(),
    onDeleteView: fn(),
    onRenameView: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NoActiveFilters: Story = {
  args: {
    filters: emptyFilters,
    hasActiveFilters: false,
    savedViews: [],
  },
};

export const WithActiveFilters: Story = {
  args: {
    filters: {
      lifecycle: new Set(['implementation', 'review']),
      status: new Set(['running']),
      agentType: new Set(['claude-code']),
      repository: new Set(),
    },
    hasActiveFilters: true,
    savedViews: sampleViews,
  },
};

export const WithSavedViews: Story = {
  args: {
    filters: emptyFilters,
    hasActiveFilters: false,
    savedViews: sampleViews,
  },
};

export const AllFiltersActive: Story = {
  args: {
    filters: {
      lifecycle: new Set(['backlog', 'requirements', 'implementation', 'review', 'done']),
      status: new Set(['creating', 'running', 'action-required', 'done', 'blocked', 'error']),
      agentType: new Set(['claude-code', 'cursor']),
      repository: new Set(['/home/user/my-app']),
    },
    hasActiveFilters: true,
    savedViews: sampleViews,
  },
};
