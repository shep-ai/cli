import type { Meta, StoryObj } from '@storybook/react';
import { ControlCenterEmptyState } from './control-center-empty-state';

const meta: Meta<typeof ControlCenterEmptyState> = {
  title: 'Features/ControlCenterEmptyState',
  component: ControlCenterEmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithCallback: Story = {
  args: {
    onRepositorySelect: (path: string) => {
      // eslint-disable-next-line no-console
      console.log('Selected repository:', path);
    },
  },
};
