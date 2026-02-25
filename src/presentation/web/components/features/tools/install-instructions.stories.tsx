import type { Meta, StoryObj } from '@storybook/react';
import { InstallInstructions } from './install-instructions';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

const baseTool: ToolItem = {
  id: 'cursor',
  name: 'Cursor',
  summary: 'AI-powered code editor',
  description: 'Cursor is an AI-first code editor built on VS Code.',
  tags: ['ide'],
  iconUrl: 'https://cdn.simpleicons.org/cursor',
  autoInstall: false,
  required: false,
  openDirectory: '/usr/bin/cursor',
  documentationUrl: 'https://cursor.sh',
  installCommand: 'brew install --cask cursor',
  status: { status: 'missing', toolName: 'cursor' },
};

const meta: Meta<typeof InstallInstructions> = {
  title: 'Features/InstallInstructions',
  component: InstallInstructions,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    tool: baseTool,
    open: true,
    onOpenChange: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tool: baseTool,
    open: true,
  },
};

export const WithInstallCommand: Story = {
  args: {
    tool: {
      ...baseTool,
      installCommand: 'brew install --cask cursor',
    },
    open: true,
  },
};

export const WithoutInstallCommand: Story = {
  args: {
    tool: {
      ...baseTool,
      installCommand: undefined,
    },
    open: true,
  },
};

export const WithDocumentationUrl: Story = {
  args: {
    tool: {
      ...baseTool,
      documentationUrl: 'https://cursor.sh/docs',
    },
    open: true,
  },
};

export const WithoutDocumentationUrl: Story = {
  args: {
    tool: {
      ...baseTool,
      documentationUrl: '',
    },
    open: true,
  },
};

export const Closed: Story = {
  args: {
    tool: baseTool,
    open: false,
  },
};
