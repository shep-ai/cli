import type { Meta, StoryObj } from '@storybook/react';
import { ControlCenterEmptyState } from './control-center-empty-state';

const meta: Meta<typeof ControlCenterEmptyState> = {
  title: 'Features/ControlCenterEmptyState',
  component: ControlCenterEmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const agentReady = {
  agentType: 'claude-code',
  installed: true,
  authenticated: true,
  label: 'Claude Code',
  binaryName: 'claude',
  installCommand: 'curl -fsSL https://claude.ai/install.sh | bash',
  authCommand: null,
};

const claudeNotInstalled = {
  agentType: 'claude-code',
  installed: false,
  authenticated: false,
  label: 'Claude Code',
  binaryName: 'claude',
  installCommand: 'curl -fsSL https://claude.ai/install.sh | bash',
  authCommand: 'Install Claude Code first',
};

const cursorNotInstalled = {
  agentType: 'cursor',
  installed: false,
  authenticated: false,
  label: 'Cursor CLI',
  binaryName: 'cursor-agent',
  installCommand: 'curl https://cursor.com/install -fsS | bash',
  authCommand: 'Install Cursor CLI first',
};

const geminiNotInstalled = {
  agentType: 'gemini-cli',
  installed: false,
  authenticated: false,
  label: 'Gemini CLI',
  binaryName: 'gemini',
  installCommand: 'npm install -g @google/gemini-cli',
  authCommand: 'Install Gemini CLI first',
};

interface MockAgent {
  agentType: string;
  installed: boolean;
  authenticated: boolean;
  label: string;
  binaryName: string;
  installCommand: string;
  authCommand: string | null;
}
interface MockTool {
  installed: boolean;
  version: string | null;
  installCommand: string;
  installUrl: string;
}

const gitReady: MockTool = {
  installed: true,
  version: '2.43.0',
  installCommand: 'sudo apt-get install -y git',
  installUrl: 'https://git-scm.com',
};
const gitMissing: MockTool = {
  installed: false,
  version: null,
  installCommand: 'sudo apt-get install -y git',
  installUrl: 'https://git-scm.com',
};
const ghReady: MockTool = {
  installed: true,
  version: '2.40.1',
  installCommand: 'sudo apt install gh -y',
  installUrl: 'https://cli.github.com',
};
const ghMissing: MockTool = {
  installed: false,
  version: null,
  installCommand: 'sudo apt install gh -y',
  installUrl: 'https://cli.github.com',
};

function setMocks(agent: MockAgent, git: MockTool, gh: MockTool) {
  return () => {
    const win = globalThis as Record<string, unknown>;
    win.__mockAgentAuth = agent;
    win.__mockToolStatus = { git, gh };
    return () => {
      delete win.__mockAgentAuth;
      delete win.__mockToolStatus;
    };
  };
}

/** All tools installed — the happy path */
export const AllToolsReady: Story = {
  args: {},
  beforeEach: setMocks(agentReady, gitReady, ghReady),
};

/** Git is missing — blocks all workflow phases */
export const GitMissing: Story = {
  args: {},
  beforeEach: setMocks(agentReady, gitMissing, ghReady),
};

/** GitHub CLI is missing — PR features unavailable */
export const GhCliMissing: Story = {
  args: {},
  beforeEach: setMocks(agentReady, gitReady, ghMissing),
};

/** Both git and gh are missing */
export const BothToolsMissing: Story = {
  args: {},
  beforeEach: setMocks(agentReady, gitMissing, ghMissing),
};

/** Claude Code not installed */
export const ClaudeCodeNotInstalled: Story = {
  args: {},
  beforeEach: setMocks(claudeNotInstalled, gitReady, ghReady),
};

/** Cursor CLI not installed */
export const CursorCliNotInstalled: Story = {
  args: {},
  beforeEach: setMocks(cursorNotInstalled, gitReady, ghReady),
};

/** Gemini CLI not installed */
export const GeminiCliNotInstalled: Story = {
  args: {},
  beforeEach: setMocks(geminiNotInstalled, gitReady, ghReady),
};

/** Agent not installed + tools missing — worst case */
export const EverythingMissing: Story = {
  args: {},
  beforeEach: setMocks(claudeNotInstalled, gitMissing, ghMissing),
};

/** With callback — for interaction testing */
export const WithCallback: Story = {
  args: {
    onRepositorySelect: (path: string) => {
      // eslint-disable-next-line no-console
      console.log('Selected repository:', path);
    },
  },
};
