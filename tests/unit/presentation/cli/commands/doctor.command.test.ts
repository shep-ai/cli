// @vitest-environment node

/**
 * Doctor Command Unit Tests
 *
 * Tests for the `shep doctor` command: structure, prerequisite validation,
 * interactive prompts, fix gate, and result display.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// --- Mocks ---

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, spawn: vi.fn(), execFile: vi.fn() };
});

const mockUseCaseExecute = vi.fn();

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

vi.mock('@/application/use-cases/doctor/doctor-diagnose.use-case.js', () => ({
  DoctorDiagnoseUseCase: class MockDoctorDiagnoseUseCase {},
}));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@cli/presentation/cli/ui/index.js', () => ({
  messages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    newline: vi.fn(),
  },
  colors: {
    accent: (s: string) => s,
    muted: (s: string) => s,
  },
  spinner: vi.fn((_label: string, fn: () => Promise<unknown>) => fn()),
}));

// Import after mocks
import { createDoctorCommand } from '@cli/presentation/cli/commands/doctor.command.js';
import { container } from '@/infrastructure/di/container.js';
import { messages, spinner } from '@cli/presentation/cli/ui/index.js';
import { input, confirm } from '@inquirer/prompts';

// Default successful result
const defaultResult = {
  diagnosticReport: {
    userDescription: 'test problem',
    failedRunSummaries: [],
    systemInfo: {
      nodeVersion: 'v20.0.0',
      platform: 'darwin',
      arch: 'arm64',
      ghVersion: 'gh 2.40.0',
    },
    cliVersion: '1.0.0',
  },
  issueUrl: 'https://github.com/shep-ai/cli/issues/42',
  issueNumber: 42,
  cleanedUp: false,
};

describe('Doctor Command', () => {
  let mockToolInstaller: { checkAvailability: ReturnType<typeof vi.fn> };
  let mockRepoService: { checkAuth: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;

    mockToolInstaller = { checkAvailability: vi.fn().mockResolvedValue({ status: 'available' }) };
    mockRepoService = { checkAuth: vi.fn().mockResolvedValue(undefined) };
    mockUseCaseExecute.mockResolvedValue(defaultResult);

    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (token === 'IToolInstallerService') return mockToolInstaller;
      if (token === 'IGitHubRepositoryService') return mockRepoService;
      // DoctorDiagnoseUseCase — resolved by class reference
      return { execute: mockUseCaseExecute };
    });
  });

  // -----------------------------------------------------------------------
  // Command structure
  // -----------------------------------------------------------------------

  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createDoctorCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('should have the name "doctor"', () => {
      const cmd = createDoctorCommand();
      expect(cmd.name()).toBe('doctor');
    });

    it('should have a description', () => {
      const cmd = createDoctorCommand();
      expect(cmd.description()).toBeTruthy();
    });

    it('should accept description as an optional positional argument', () => {
      const cmd = createDoctorCommand();
      const args = (cmd as any)._args;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('description');
      expect(args[0].required).toBe(false);
    });

    it('should have --fix option', () => {
      const cmd = createDoctorCommand();
      const opt = cmd.options.find((o) => o.long === '--fix');
      expect(opt).toBeDefined();
    });

    it('should have --no-fix option', () => {
      const cmd = createDoctorCommand();
      // Commander auto-generates --no-fix when --fix is boolean
      const opt = cmd.options.find((o) => o.long === '--no-fix');
      expect(opt).toBeDefined();
    });

    it('should have --workdir option', () => {
      const cmd = createDoctorCommand();
      const opt = cmd.options.find((o) => o.long === '--workdir');
      expect(opt).toBeDefined();
    });

    it('should have --feature-id option', () => {
      const cmd = createDoctorCommand();
      const opt = cmd.options.find((o) => o.long === '--feature-id');
      expect(opt).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Prerequisite validation
  // -----------------------------------------------------------------------

  describe('prerequisite validation', () => {
    it('should check gh CLI availability before proceeding', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'test problem', '--no-fix']);

      expect(mockToolInstaller.checkAvailability).toHaveBeenCalledWith('gh');
    });

    it('should check gh authentication before proceeding', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'test problem', '--no-fix']);

      expect(mockRepoService.checkAuth).toHaveBeenCalled();
    });

    it('should show error when gh CLI is not installed', async () => {
      mockToolInstaller.checkAvailability.mockResolvedValue({ status: 'missing' });

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'test problem', '--no-fix']);

      expect(messages.error).toHaveBeenCalledWith(
        'Doctor failed',
        expect.objectContaining({
          message: expect.stringContaining('GitHub CLI (gh) is not installed'),
        })
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error when gh is not authenticated', async () => {
      mockRepoService.checkAuth.mockRejectedValue(new Error('not logged in'));

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'test problem', '--no-fix']);

      expect(messages.error).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Description collection
  // -----------------------------------------------------------------------

  describe('description collection', () => {
    it('should use positional argument when provided', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'agent crashed', '--no-fix']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'agent crashed' })
      );
      expect(input).not.toHaveBeenCalled();
    });

    it('should prompt for description when not provided', async () => {
      vi.mocked(input).mockResolvedValue('interactive description');

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', '--no-fix']);

      expect(input).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Describe') })
      );
      expect(mockUseCaseExecute).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'interactive description' })
      );
    });

    it('should cancel when interactive description is empty', async () => {
      vi.mocked(input).mockResolvedValue('   ');

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', '--no-fix']);

      expect(messages.info).toHaveBeenCalledWith(
        expect.stringContaining('No description provided')
      );
      expect(mockUseCaseExecute).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Fix gate
  // -----------------------------------------------------------------------

  describe('fix gate', () => {
    it('should pass fix=true when --fix flag is set', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--fix']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(expect.objectContaining({ fix: true }));
      expect(confirm).not.toHaveBeenCalled();
    });

    it('should pass fix=false when --no-fix flag is set', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(expect.objectContaining({ fix: false }));
      expect(confirm).not.toHaveBeenCalled();
    });

    it('should prompt for fix when neither flag is set', async () => {
      vi.mocked(confirm).mockResolvedValue(true);

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem']);

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('attempt a fix') })
      );
      expect(mockUseCaseExecute).toHaveBeenCalledWith(expect.objectContaining({ fix: true }));
    });

    it('should pass fix=false when user declines fix prompt', async () => {
      vi.mocked(confirm).mockResolvedValue(false);

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(expect.objectContaining({ fix: false }));
    });
  });

  // -----------------------------------------------------------------------
  // Workdir option
  // -----------------------------------------------------------------------

  describe('workdir option', () => {
    it('should pass workdir to use case when specified', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix', '--workdir', '/tmp/my-fix']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(
        expect.objectContaining({ workdir: '/tmp/my-fix' })
      );
    });

    it('should pass undefined workdir when not specified', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(
        expect.objectContaining({ workdir: undefined })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Feature ID option
  // -----------------------------------------------------------------------

  describe('feature-id option', () => {
    it('should pass featureId to use case when specified', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix', '--feature-id', 'abc-123']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'abc-123' })
      );
    });

    it('should pass undefined featureId when not specified', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(mockUseCaseExecute).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: undefined })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Result display
  // -----------------------------------------------------------------------

  describe('result display', () => {
    it('should show issue URL on success', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(messages.success).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/shep-ai/cli/issues/42')
      );
    });

    it('should show PR URL when fix succeeds', async () => {
      mockUseCaseExecute.mockResolvedValue({
        ...defaultResult,
        prUrl: 'https://github.com/shep-ai/cli/pull/43',
        flowType: 'maintainer',
      });

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--fix']);

      expect(messages.success).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/shep-ai/cli/pull/43')
      );
    });

    it('should show flow type when PR is created', async () => {
      mockUseCaseExecute.mockResolvedValue({
        ...defaultResult,
        prUrl: 'https://github.com/shep-ai/cli/pull/43',
        flowType: 'contributor',
      });

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--fix']);

      expect(messages.info).toHaveBeenCalledWith(expect.stringContaining('fork (contributor)'));
    });

    it('should show warning when fix attempt fails', async () => {
      mockUseCaseExecute.mockResolvedValue({
        ...defaultResult,
        error: 'Agent timed out',
      });

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--fix']);

      expect(messages.warning).toHaveBeenCalledWith(expect.stringContaining('Agent timed out'));
    });

    it('should show cleanup message when temp dir is cleaned', async () => {
      mockUseCaseExecute.mockResolvedValue({
        ...defaultResult,
        cleanedUp: true,
      });

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(messages.info).toHaveBeenCalledWith(expect.stringContaining('cleaned up'));
    });

    it('should use spinner during use case execution', async () => {
      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(spinner).toHaveBeenCalledWith(
        expect.stringContaining('diagnostics'),
        expect.any(Function)
      );
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should handle use case errors gracefully', async () => {
      mockUseCaseExecute.mockRejectedValue(new Error('Something broke'));

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test', 'problem', '--no-fix']);

      expect(messages.error).toHaveBeenCalledWith('Doctor failed', expect.any(Error));
      expect(process.exitCode).toBe(1);
    });

    it('should handle Ctrl+C gracefully during prompts', async () => {
      vi.mocked(input).mockRejectedValue(new Error('User force closed the prompt'));

      const cmd = createDoctorCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(messages.info).toHaveBeenCalledWith('Cancelled.');
      expect(process.exitCode).toBe(0);
    });
  });
});
