import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FilterState } from '@/hooks/use-filter-state';
import type { SavedView } from '@/hooks/use-saved-views';
import { SavedViewSelector } from './saved-view-selector';

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
    filters: {
      lifecycle: ['implementation'],
      status: ['running'],
      agentType: [],
      repository: [],
    },
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'v2',
    name: 'Review Queue',
    filters: {
      lifecycle: ['review'],
      status: ['action-required'],
      agentType: [],
      repository: [],
    },
    createdAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'v3',
    name: 'Blocked Items',
    filters: {
      lifecycle: [],
      status: ['blocked', 'error'],
      agentType: [],
      repository: [],
    },
    createdAt: '2026-02-20T00:00:00.000Z',
  },
];

const meta: Meta<typeof SavedViewSelector> = {
  title: 'Features/FilterBar/SavedViewSelector',
  component: SavedViewSelector,
  tags: ['autodocs'],
  args: {
    onApplyView: fn(),
    onSaveView: fn(),
    onDeleteView: fn(),
    onRenameView: fn(),
    currentFilters: emptyFilters,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    views: [],
  },
};

export const WithViews: Story = {
  args: {
    views: sampleViews,
  },
};

export const WithActiveFilters: Story = {
  args: {
    views: sampleViews,
    currentFilters: {
      lifecycle: new Set(['implementation']),
      status: new Set(['running']),
      agentType: new Set(['claude-code']),
      repository: new Set(),
    },
  },
};
