import type { Meta, StoryObj } from '@storybook/react';
import { ToolsPageClient } from './tools-page-client';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

const mockTools: ToolItem[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    summary: 'AI-powered code editor built on VS Code',
    description:
      'Cursor is an AI-first code editor that integrates AI models deeply into the development workflow.',
    tags: ['ide'],
    iconUrl: 'https://cdn.simpleicons.org/cursor',
    autoInstall: false,
    required: false,
    openDirectory: '/usr/bin/cursor',
    documentationUrl: 'https://cursor.sh',
    installCommand: 'brew install --cask cursor',
    status: { status: 'available', toolName: 'cursor' },
    author: 'Anysphere',
    website: 'https://cursor.com',
    platforms: ['linux', 'darwin', 'win32'],
  },
  {
    id: 'vscode',
    name: 'VS Code',
    summary: 'Lightweight but powerful source code editor',
    description:
      'Visual Studio Code is a lightweight but powerful source code editor from Microsoft with support for debugging, Git, syntax highlighting, and intelligent code completion.',
    tags: ['ide'],
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg',
    autoInstall: false,
    required: false,
    openDirectory: '/usr/bin/code',
    documentationUrl: 'https://code.visualstudio.com',
    installCommand: 'brew install --cask visual-studio-code',
    status: { status: 'missing', toolName: 'vscode' },
    author: 'Microsoft',
    website: 'https://code.visualstudio.com',
    platforms: ['linux', 'darwin', 'win32'],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    summary: 'Anthropic AI coding agent for the terminal',
    description:
      'Claude Code is an agentic coding tool by Anthropic that lives in your terminal, understands your codebase, and helps you ship features faster.',
    tags: ['cli-agent'],
    iconUrl: 'https://cdn.simpleicons.org/claude',
    autoInstall: true,
    required: false,
    openDirectory: undefined,
    documentationUrl: 'https://claude.ai/code',
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    status: { status: 'available', toolName: 'claude-code' },
    author: 'Anthropic',
    website: 'https://claude.ai/code',
    platforms: ['linux', 'darwin'],
  },
  {
    id: 'aider',
    name: 'Aider',
    summary: 'AI pair programming in your terminal',
    description:
      'Aider lets you pair program with LLMs to edit code in your local git repository. It works best with Claude 3.5 Sonnet and GPT-4o.',
    tags: ['cli-agent'],
    iconUrl: undefined,
    autoInstall: true,
    required: false,
    openDirectory: undefined,
    documentationUrl: 'https://aider.chat',
    installCommand: 'pip install aider-chat',
    status: { status: 'missing', toolName: 'aider' },
    author: 'Paul Gauthier',
    website: 'https://aider.chat',
    platforms: ['linux', 'darwin', 'win32'],
  },
  {
    id: 'goose',
    name: 'Goose',
    summary: 'Open-source AI coding agent by Block',
    description:
      'Goose is a developer agent by Block that autonomously handles complex engineering tasks through conversation and code execution.',
    tags: ['cli-agent'],
    iconUrl: undefined,
    autoInstall: true,
    required: false,
    openDirectory: undefined,
    documentationUrl: 'https://block.github.io/goose',
    installCommand: 'pip install goose-ai',
    status: { status: 'missing', toolName: 'goose' },
    author: 'Block',
    website: 'https://block.github.io/goose',
    platforms: ['linux', 'darwin', 'win32'],
  },
];

const ideOnlyTools = mockTools.filter((t) => t.tags.includes('ide'));
const cliOnlyTools = mockTools.filter((t) => t.tags.includes('cli-agent'));

const meta: Meta<typeof ToolsPageClient> = {
  title: 'Features/ToolsPageClient',
  component: ToolsPageClient,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tools: mockTools,
  },
};

export const AllToolsMix: Story = {
  args: {
    tools: mockTools,
  },
};

export const IDEsOnly: Story = {
  args: {
    tools: ideOnlyTools,
  },
};

export const CLIAgentsOnly: Story = {
  args: {
    tools: cliOnlyTools,
  },
};

export const EmptyList: Story = {
  args: {
    tools: [],
  },
};

export const AllInstalled: Story = {
  args: {
    tools: mockTools.map((t) => ({
      ...t,
      status: { status: 'available' as const, toolName: t.id },
    })),
  },
};

export const NoneInstalled: Story = {
  args: {
    tools: mockTools.map((t) => ({ ...t, status: { status: 'missing' as const, toolName: t.id } })),
  },
};
