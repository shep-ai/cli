import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RowBrowser } from './row-browser';

const meta: Meta<typeof RowBrowser> = {
  title: 'Features/Database/RowBrowser',
  component: RowBrowser,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onPageChange: fn(),
    page: 0,
    pageSize: 50,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const sampleColumns = ['id', 'name', 'status', 'created_at'];

const sampleRows = [
  {
    id: 1,
    name: 'database-management-ui',
    status: 'in_progress',
    created_at: '2026-03-10T14:30:00Z',
  },
  { id: 2, name: 'agent-improvements', status: 'completed', created_at: '2026-03-09T10:15:00Z' },
  { id: 3, name: 'cli-refactor', status: 'pending', created_at: '2026-03-08T08:00:00Z' },
  { id: 4, name: 'settings-page', status: 'completed', created_at: '2026-03-07T16:45:00Z' },
  { id: 5, name: 'tui-redesign', status: 'in_progress', created_at: '2026-03-06T12:00:00Z' },
];

const longTextRow = {
  id: 1,
  description:
    'This is a very long description that exceeds one hundred characters in length and should be truncated in the table cell display with an ellipsis and a clickable link to view the full value in a dialog modal window',
  metadata: JSON.stringify({ key: 'value', nested: { deep: true, items: [1, 2, 3] } }),
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const PopulatedTable: Story = {
  args: {
    columns: sampleColumns,
    rows: sampleRows,
    totalRows: 230,
    page: 0,
    pageSize: 50,
  },
};

export const MiddlePage: Story = {
  args: {
    columns: sampleColumns,
    rows: sampleRows,
    totalRows: 230,
    page: 2,
    pageSize: 50,
  },
};

export const LastPage: Story = {
  args: {
    columns: sampleColumns,
    rows: sampleRows.slice(0, 2),
    totalRows: 230,
    page: 4,
    pageSize: 50,
  },
};

export const EmptyTable: Story = {
  args: {
    columns: sampleColumns,
    rows: [],
    totalRows: 0,
    page: 0,
    pageSize: 50,
  },
};

export const Loading: Story = {
  args: {
    columns: [],
    rows: [],
    totalRows: 0,
    page: 0,
    pageSize: 50,
    loading: true,
  },
};

export const TruncatedValues: Story = {
  args: {
    columns: ['id', 'description', 'metadata'],
    rows: [longTextRow],
    totalRows: 1,
    page: 0,
    pageSize: 50,
  },
};

export const WithNullValues: Story = {
  args: {
    columns: ['id', 'name', 'email', 'notes'],
    rows: [
      { id: 1, name: 'Alice', email: 'alice@example.com', notes: null },
      { id: 2, name: 'Bob', email: null, notes: 'Some notes here' },
      { id: 3, name: null, email: null, notes: null },
    ],
    totalRows: 3,
    page: 0,
    pageSize: 50,
  },
};

export const BlobValues: Story = {
  args: {
    columns: ['id', 'name', 'data'],
    rows: [
      { id: 1, name: 'image.png', data: '(2048 bytes)' },
      { id: 2, name: 'document.pdf', data: '(15360 bytes)' },
    ],
    totalRows: 2,
    page: 0,
    pageSize: 50,
  },
};
