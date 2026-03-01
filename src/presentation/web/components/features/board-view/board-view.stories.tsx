import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type {
  FeatureNodeData,
  FeatureNodeState,
  FeatureLifecyclePhase,
} from '@/components/common/feature-node';
import type { FilterState } from '@/hooks/use-filter-state';
import { BoardView } from './board-view';

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

function createFeature(
  id: string,
  lifecycle: FeatureLifecyclePhase,
  state: FeatureNodeState,
  name: string,
  overrides: Partial<FeatureNodeData> = {}
): FeatureNodeData {
  return {
    name,
    featureId: id,
    lifecycle,
    state,
    progress: state === 'done' ? 100 : 40,
    repositoryPath: '/repos/my-app',
    branch: `feat/${id}`,
    onDelete: fn(),
    ...overrides,
  };
}

const sampleFeatures: FeatureNodeData[] = [
  createFeature('f1', 'requirements', 'running', 'Authentication Module', {
    agentType: 'claude-code',
  }),
  createFeature('f2', 'requirements', 'action-required', 'User Onboarding'),
  createFeature('f3', 'implementation', 'running', 'Payment Gateway', { agentType: 'cursor' }),
  createFeature('f4', 'implementation', 'running', 'Email Service', { agentType: 'claude-code' }),
  createFeature('f5', 'implementation', 'error', 'Notification System', {
    errorMessage: 'Build failed',
  }),
  createFeature('f6', 'implementation', 'blocked', 'Dashboard Charts', {
    blockedBy: 'Payment Gateway',
  }),
  createFeature('f7', 'review', 'action-required', 'Search Feature', {
    pr: { url: 'https://github.com/pr/42', number: 42, status: 'Open' as never },
  }),
  createFeature('f8', 'review', 'running', 'Profile Settings', { agentType: 'claude-code' }),
  createFeature('f9', 'maintain', 'done', 'Landing Page', { runtime: '1h 30m' }),
  createFeature('f10', 'maintain', 'done', 'API Rate Limiting', { runtime: '45m' }),
];

const meta: Meta<typeof BoardView> = {
  title: 'Features/BoardView/BoardView',
  component: BoardView,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onSelect: fn(),
    onDetails: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    features: sampleFeatures,
    filters: emptyFilters,
  },
};

export const Empty: Story = {
  args: {
    features: [],
    filters: emptyFilters,
  },
};

export const WithSelection: Story = {
  args: {
    features: sampleFeatures,
    filters: emptyFilters,
    selectedFeatureId: 'f3',
  },
};

export const FilteredByStatus: Story = {
  args: {
    features: sampleFeatures,
    filters: { ...emptyFilters, status: new Set(['running']) },
  },
};

export const WithFilterBarSlot: Story = {
  args: {
    features: sampleFeatures,
    filters: emptyFilters,
    filterBar: (
      <div className="bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-sm">
        Filter bar placeholder
      </div>
    ),
  },
};
