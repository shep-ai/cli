import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FeatureListItem } from '@/components/common/feature-list-item';
import { FeatureStatusGroup } from '@/components/common/feature-status-group';
import { RepoGroup } from './repo-group';

const meta: Meta<typeof RepoGroup> = {
  title: 'Composed/RepoGroup',
  component: RepoGroup,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="w-64">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    repoName: 'my-project',
    featureCount: 3,
    children: (
      <>
        <FeatureStatusGroup label="In Progress" count={1}>
          <FeatureListItem name="Dashboard" status="in-progress" startedAt={Date.now() - 330_000} />
        </FeatureStatusGroup>
        <FeatureStatusGroup label="Done" count={2}>
          <FeatureListItem name="Settings Page" status="done" duration="2h" />
          <FeatureListItem name="User Profile" status="done" duration="1h" />
        </FeatureStatusGroup>
      </>
    ),
  },
};

export const SingleFeature: Story = {
  args: {
    repoName: 'backend-api',
    featureCount: 1,
    children: (
      <FeatureStatusGroup label="Action Needed" count={1}>
        <FeatureListItem name="Auth Module" status="action-needed" />
      </FeatureStatusGroup>
    ),
  },
};

export const Collapsed: Story = {
  args: {
    repoName: 'my-project',
    featureCount: 5,
    defaultOpen: false,
    children: (
      <FeatureStatusGroup label="In Progress" count={5}>
        <FeatureListItem name="Feature A" status="in-progress" startedAt={Date.now() - 60_000} />
        <FeatureListItem name="Feature B" status="in-progress" startedAt={Date.now() - 120_000} />
        <FeatureListItem name="Feature C" status="in-progress" startedAt={Date.now() - 180_000} />
        <FeatureListItem name="Feature D" status="in-progress" startedAt={Date.now() - 240_000} />
        <FeatureListItem name="Feature E" status="in-progress" startedAt={Date.now() - 300_000} />
      </FeatureStatusGroup>
    ),
  },
};

export const MultipleRepos: Story = {
  render: () => (
    <>
      <RepoGroup repoName="frontend" featureCount={2}>
        <FeatureStatusGroup label="In Progress" count={1}>
          <FeatureListItem name="Dashboard" status="in-progress" startedAt={Date.now() - 330_000} />
        </FeatureStatusGroup>
        <FeatureStatusGroup label="Done" count={1}>
          <FeatureListItem name="Settings Page" status="done" duration="2h" />
        </FeatureStatusGroup>
      </RepoGroup>
      <RepoGroup repoName="backend-api" featureCount={2}>
        <FeatureStatusGroup label="Action Needed" count={1}>
          <FeatureListItem name="Auth Module" status="action-needed" />
        </FeatureStatusGroup>
        <FeatureStatusGroup label="In Progress" count={1}>
          <FeatureListItem
            name="API Gateway"
            status="in-progress"
            startedAt={Date.now() - 60_000}
          />
        </FeatureStatusGroup>
      </RepoGroup>
    </>
  ),
};
