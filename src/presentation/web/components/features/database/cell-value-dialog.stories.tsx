import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CellValueDialog } from './cell-value-dialog';

const meta: Meta<typeof CellValueDialog> = {
  title: 'Features/Database/CellValueDialog',
  component: CellValueDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onOpenChange: fn(),
    columnName: 'description',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const ShortText: Story = {
  args: {
    value: 'A simple short text value.',
  },
};

export const LongText: Story = {
  args: {
    columnName: 'content',
    value:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
  },
};

export const BlobValue: Story = {
  args: {
    columnName: 'data',
    value: '(2048 bytes)',
  },
};

export const JsonValue: Story = {
  args: {
    columnName: 'metadata',
    value: JSON.stringify(
      {
        id: 'feat-12345',
        name: 'database-management-ui',
        status: 'in_progress',
        config: { maxRetries: 3, timeout: 30000 },
        tags: ['web', 'database', 'ui'],
      },
      null,
      2
    ),
  },
};
