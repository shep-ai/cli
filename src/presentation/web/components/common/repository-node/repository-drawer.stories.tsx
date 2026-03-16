import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { RepositoryDrawer } from './repository-drawer';
import type { RepositoryNodeData } from './repository-node-config';

const meta: Meta<typeof RepositoryDrawer> = {
  title: 'Drawers/Feature/RepositoryDrawer',
  component: RepositoryDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RepositoryDrawer>;

const repoData: RepositoryNodeData = {
  id: 'repo-1',
  name: 'shep-ai/cli',
  repositoryPath: '/home/user/shep-ai/cli',
};

const enrichedRepoData: RepositoryNodeData = {
  id: 'repo-2',
  name: 'shep-ai/cli',
  repositoryPath: '/home/user/shep-ai/cli',
  branch: 'feat/repo-tab-redesign',
  commitMessage: 'feat(web): redesign repository drawer with git info',
  committer: 'Jane Doe',
  behindCount: 3,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
};

const onDefaultBranchData: RepositoryNodeData = {
  id: 'repo-3',
  name: 'my-org/my-project',
  repositoryPath: '/home/user/my-org/my-project',
  branch: 'main',
  commitMessage: 'chore: bump dependencies to latest versions',
  committer: 'John Smith',
  behindCount: null,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 1 month ago
};

function DrawerTrigger({ data, label }: { data: RepositoryNodeData; label: string }) {
  const [selected, setSelected] = useState<RepositoryNodeData | null>(null);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setSelected(data)}>
        {label}
      </Button>
      <RepositoryDrawer data={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Shell template — full page context, starts open (matches ReviewDrawerShell pattern)
 * ------------------------------------------------------------------------- */

function RepositoryDrawerShellTemplate({ data }: { data: RepositoryNodeData }) {
  const [selected, setSelected] = useState<RepositoryNodeData | null>(data);

  return (
    <div style={{ height: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <button
        type="button"
        onClick={() => setSelected(data)}
        style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px' }}
      >
        Open Drawer
      </button>
      <RepositoryDrawer data={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Basic drawer — no git info, just path and actions. */
export const Default: Story = {
  render: () => <RepositoryDrawerShellTemplate data={repoData} />,
};

/** Full enriched drawer — branch, commit, committer, behind count, metadata. */
export const WithGitInfo: Story = {
  render: () => <RepositoryDrawerShellTemplate data={enrichedRepoData} />,
};

/** On default branch — no behind count shown. */
export const OnDefaultBranch: Story = {
  render: () => <RepositoryDrawerShellTemplate data={onDefaultBranchData} />,
};

export const LongPath: Story = {
  render: () => (
    <DrawerTrigger
      data={{
        ...enrichedRepoData,
        repositoryPath: '/home/user/projects/company/some-very-long-path/shep-ai/cli',
      }}
      label="Open Long Path"
    />
  ),
};

export const WithoutPath: Story = {
  render: () => (
    <DrawerTrigger data={{ ...repoData, repositoryPath: undefined }} label="Open Without Path" />
  ),
};

/** Repository drawer rendered inside a full-page context — starts open. */
export const InDrawer: Story = {
  render: () => <RepositoryDrawerShellTemplate data={enrichedRepoData} />,
};
