import type { Meta, StoryObj } from '@storybook/react';
import { EnvironmentSettingsSection } from './environment-settings-section';
import { EditorType } from '@shepai/core/domain/generated/output';

const meta = {
  title: 'Features/Settings/EnvironmentSettingsSection',
  component: EnvironmentSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof EnvironmentSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
    },
  },
};

export const DirtyState: Story = {
  args: {
    environment: {
      defaultEditor: EditorType.Cursor,
      shellPreference: 'zsh',
    },
  },
};
