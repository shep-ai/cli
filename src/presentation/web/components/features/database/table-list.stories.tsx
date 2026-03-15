import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableList } from './table-list';
import type { TableInfo } from '@/app/actions/list-tables';

const meta: Meta<typeof TableList> = {
  title: 'Features/Database/TableList',
  component: TableList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    selectedTable: null,
    onSelectTable: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const fewTables: TableInfo[] = [
  { name: 'features', rowCount: 42 },
  { name: 'repositories', rowCount: 5 },
  { name: 'settings', rowCount: 12 },
  { name: 'migrations', rowCount: 8 },
];

const manyTables: TableInfo[] = [
  { name: 'features', rowCount: 42 },
  { name: 'repositories', rowCount: 5 },
  { name: 'settings', rowCount: 12 },
  { name: 'migrations', rowCount: 8 },
  { name: 'agents', rowCount: 156 },
  { name: 'agent_events', rowCount: 1024 },
  { name: 'agent_logs', rowCount: 5432 },
  { name: 'skills', rowCount: 23 },
  { name: 'tools', rowCount: 67 },
  { name: 'tool_executions', rowCount: 890 },
  { name: 'workflows', rowCount: 15 },
  { name: 'workflow_steps', rowCount: 234 },
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const FewTables: Story = {
  args: {
    tables: fewTables,
  },
};

export const WithSelectedTable: Story = {
  args: {
    tables: fewTables,
    selectedTable: 'repositories',
  },
};

export const ManyTablesWithSearch: Story = {
  args: {
    tables: manyTables,
  },
};

export const Empty: Story = {
  args: {
    tables: [],
  },
};
