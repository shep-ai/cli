import type { Meta, StoryObj } from '@storybook/react';
import { CacheSummary } from './cache-summary';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

const meta: Meta<typeof CacheSummary> = {
  title: 'Common/CacheSummary',
  component: CacheSummary,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CacheSummary>;

/** Node.js project with multiple commands and ports. */
export const NodeProject: Story = {
  args: {
    summary: {
      canStart: true,
      language: 'TypeScript',
      framework: 'Next.js',
      commandCount: 2,
      ports: [3000],
      source: 'FastPath',
    },
    onEdit: noop,
    onReAnalyze: noop,
  },
};

/** Python project analyzed by agent. */
export const PythonProject: Story = {
  args: {
    summary: {
      canStart: true,
      language: 'Python',
      framework: 'Django',
      commandCount: 1,
      ports: [8000],
      source: 'Agent',
    },
    onEdit: noop,
    onReAnalyze: noop,
  },
};

/** Project with no ports detected. */
export const NoPorts: Story = {
  args: {
    summary: {
      canStart: true,
      language: 'Go',
      commandCount: 1,
      source: 'Agent',
    },
    onEdit: noop,
    onReAnalyze: noop,
  },
};

/** Re-analyze in progress — button shows spinner. */
export const ReAnalyzing: Story = {
  args: {
    summary: {
      canStart: true,
      language: 'TypeScript',
      framework: 'Express',
      commandCount: 1,
      ports: [3000, 3001],
      source: 'Agent',
    },
    onEdit: noop,
    onReAnalyze: noop,
    reAnalyzing: true,
  },
};

/** Not startable project — still shows summary info. */
export const NotStartable: Story = {
  args: {
    summary: {
      canStart: false,
      reason: 'This is a CLI utility with no server component',
      language: 'Rust',
      commandCount: 0,
      source: 'Agent',
    },
    onEdit: noop,
    onReAnalyze: noop,
  },
};
