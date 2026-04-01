import type { Meta, StoryObj } from '@storybook/react';
import { FeatureTreeTable } from './feature-tree-table';
import type { FeatureTreeRow } from './feature-tree-table';

const meta: Meta<typeof FeatureTreeTable> = {
  title: 'Features/FeatureTreeTable',
  component: FeatureTreeTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '500px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleFeatures: FeatureTreeRow[] = [
  {
    id: 'feat-1',
    name: 'Authentication System',
    status: 'done',
    lifecycle: 'Maintain',
    branch: 'feat/auth-system',
    repositoryName: 'my-app',
  },
  {
    id: 'feat-2',
    name: 'OAuth2 Provider',
    status: 'in-progress',
    lifecycle: 'Implementation',
    branch: 'feat/oauth2-provider',
    repositoryName: 'my-app',
    parentId: 'feat-1',
  },
  {
    id: 'feat-3',
    name: 'JWT Token Refresh',
    status: 'pending',
    lifecycle: 'Planning',
    branch: 'feat/jwt-refresh',
    repositoryName: 'my-app',
    parentId: 'feat-1',
  },
  {
    id: 'feat-4',
    name: 'Payment Integration',
    status: 'action-needed',
    lifecycle: 'Review',
    branch: 'feat/payments',
    repositoryName: 'my-app',
  },
  {
    id: 'feat-5',
    name: 'Stripe Checkout',
    status: 'error',
    lifecycle: 'Implementation',
    branch: 'feat/stripe-checkout',
    repositoryName: 'my-app',
    parentId: 'feat-4',
  },
  {
    id: 'feat-6',
    name: 'Dashboard Widgets',
    status: 'blocked',
    lifecycle: 'Blocked',
    branch: 'feat/dashboard-widgets',
    repositoryName: 'admin-portal',
  },
];

export const Default: Story = {
  args: {
    data: sampleFeatures,
  },
};

export const Empty: Story = {
  args: {
    data: [],
  },
};

export const FlatList: Story = {
  args: {
    data: sampleFeatures.map((f) => ({ ...f, parentId: undefined })),
  },
};

export const WithClickHandler: Story = {
  args: {
    data: sampleFeatures,
    onFeatureClick: (id: string) => alert(`Clicked feature: ${id}`),
  },
};

const deeplyNestedFeatures: FeatureTreeRow[] = [
  {
    id: 'root-1',
    name: 'Platform Overhaul',
    status: 'in-progress',
    lifecycle: 'Implementation',
    branch: 'feat/platform-overhaul',
    repositoryName: 'platform',
  },
  {
    id: 'child-1',
    name: 'API Redesign',
    status: 'in-progress',
    lifecycle: 'Implementation',
    branch: 'feat/api-redesign',
    repositoryName: 'platform',
    parentId: 'root-1',
  },
  {
    id: 'grandchild-1',
    name: 'REST to GraphQL Migration',
    status: 'pending',
    lifecycle: 'Planning',
    branch: 'feat/graphql-migration',
    repositoryName: 'platform',
    parentId: 'child-1',
  },
  {
    id: 'child-2',
    name: 'Database Migration',
    status: 'done',
    lifecycle: 'Maintain',
    branch: 'feat/db-migration',
    repositoryName: 'platform',
    parentId: 'root-1',
  },
];

export const DeeplyNested: Story = {
  args: {
    data: deeplyNestedFeatures,
  },
};
