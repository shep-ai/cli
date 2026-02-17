// @vitest-environment node

/**
 * IDE Open Command Unit Tests
 *
 * Tests for the `shep ide <feat-id>` command.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// --- Mocks ---

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(() => ({ execute: vi.fn() })),
  },
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class MockShowFeatureUseCase {},
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(() => ({
    environment: { defaultEditor: 'vscode' },
  })),
}));

vi.mock('@/infrastructure/services/ide-launchers/launch-ide.js', () => ({
  launchIde: vi.fn(),
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
import { container } from '@/infrastructure/di/container.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';
import { launchIde } from '@/infrastructure/services/ide-launchers/launch-ide.js';
import { messages } from '../../../../../src/presentation/cli/ui/index.js';

describe('IDE Open Command', () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getSettings).mockReturnValue({
      environment: { defaultEditor: 'vscode' },
    } as any);

    mockExecute = vi.fn().mockResolvedValue({
      id: 'feat-123-abc',
      name: 'test-feature',
      repositoryPath: '/home/user/project',
      branch: 'feat/test-feature',
    });
    vi.mocked(container.resolve).mockReturnValue({ execute: mockExecute });

    vi.mocked(launchIde).mockResolvedValue({
      ok: true,
      editorName: 'VS Code',
      worktreePath: '/mock/.shep/repos/abc123/wt/feat-test-feature',
    });
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

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(launchIde).toHaveBeenCalledWith(expect.objectContaining({ editorId: 'vscode' }));
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('VS Code'));
    });

    it('should use --cursor flag to override settings', async () => {
      vi.mocked(getSettings).mockReturnValue({
        environment: { defaultEditor: 'vscode' },
      } as any);
      vi.mocked(launchIde).mockResolvedValue({
        ok: true,
        editorName: 'Cursor',
        worktreePath: '/mock/.shep/repos/abc123/wt/feat-test-feature',
      });

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123', '--cursor']);

      expect(launchIde).toHaveBeenCalledWith(expect.objectContaining({ editorId: 'cursor' }));
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('Cursor'));
    });

    it('should use --antigravity flag to override settings', async () => {
      vi.mocked(getSettings).mockReturnValue({
        environment: { defaultEditor: 'vscode' },
      } as any);
      vi.mocked(launchIde).mockResolvedValue({
        ok: true,
        editorName: 'Antigravity',
        worktreePath: '/mock/.shep/repos/abc123/wt/feat-test-feature',
      });

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123', '--antigravity']);

      expect(launchIde).toHaveBeenCalledWith(expect.objectContaining({ editorId: 'antigravity' }));
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('Antigravity'));
    });
  });

  describe('feature resolution', () => {
    it('should resolve feature via ShowFeatureUseCase', async () => {
      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(mockExecute).toHaveBeenCalledWith('feat-123');
    });

    it('should pass feature repositoryPath and branch to launchIde', async () => {
      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(launchIde).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryPath: '/home/user/project',
          branch: 'feat/test-feature',
        })
      );
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

    it('should handle launchIde failure result', async () => {
      vi.mocked(launchIde).mockResolvedValue({
        ok: false,
        code: 'unknown_editor',
        message: 'No launcher found for editor: notepad',
      });

      const cmd = createIdeOpenCommand();
      await cmd.parseAsync(['node', 'test', 'feat-123']);

      expect(messages.error).toHaveBeenCalled();
    });
  });
});
