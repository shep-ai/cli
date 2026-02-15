// @vitest-environment node

/**
 * IDE Open Command Unit Tests
 *
 * Tests for the `shep ide <feat-id>` command.
 *
 * TDD Phase: RED → GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { EditorType } from '../../../../../src/domain/generated/output.js';

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

vi.mock('../../../../../src/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class MockShowFeatureUseCase {},
}));

vi.mock('../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(() => ({
    environment: { defaultEditor: 'vscode' },
  })),
}));

vi.mock(
  '../../../../../src/infrastructure/services/ide-launchers/ide-launcher.registry.js',
  () => ({
    createLauncherRegistry: vi.fn(() => new Map()),
  })
);

vi.mock('../../../../../src/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  SHEP_HOME_DIR: '/mock/.shep',
}));

vi.mock('../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  colors: { accent: (s: string) => s },
  symbols: {},
  fmt: {},
}));

// Import after mocks
import { createIdeOpenCommand } from '../../../../../src/presentation/cli/commands/ide-open.command.js';
import { container } from '../../../../../src/infrastructure/di/container.js';
import { getSettings } from '../../../../../src/infrastructure/services/settings.service.js';
import { createLauncherRegistry } from '../../../../../src/infrastructure/services/ide-launchers/ide-launcher.registry.js';
import { messages } from '../../../../../src/presentation/cli/ui/index.js';

// Helper to build a mock launcher
function makeLauncher(name: string, editorId: EditorType) {
  return {
    name,
    editorId,
    binary: editorId as string,
    launch: vi.fn().mockResolvedValue(undefined),
    checkAvailable: vi.fn().mockResolvedValue(true),
  };
}

function setupRegistry() {
  const launchers = {
    vscode: makeLauncher('VS Code', EditorType.VsCode),
    cursor: makeLauncher('Cursor', EditorType.Cursor),
    windsurf: makeLauncher('Windsurf', EditorType.Windsurf),
    zed: makeLauncher('Zed', EditorType.Zed),
    antigravity: makeLauncher('Antigravity', EditorType.Antigravity),
  };
  const registry = new Map<EditorType, (typeof launchers)[keyof typeof launchers]>(
    Object.entries(launchers) as any
  );
  vi.mocked(createLauncherRegistry).mockReturnValue(registry as any);
  return launchers;
}

describe('IDE Open Command', () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default settings
    vi.mocked(getSettings).mockReturnValue({
      environment: { defaultEditor: 'vscode' },
    } as any);

    // Default feature resolution
    mockExecute = vi.fn().mockResolvedValue({
      id: 'feat-123-abc',
      name: 'test-feature',
      repositoryPath: '/home/user/project',
      branch: 'feat/test-feature',
    });
    vi.mocked(container.resolve).mockReturnValue({ execute: mockExecute });

    // Setup registry
    setupRegistry();
  });

  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createIdeOpenCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('should have the name "ide"', () => {
      const cmd = createIdeOpenCommand();
      expect(cmd.name()).toBe('ide');
    });

    it('should accept feat-id as a required argument', () => {
      const cmd = createIdeOpenCommand();
      const args = (cmd as any)._args;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('feat-id');
      expect(args[0].required).toBe(true);
    });

    it('should have --vscode option flag', () => {
      const cmd = createIdeOpenCommand();
      const opt = cmd.options.find((o) => o.long === '--vscode');
      expect(opt).toBeDefined();
    });

    it('should have --cursor option flag', () => {
      const cmd = createIdeOpenCommand();
      const opt = cmd.options.find((o) => o.long === '--cursor');
      expect(opt).toBeDefined();
    });

    it('should have --windsurf option flag', () => {
      const cmd = createIdeOpenCommand();
      const opt = cmd.options.find((o) => o.long === '--windsurf');
      expect(opt).toBeDefined();
    });

    it('should have --zed option flag', () => {
      const cmd = createIdeOpenCommand();
      const opt = cmd.options.find((o) => o.long === '--zed');
      expect(opt).toBeDefined();
    });

    it('should have --antigravity option flag', () => {
      const cmd = createIdeOpenCommand();
      const opt = cmd.options.find((o) => o.long === '--antigravity');
      expect(opt).toBeDefined();
    });
  });

  describe('IDE selection', () => {
    it('should use defaultEditor from settings when no flag provided', async () => {
      vi.mocked(getSettings).mockReturnValue({
        environment: { defaultEditor: 'vscode' },
      } as any);
      const launchers = setupRegistry();

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(launchers.vscode.launch).toHaveBeenCalled();
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('VS Code'));
    });

    it('should use --cursor flag to override settings', async () => {
      vi.mocked(getSettings).mockReturnValue({
        environment: { defaultEditor: 'vscode' },
      } as any);
      const launchers = setupRegistry();

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123', '--cursor']);

      expect(launchers.cursor.launch).toHaveBeenCalled();
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('Cursor'));
    });

    it('should use --antigravity flag to override settings', async () => {
      vi.mocked(getSettings).mockReturnValue({
        environment: { defaultEditor: 'vscode' },
      } as any);
      const launchers = setupRegistry();

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123', '--antigravity']);

      expect(launchers.antigravity.launch).toHaveBeenCalled();
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('Antigravity'));
    });
  });

  describe('feature resolution', () => {
    it('should resolve feature via ShowFeatureUseCase', async () => {
      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(mockExecute).toHaveBeenCalledWith('feat-123');
    });
  });

  describe('success message', () => {
    it('should include IDE name in success message', async () => {
      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('VS Code'));
    });
  });

  describe('error handling', () => {
    it('should handle feature not found error', async () => {
      mockExecute.mockRejectedValue(new Error('Feature not found'));

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'unknown-id']);

      expect(messages.error).toHaveBeenCalled();
    });

    it('should handle unknown editor in settings', async () => {
      vi.mocked(getSettings).mockReturnValue({
        environment: { defaultEditor: 'notepad' },
      } as any);

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(messages.error).toHaveBeenCalled();
    });
  });
});
