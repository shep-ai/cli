import type { Meta, StoryObj } from '@storybook/react';
import { ToolDetailDrawer } from './tool-detail-drawer';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

const baseTool: ToolItem = {
  id: 'tmux',
  name: 'tmux',
  summary: 'Terminal multiplexer',
  description:
    'tmux is a terminal multiplexer for Unix-like operating systems. It allows multiple terminal sessions to be accessed simultaneously in a single window.',
  tags: ['terminal'],
  iconUrl: 'https://cdn.simpleicons.org/tmux',
  autoInstall: true,
  required: false,
  openDirectory: 'tmux new-session -c {dir}',
  documentationUrl: 'https://github.com/tmux/tmux/wiki',
  installCommand: 'sudo apt-get install -y tmux',
  status: { status: 'missing', toolName: 'tmux' },
  author: 'tmux team',
  website: 'https://tmux.github.io',
  platforms: ['linux', 'darwin'],
};

const meta: Meta<typeof ToolDetailDrawer> = {
  title: 'Features/ToolDetailDrawer',
  component: ToolDetailDrawer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    tool: baseTool,
    open: true,
    onClose: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Installed: Story = {
  args: {
    tool: {
      ...baseTool,
      status: { status: 'available', toolName: 'tmux' },
    },
    open: true,
  },
};

export const MissingAutoInstall: Story = {
  args: {
    tool: {
      ...baseTool,
      status: { status: 'missing', toolName: 'tmux' },
      autoInstall: true,
    },
    open: true,
  },
};

export const MissingManual: Story = {
  args: {
    tool: {
      ...baseTool,
      status: { status: 'missing', toolName: 'tmux' },
      autoInstall: false,
    },
    open: true,
  },
};

export const Error: Story = {
  args: {
    tool: {
      ...baseTool,
      status: {
        status: 'error',
        toolName: 'tmux',
        errorMessage: 'Permission denied: /usr/bin/tmux',
      },
    },
    open: true,
  },
};

export const WithLogs: Story = {
  args: {
    tool: baseTool,
    open: true,
  },
  parameters: {
    mockData: {
      useToolInstallStream: {
        logs: [
          'Reading package lists...',
          'Building dependency tree...',
          'Reading state information...',
          'The following NEW packages will be installed:',
          '  tmux',
          'Setting up tmux (3.3a-3) ...',
        ],
        status: 'streaming',
        result: null,
      },
    },
  },
};

export const AfterInstall: Story = {
  args: {
    tool: {
      ...baseTool,
      status: { status: 'available', toolName: 'tmux' },
    },
    open: true,
  },
  parameters: {
    mockData: {
      useToolInstallStream: {
        logs: [
          'Reading package lists...',
          'Building dependency tree...',
          'Setting up tmux (3.3a-3) ...',
          'Processing triggers...',
        ],
        status: 'done',
        result: { status: 'available', toolName: 'tmux' },
      },
    },
  },
};
