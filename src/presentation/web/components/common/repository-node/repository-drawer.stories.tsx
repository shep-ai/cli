import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { RepositoryDrawer } from './repository-drawer';
import type { RepositoryNodeData } from './repository-node-config';

const meta: Meta<typeof RepositoryDrawer> = {
  title: 'Composed/RepositoryDrawer',
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
  render: () => <DrawerTrigger data={repoData} label="Open Repository" />,
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
