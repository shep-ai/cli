import type { Meta, StoryObj } from '@storybook/react';
import { ToolCard } from './tool-card';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

const installedIdeTool: ToolItem = {
  id: 'cursor',
  name: 'Cursor',
  summary: 'AI-powered code editor built on VS Code',
  description:
    'Cursor is an AI-first code editor that lets you write, edit, and chat about your code. It is built on top of VS Code and integrates deeply with AI models to accelerate development workflows.',
  tags: ['ide'],
  autoInstall: false,
  openDirectory: '/usr/bin/cursor',
  documentationUrl: 'https://cursor.sh',
  installCommand: 'brew install --cask cursor',
  status: { status: 'available', toolName: 'cursor' },
};

const installedNoLaunchTool: ToolItem = {
  id: 'claude-code',
  name: 'Claude Code',
  summary: 'Anthropic AI coding agent for the terminal',
  description:
    'Claude Code is an agentic coding tool by Anthropic that lives in your terminal. It understands your codebase and helps you ship features, fix bugs, and review changes.',
  tags: ['cli-agent'],
  autoInstall: true,
  openDirectory: undefined,
  documentationUrl: 'https://claude.ai',
  installCommand: 'npm install -g @anthropic-ai/claude-code',
  status: { status: 'available', toolName: 'claude-code' },
};

const missingAutoInstallTool: ToolItem = {
  id: 'aider',
  name: 'Aider',
  summary: 'AI pair programming in your terminal',
  description:
    'Aider lets you pair program with AI in your terminal. Aider works best with Claude 3.5 Sonnet and can make coordinated changes across multiple files.',
  tags: ['cli-agent'],
  autoInstall: true,
  openDirectory: undefined,
  documentationUrl: 'https://aider.chat',
  installCommand: 'pip install aider-chat',
  status: { status: 'missing', toolName: 'aider' },
};

const missingManualTool: ToolItem = {
  id: 'vscode',
  name: 'VS Code',
  summary: 'Lightweight but powerful source code editor',
  description:
    'Visual Studio Code is a lightweight but powerful source code editor from Microsoft. It includes support for debugging, embedded git control, syntax highlighting, intelligent code completion, snippets, and code refactoring.',
  tags: ['ide'],
  autoInstall: false,
  openDirectory: '/usr/bin/code',
  documentationUrl: 'https://code.visualstudio.com',
  installCommand: 'brew install --cask visual-studio-code',
  status: { status: 'missing', toolName: 'vscode' },
};

const meta: Meta<typeof ToolCard> = {
  title: 'Features/ToolCard',
  component: ToolCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tool: installedIdeTool,
  },
};

export const InstalledWithLaunch: Story = {
  args: {
    tool: installedIdeTool,
    onRefresh: async () => undefined,
  },
};

export const InstalledNoLaunch: Story = {
  args: {
    tool: installedNoLaunchTool,
  },
};

export const MissingAutoInstall: Story = {
  args: {
    tool: missingAutoInstallTool,
    onRefresh: async () => undefined,
  },
};

export const MissingManualInstall: Story = {
  args: {
    tool: missingManualTool,
  },
};

export const ErrorStatus: Story = {
  args: {
    tool: {
      ...missingAutoInstallTool,
      status: { status: 'error', toolName: 'aider', errorMessage: 'Binary check failed' },
    },
  },
};
