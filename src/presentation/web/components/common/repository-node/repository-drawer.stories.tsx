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

export const Default: Story = {
  render: () => <RepositoryDrawerShellTemplate data={repoData} />,
};

export const LongPath: Story = {
  render: () => (
    <DrawerTrigger
      data={{
        ...repoData,
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

/** Repository drawer rendered inside a full-page context — starts open. */
export const InDrawer: Story = {
  render: () => <RepositoryDrawerShellTemplate data={repoData} />,
};
