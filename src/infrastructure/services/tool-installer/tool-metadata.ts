/**
 * Tool Installation Metadata
 *
 * Defines installation commands and metadata for all supported development tools
 * across different platforms. Each tool specifies its binary name, package manager,
 * platform-specific installation commands, timeout, and documentation URL.
 */

export interface ToolMetadata {
  /** Binary name to check with 'which' command */
  binary: string;

  /** Package manager or installation method */
  packageManager: string;

  /** Platform-specific installation commands (keyed by os.platform()) */
  commands: Record<string, string[]>;

  /** Installation timeout in milliseconds */
  timeout: number;

  /** Official documentation URL */
  documentationUrl: string;

  /** Command to verify installation (e.g., check version) */
  verifyCommand: string[];

  /** Optional notes for installation */
  notes?: string;
}

export const TOOL_METADATA: Record<string, ToolMetadata> = {
  vscode: {
    binary: 'code',
    packageManager: 'apt',
    commands: {
      linux: ['sudo', 'apt', 'update', '&&', 'sudo', 'apt', 'install', '-y', 'code'],
      darwin: ['brew', 'install', 'visual-studio-code'],
    },
    timeout: 300000, // 5 minutes
    documentationUrl: 'https://code.visualstudio.com/docs/setup/linux',
    verifyCommand: ['code', '--version'],
    notes: 'Microsoft Visual Studio Code',
  },

  cursor: {
    binary: 'cursor',
    packageManager: 'curl',
    commands: {
      linux: ['sh', '-c', 'curl -fsSL https://www.cursor.com/linux/install.sh | sh'],
      darwin: ['sh', '-c', 'curl -fsSL https://www.cursor.com/mac/install.sh | sh'],
    },
    timeout: 600000, // 10 minutes
    documentationUrl: 'https://www.cursor.com/docs',
    verifyCommand: ['cursor', '--version'],
    notes: 'AI-powered code editor',
  },

  windsurf: {
    binary: 'windsurf',
    packageManager: 'curl',
    commands: {
      linux: [
        'sh',
        '-c',
        'curl -fsSL https://windsurf-stable.codeium.com/linux-x64/latest/install.sh | sh',
      ],
      darwin: [
        'sh',
        '-c',
        'curl -fsSL https://windsurf-stable.codeium.com/mac-arm64/latest/install.sh | sh',
      ],
    },
    timeout: 600000, // 10 minutes
    documentationUrl: 'https://docs.codeium.com/windsurf/getting-started',
    verifyCommand: ['windsurf', '--version'],
    notes: 'Codeium Windsurf IDE',
  },

  zed: {
    binary: 'zed',
    packageManager: 'curl',
    commands: {
      linux: ['sh', '-c', 'curl -fsSL https://zed.dev/install.sh | sh'],
      darwin: ['sh', '-c', 'curl -fsSL https://zed.dev/install.sh | sh'],
    },
    timeout: 300000, // 5 minutes
    documentationUrl: 'https://zed.dev/docs/getting-started',
    verifyCommand: ['zed', '--version'],
    notes: 'Zed Code Editor',
  },

  antigravity: {
    binary: 'antigravity',
    packageManager: 'curl',
    commands: {
      linux: ['sh', '-c', 'curl -fsSL https://antigravity.dev/install.sh | sh'],
      darwin: ['sh', '-c', 'curl -fsSL https://antigravity.dev/install.sh | sh'],
    },
    timeout: 600000, // 10 minutes
    documentationUrl: 'https://antigravity.dev/docs',
    verifyCommand: ['antigravity', '--version'],
    notes: 'Antigravity IDE',
  },

  'cursor-cli': {
    binary: 'cursor-cli',
    packageManager: 'npm',
    commands: {
      linux: ['npm', 'install', '-g', '@anysphere/cursor-cli'],
      darwin: ['npm', 'install', '-g', '@anysphere/cursor-cli'],
    },
    timeout: 120000, // 2 minutes
    documentationUrl: 'https://www.npmjs.com/package/@anysphere/cursor-cli',
    verifyCommand: ['cursor-cli', '--version'],
    notes: 'Cursor CLI tool for terminal usage',
  },

  'claude-code': {
    binary: 'claude',
    packageManager: 'npm',
    commands: {
      linux: ['npm', 'install', '-g', '@anthropic-ai/claude-code'],
      darwin: ['npm', 'install', '-g', '@anthropic-ai/claude-code'],
    },
    timeout: 120000, // 2 minutes
    documentationUrl: 'https://www.npmjs.com/package/@anthropic-ai/claude-code',
    verifyCommand: ['claude', '--version'],
    notes: 'Claude Code - AI-powered code assistant from Anthropic',
  },
};
