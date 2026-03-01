import type { Meta, StoryObj } from '@storybook/react';
import { ViewTabs } from './view-tabs';

const meta: Meta<typeof ViewTabs> = {
  title: 'Features/ViewTabs',
  component: ViewTabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
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

const BoardPlaceholder = (
  <div className="bg-muted/30 text-muted-foreground flex h-full items-center justify-center">
    Board View Content
  </div>
);

const MapPlaceholder = (
  <div className="bg-muted/30 text-muted-foreground flex h-full items-center justify-center">
    Map View Content
  </div>
);

export const Default: Story = {
  args: {
    boardContent: BoardPlaceholder,
    mapContent: MapPlaceholder,
  },
};

export const BoardActive: Story = {
  args: {
    boardContent: BoardPlaceholder,
    mapContent: MapPlaceholder,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { searchParams: { view: 'board' } },
    },
  },
};

export const MapActive: Story = {
  args: {
    boardContent: BoardPlaceholder,
    mapContent: MapPlaceholder,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { searchParams: { view: 'map' } },
    },
  },
};
