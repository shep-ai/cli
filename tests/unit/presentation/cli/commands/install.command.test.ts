// @vitest-environment node

/**
 * Install Command Unit Tests
 *
 * Tests for the `shep install <tool>` command.
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// --- Mocks (no top-level variables in factories since vi.mock is hoisted) ---

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, spawn: vi.fn(), execFile: vi.fn() };
});

vi.mock('../../../../../src/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(() => ({ execute: vi.fn() })),
  },
}));

vi.mock(
  '../../../../../src/application/use-cases/tools/validate-tool-availability.use-case.js',
  () => ({
    ValidateToolAvailabilityUseCase: class MockValidateToolAvailabilityUseCase {},
  })
);

vi.mock('../../../../../src/application/use-cases/tools/install-tool.use-case.js', () => ({
  InstallToolUseCase: class MockInstallToolUseCase {},
}));

vi.mock('../../../../../src/infrastructure/services/tool-installer/tool-metadata.js', () => ({
  TOOL_METADATA: {
    vscode: {
      name: 'Visual Studio Code',
      summary: 'Lightweight but powerful source code editor',
      description: 'Microsoft Visual Studio Code editor',
      category: 'ide',
      binary: 'code',
      packageManager: 'apt',
      commands: { linux: 'sudo apt update && sudo apt install -y code' },
      timeout: 300000,
      documentationUrl: 'https://code.visualstudio.com/docs/setup/linux',
      verifyCommand: 'code --version',
      openDirectory: 'code .',
    },
    cursor: {
      name: 'Cursor',
      summary: 'AI-powered code editor',
      description: 'Cursor AI-powered code editor',
      category: 'ide',
      binary: 'cursor',
      packageManager: 'curl',
      commands: { linux: 'curl -fsSL https://www.cursor.com/linux/install.sh | sh' },
      timeout: 600000,
      documentationUrl: 'https://www.cursor.com/docs',
      verifyCommand: 'cursor --version',
      openDirectory: 'cursor .',
    },
    windsurf: {
      name: 'Windsurf',
      summary: 'AI-powered code editor by Codeium',
      description: 'Windsurf AI-powered code editor',
      category: 'ide',
      binary: 'windsurf',
      packageManager: 'apt',
      commands: { linux: 'sudo apt-get install -y windsurf' },
      timeout: 300000,
      documentationUrl: 'https://docs.windsurf.com/windsurf/getting-started',
      verifyCommand: 'windsurf --version',
      openDirectory: 'windsurf .',
    },
    zed: {
      name: 'Zed',
      summary: 'High-performance code editor',
      description: 'Zed code editor',
      category: 'ide',
      binary: 'zed',
      packageManager: 'curl',
      commands: { linux: 'curl -f https://zed.dev/install.sh | sh' },
      timeout: 300000,
      documentationUrl: 'https://zed.dev/docs/installation',
      verifyCommand: 'zed --version',
      openDirectory: 'zed .',
    },
    antigravity: {
      name: 'Google Antigravity',
      summary: 'AI-powered agentic development platform',
      description: 'Google Antigravity platform',
      category: 'ide',
      binary: { linux: 'antigravity', darwin: 'agy' },
      packageManager: 'download',
      commands: { linux: 'echo "Download from https://antigravity.google/download"' },
      timeout: 300000,
      documentationUrl: 'https://codelabs.developers.google.com/getting-started-google-antigravity',
      verifyCommand: 'agy --version',
      autoInstall: false,
      openDirectory: 'agy .',
    },
    'cursor-cli': {
      name: 'Cursor CLI',
      summary: 'AI-powered code editor CLI',
      description: 'Cursor CLI tool',
      category: 'cli-agent',
      binary: 'cursor',
      packageManager: 'curl',
      commands: { linux: 'curl https://cursor.com/install -fsS | bash' },
      timeout: 300000,
      documentationUrl: 'https://cursor.com',
      verifyCommand: 'cursor --version',
    },
    'claude-code': {
      name: 'Claude Code',
      summary: 'AI-powered code assistant',
      description: 'Claude Code assistant',
      category: 'cli-agent',
      binary: 'claude',
      packageManager: 'curl',
      commands: { linux: 'curl -fsSL https://claude.ai/install.sh | bash' },
      timeout: 300000,
      documentationUrl: 'https://code.claude.com/docs/en/overview',
      verifyCommand: 'claude --version',
    },
  },
}));

vi.mock('../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  colors: {
    accent: (s: string) => s,
    muted: (s: string) => s,
  },
  fmt: {
    heading: (s: string) => s,
    label: (s: string) => s,
    code: (s: string) => s,
  },
  symbols: {},
}));

// Import after mocks
import { createInstallCommand } from '../../../../../src/presentation/cli/commands/install.command.js';
import { container } from '../../../../../src/infrastructure/di/container.js';
import { messages } from '../../../../../src/presentation/cli/ui/index.js';

describe('Install Command', () => {
  let mockValidateExecute: ReturnType<typeof vi.fn>;
  let mockInstallExecute: ReturnType<typeof vi.fn>;
  let mockContainerResolve: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0; // Reset exit code before each test

    // Setup use case mocks
    mockValidateExecute = vi.fn().mockResolvedValue({
      status: 'not-available',
      toolName: 'vscode',
      errorMessage: 'Tool not found',
    });

    mockInstallExecute = vi.fn().mockResolvedValue({
      status: 'available',
      toolName: 'vscode',
    });

    // Setup container mock - use a more reliable approach
    mockContainerResolve = vi.fn((UseCase: any) => {
      // Check various ways the class might be identified
      const caseName = UseCase.name ?? '';
      const toStringValue = typeof UseCase === 'function' ? UseCase.toString() : '';

      const validateCheck =
        caseName === 'ValidateToolAvailabilityUseCase'
          ? true
          : caseName.includes('ValidateToolAvailability')
            ? true
            : toStringValue.includes('ValidateToolAvailability');
      const installCheck =
        caseName === 'InstallToolUseCase'
          ? true
          : caseName.includes('InstallTool')
            ? true
            : toStringValue.includes('InstallTool');

      if (validateCheck) {
        return { execute: mockValidateExecute };
      }
      if (installCheck) {
        return { execute: mockInstallExecute };
      }
      return { execute: vi.fn() };
    });

    (vi.mocked(container.resolve) as any).mockImplementation(mockContainerResolve);
  });

  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createInstallCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('should have the name "install"', () => {
      const cmd = createInstallCommand();
      expect(cmd.name()).toBe('install');
    });

    it('should accept tool as an optional argument', () => {
      const cmd = createInstallCommand();
      const args = (cmd as any)._args;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('tool');
      expect(args[0].required).toBe(false);
    });

    it('should have --how option flag', () => {
      const cmd = createInstallCommand();
      const opt = cmd.options.find((o) => o.long === '--how');
      expect(opt).toBeDefined();
    });
  });

  describe('tool validation', () => {
    it('should show tool list for unknown tool', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'invalid-tool']);

      expect(messages.error).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);

      const allLogs = consoleSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain("don't recognize");
      expect(allLogs).toContain('invalid-tool');

      consoleSpy.mockRestore();
    });

    it('should display available tools when unknown tool is given', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'invalid-tool']);

      const allLogs = consoleSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('vscode');
      expect(allLogs).toContain('claude-code');

      consoleSpy.mockRestore();
    });

    it('should accept vscode', async () => {
      mockInstallExecute.mockResolvedValue({
        status: 'available',
        toolName: 'vscode',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(mockValidateExecute).toHaveBeenCalledWith('vscode');
    });

    it('should accept cursor', async () => {
      mockInstallExecute.mockResolvedValue({
        status: 'available',
        toolName: 'cursor',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'cursor']);

      expect(mockValidateExecute).toHaveBeenCalledWith('cursor');
    });

    it('should accept cursor-cli', async () => {
      mockInstallExecute.mockResolvedValue({
        status: 'available',
        toolName: 'cursor-cli',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'cursor-cli']);

      expect(mockValidateExecute).toHaveBeenCalledWith('cursor-cli');
    });

    it('should accept claude-code', async () => {
      mockInstallExecute.mockResolvedValue({
        status: 'available',
        toolName: 'claude-code',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'claude-code']);

      expect(mockValidateExecute).toHaveBeenCalledWith('claude-code');
    });
  });

  describe('tool listing (no arguments)', () => {
    it('should print tool list when no tool argument is given', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test']);

      const allLogs = consoleSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('shep install <tool>');

      consoleSpy.mockRestore();
    });

    it('should not set error exit code when no tool argument is given', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(process.exitCode).toBe(0);
      expect(messages.error).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should display tool names in the listing', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test']);

      const allLogs = consoleSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('vscode');
      expect(allLogs).toContain('cursor-cli');
      expect(allLogs).toContain('claude-code');

      consoleSpy.mockRestore();
    });

    it('should not call any use cases when no tool is given', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(mockValidateExecute).not.toHaveBeenCalled();
      expect(mockInstallExecute).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('--how flag (dry run)', () => {
    it('should print instructions without executing when --how flag is set', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode', '--how']);

      // Should NOT call install
      expect(mockInstallExecute).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should display installation info in --how output', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode', '--how']);

      // Check that something was logged (installation instructions)
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should display binary name in --how output', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'cursor', '--how']);

      // Check if binary was logged somewhere in the output
      const allLogs = consoleSpy.mock.calls.join('\n');
      expect(allLogs).toContain('cursor');

      consoleSpy.mockRestore();
    });

    it('should display docs link in --how output', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode', '--how']);

      const allLogs = consoleSpy.mock.calls.join('\n');
      expect(allLogs).toContain('code.visualstudio.com');

      consoleSpy.mockRestore();
    });

    it('should display verify command in --how output', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode', '--how']);

      const allLogs = consoleSpy.mock.calls.join('\n');
      expect(allLogs).toContain('--version');

      consoleSpy.mockRestore();
    });
  });

  describe('tool installation', () => {
    it('should validate tool availability first', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'not-available',
        toolName: 'vscode',
        errorMessage: 'Not found',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(mockValidateExecute).toHaveBeenCalledWith('vscode');
    });

    it('should show success if tool is already available', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'available',
        toolName: 'vscode',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(messages.success).toHaveBeenCalled();
      expect(mockInstallExecute).not.toHaveBeenCalled();
    });

    it('should call install use case when tool is not available', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'not-available',
        toolName: 'vscode',
        errorMessage: 'Not found',
      });
      mockInstallExecute.mockResolvedValue({
        status: 'available',
        toolName: 'vscode',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(mockInstallExecute).toHaveBeenCalledWith('vscode', expect.any(Function));
    });

    it('should show success message on successful installation', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'not-available',
        toolName: 'vscode',
      });
      mockInstallExecute.mockResolvedValue({
        status: 'available',
        toolName: 'vscode',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(messages.success).toHaveBeenCalled();
    });

    it('should show error message on failed installation', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'not-available',
        toolName: 'vscode',
      });
      mockInstallExecute.mockResolvedValue({
        status: 'failed',
        toolName: 'vscode',
        errorMessage: 'Installation failed',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(messages.error).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it('should pass output callback to install use case', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'not-available',
        toolName: 'vscode',
      });

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      const call = mockInstallExecute.mock.calls[0];
      expect(call[0]).toBe('vscode');
      expect(typeof call[1]).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle use case errors gracefully', async () => {
      mockValidateExecute.mockRejectedValue(new Error('Service error'));

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(messages.error).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it('should handle install use case errors', async () => {
      mockValidateExecute.mockResolvedValue({
        status: 'not-available',
        toolName: 'vscode',
      });
      mockInstallExecute.mockRejectedValue(new Error('Installation error'));

      const cmd = createInstallCommand();
      await cmd.parseAsync(['node', 'test', 'vscode']);

      expect(messages.error).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });
  });
});
