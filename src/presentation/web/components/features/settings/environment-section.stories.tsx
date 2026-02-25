import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { EnvironmentSection } from './environment-section';
import type { EnvironmentConfig } from '@shepai/core/domain/generated/output';
import { EditorType } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof EnvironmentSection> = {
  title: 'Features/Settings/EnvironmentSection',
  component: EnvironmentSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSave: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const defaultEnvironment: EnvironmentConfig = {
  defaultEditor: EditorType.VsCode,
  shellPreference: '/bin/zsh',
};

const cursorEnvironment: EnvironmentConfig = {
  defaultEditor: EditorType.Cursor,
  shellPreference: '/bin/bash',
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    data: defaultEnvironment,
  },
};

export const CursorEditor: Story = {
  args: {
    data: cursorEnvironment,
  },
};
