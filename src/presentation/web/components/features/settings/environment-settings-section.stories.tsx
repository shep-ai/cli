import type { Meta, StoryObj } from '@storybook/react';
import { EnvironmentSettingsSection } from './environment-settings-section';
import { EditorType, TerminalType } from '@shepai/core/domain/generated/output';

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
      terminalPreference: TerminalType.System,
    },
    availableTerminals: [
      { id: 'system', name: 'System Terminal', available: true },
      { id: 'warp', name: 'Warp', available: true },
      { id: 'iterm2', name: 'iTerm2', available: true },
    ],
  },
};

export const CursorWithZsh: Story = {
  args: {
    environment: {
      defaultEditor: EditorType.Cursor,
      shellPreference: 'zsh',
      terminalPreference: TerminalType.System,
    },
    availableTerminals: [{ id: 'system', name: 'System Terminal', available: true }],
  },
};

export const WarpSelected: Story = {
  args: {
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'zsh',
      terminalPreference: TerminalType.Warp,
    },
    availableTerminals: [
      { id: 'system', name: 'System Terminal', available: true },
      { id: 'warp', name: 'Warp', available: true },
      { id: 'iterm2', name: 'iTerm2', available: true },
      { id: 'alacritty', name: 'Alacritty', available: true },
      { id: 'kitty', name: 'Kitty', available: true },
    ],
  },
};

export const OnlySystemTerminal: Story = {
  args: {
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
      terminalPreference: TerminalType.System,
    },
  },
};
