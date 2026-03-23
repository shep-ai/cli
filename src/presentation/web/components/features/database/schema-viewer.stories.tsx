import type { Meta, StoryObj } from '@storybook/react';
import { SchemaViewer } from './schema-viewer';
import type { ColumnInfo } from '@/app/actions/get-table-schema';

const meta: Meta<typeof SchemaViewer> = {
  title: 'Features/Database/SchemaViewer',
  component: SchemaViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const typicalSchema: ColumnInfo[] = [
  { name: 'id', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: true },
  { name: 'name', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: false },
  { name: 'description', type: 'TEXT', notnull: false, defaultValue: null, primaryKey: false },
  { name: 'status', type: 'TEXT', notnull: true, defaultValue: "'pending'", primaryKey: false },
  {
    name: 'created_at',
    type: 'TEXT',
    notnull: true,
    defaultValue: 'CURRENT_TIMESTAMP',
    primaryKey: false,
  },
  { name: 'updated_at', type: 'TEXT', notnull: false, defaultValue: null, primaryKey: false },
];

const allNullable: ColumnInfo[] = [
  { name: 'key', type: 'TEXT', notnull: false, defaultValue: null, primaryKey: false },
  { name: 'value', type: 'TEXT', notnull: false, defaultValue: null, primaryKey: false },
  { name: 'metadata', type: 'BLOB', notnull: false, defaultValue: null, primaryKey: false },
];

const compositePk: ColumnInfo[] = [
  { name: 'feature_id', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: true },
  { name: 'repository_id', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: true },
  { name: 'status', type: 'TEXT', notnull: true, defaultValue: "'active'", primaryKey: false },
  { name: 'created_at', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: false },
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const TypicalSchema: Story = {
  args: {
    columns: typicalSchema,
  },
};

export const AllNullable: Story = {
  args: {
    columns: allNullable,
  },
};

export const CompositePrimaryKey: Story = {
  args: {
    columns: compositePk,
  },
};

export const Loading: Story = {
  args: {
    columns: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    columns: [],
  },
};
