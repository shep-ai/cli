import type { Meta, StoryObj } from '@storybook/react';
import { ElapsedTime } from './elapsed-time';

const meta = {
  title: 'Composed/ElapsedTime',
  component: ElapsedTime,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ElapsedTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JustStarted: Story = {
  args: {
    startedAt: Date.now(),
  },
};

export const FiveMinutes: Story = {
  args: {
    startedAt: Date.now() - 5 * 60 * 1000,
  },
};

export const ThirtyMinutes: Story = {
  args: {
    startedAt: Date.now() - 30 * 60 * 1000,
  },
};

export const TwoHours: Story = {
  args: {
    startedAt: Date.now() - 2 * 60 * 60 * 1000,
  },
};
