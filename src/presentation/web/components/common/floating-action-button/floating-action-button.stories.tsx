import type { Meta, StoryObj } from '@storybook/react';
import { Plus, FolderPlus } from 'lucide-react';
import { FloatingActionButton, type FloatingActionButtonAction } from './floating-action-button';

const defaultActions: FloatingActionButtonAction[] = [
  {
    id: 'new-feature',
    label: 'Feature',
    icon: <Plus className="h-5 w-5" />,
    onClick: () => undefined,
  },
  {
    id: 'add-repository',
    label: 'Repository',
    icon: <FolderPlus className="h-5 w-5" />,
    onClick: () => undefined,
  },
];

const meta: Meta<typeof FloatingActionButton> = {
  title: 'Composed/FloatingActionButton',
  component: FloatingActionButton,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '500px', position: 'relative', background: 'var(--background)' }}>
        <div style={{ padding: '2rem', opacity: 0.5 }}>
          <p>Canvas content behind the FAB. Click the + button to see the expanding menu.</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    actions: defaultActions,
  },
};

export const WithLoadingAction: Story = {
  args: {
    actions: [
      defaultActions[0],
      {
        ...defaultActions[1],
        loading: true,
      },
    ],
  },
};

export const SingleAction: Story = {
  args: {
    actions: [defaultActions[0]],
  },
};

export const ThreeActions: Story = {
  args: {
    actions: [
      ...defaultActions,
      {
        id: 'import',
        label: 'Import Project',
        icon: <Plus className="h-5 w-5" />,
        onClick: () => undefined,
      },
    ],
  },
};
