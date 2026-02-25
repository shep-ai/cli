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
  iconUrl: 'https://cdn.simpleicons.org/cursor',
  autoInstall: false,
  required: false,
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
  iconUrl: 'https://cdn.simpleicons.org/claude',
  autoInstall: true,
  required: false,
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
  iconUrl: undefined,
  autoInstall: true,
  required: false,
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
    'Visual Studio Code is a lightweight but powerful source code editor from Microsoft.',
  tags: ['ide'],
  iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg',
  autoInstall: false,
  required: false,
  openDirectory: '/usr/bin/code',
  documentationUrl: 'https://code.visualstudio.com',
  installCommand: 'brew install --cask visual-studio-code',
  status: { status: 'missing', toolName: 'vscode' },
};

const cliAgentTool: ToolItem = {
  id: 'cursor-cli',
  name: 'Cursor CLI',
  summary: 'AI-powered terminal coding agent',
  description:
    'Cursor CLI is a terminal-based AI coding agent that brings conversational AI assistance directly to your command line.',
  tags: ['cli-agent'],
  iconUrl: 'https://cdn.simpleicons.org/cursor',
  autoInstall: true,
  required: false,
  openDirectory: undefined,
  documentationUrl: 'https://cursor.sh',
  installCommand: 'curl https://cursor.com/install -fsS | bash',
  status: { status: 'available', toolName: 'cursor-cli' },
};

const vcsTool: ToolItem = {
  id: 'gh',
  name: 'GitHub CLI',
  summary: "GitHub's official command-line tool",
  description:
    'GitHub CLI brings GitHub to your terminal. Manage pull requests, issues, repositories, workflows, and more.',
  tags: ['vcs'],
  iconUrl: 'https://cdn.simpleicons.org/github',
  autoInstall: true,
  required: true,
  openDirectory: undefined,
  documentationUrl: 'https://cli.github.com/manual/',
  installCommand: 'brew install gh',
  status: { status: 'available', toolName: 'gh' },
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
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { tool: installedIdeTool },
};

export const InstalledWithLaunch: Story = {
  args: { tool: installedIdeTool, onRefresh: async () => undefined },
};

export const InstalledNoLaunch: Story = {
  args: { tool: installedNoLaunchTool },
};

export const MissingAutoInstall: Story = {
  args: { tool: missingAutoInstallTool, onRefresh: async () => undefined },
};

export const MissingManualInstall: Story = {
  args: { tool: missingManualTool },
};

export const ErrorStatus: Story = {
  args: {
    tool: {
      ...missingAutoInstallTool,
      status: { status: 'error', toolName: 'aider', errorMessage: 'Binary check failed' },
    },
  },
};

export const CliAgent: Story = {
  args: { tool: cliAgentTool },
};

export const VcsTool: Story = {
  args: { tool: vcsTool },
};

export const AllStates: Story = {
  decorators: [
    (Story) => (
      <div className="grid grid-cols-3 gap-3">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <ToolCard tool={installedIdeTool} />
      <ToolCard tool={installedNoLaunchTool} />
      <ToolCard tool={missingAutoInstallTool} />
      <ToolCard tool={missingManualTool} />
      <ToolCard
        tool={{
          ...missingAutoInstallTool,
          status: { status: 'error', toolName: 'aider', errorMessage: 'Binary check failed' },
        }}
      />
      <ToolCard tool={cliAgentTool} />
      <ToolCard tool={vcsTool} />
    </>
  ),
};
