import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { QueryRunner } from './query-runner';

const meta: Meta<typeof QueryRunner> = {
  title: 'Features/Database/QueryRunner',
  component: QueryRunner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onExecute: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Interactive wrapper for stories that need state
 * ------------------------------------------------------------------------- */

function QueryRunnerWithMockResults() {
  return (
    <QueryRunner
      onExecute={async (sql) => {
        // Simulate server delay
        await new Promise((r) => setTimeout(r, 500));

        if (sql.toLowerCase().includes('error')) {
          return { error: 'near "error": syntax error' };
        }

        return {
          columns: ['id', 'name', 'status', 'created_at'],
          rows: [
            {
              id: 1,
              name: 'database-management-ui',
              status: 'in_progress',
              created_at: '2026-03-10',
            },
            { id: 2, name: 'agent-improvements', status: 'completed', created_at: '2026-03-09' },
            { id: 3, name: 'cli-refactor', status: 'pending', created_at: '2026-03-08' },
          ],
        };
      }}
    />
  );
}

function QueryRunnerWithError() {
  return (
    <QueryRunner
      onExecute={async () => {
        return { error: 'no such table: nonexistent_table' };
      }}
    />
  );
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {};

export const Interactive: Story = {
  render: () => <QueryRunnerWithMockResults />,
};

export const WithError: Story = {
  render: () => <QueryRunnerWithError />,
};
