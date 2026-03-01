import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FilterState } from '@/hooks/use-filter-state';
import { FilterControls } from './filter-controls';

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

const meta: Meta<typeof FilterControls> = {
  title: 'Features/FilterBar/FilterControls',
  component: FilterControls,
  tags: ['autodocs'],
  args: {
    onToggleFilter: fn(),
    availableAgentTypes: ['claude-code', 'cursor', 'windsurf'],
    availableRepositories: ['/home/user/my-app', '/home/user/api-service', '/home/user/shared-lib'],
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    filters: emptyFilters,
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
  },
};

export const AllStatusFiltersActive: Story = {
  args: {
    filters: {
      lifecycle: new Set(),
      status: new Set(['creating', 'running', 'action-required', 'done', 'blocked', 'error']),
      agentType: new Set(),
      repository: new Set(),
    },
  },
};

export const NoAgentTypesOrRepos: Story = {
  args: {
    filters: emptyFilters,
    availableAgentTypes: [],
    availableRepositories: [],
  },
};

export const SingleAgentType: Story = {
  args: {
    filters: {
      ...emptyFilters,
      agentType: new Set(['claude-code']),
    },
    availableAgentTypes: ['claude-code'],
    availableRepositories: ['/repo/main'],
  },
};
