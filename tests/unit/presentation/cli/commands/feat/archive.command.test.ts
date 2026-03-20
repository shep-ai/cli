/**
 * Feature Archive Command Unit Tests
 *
 * Tests for the archive command with confirmation prompt and --force flag.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockShowExecute, mockArchiveExecute, mockConfirm } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockShowExecute: vi.fn(),
  mockArchiveExecute: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class {
    execute = mockShowExecute;
  },
}));

vi.mock('@/application/use-cases/features/archive-feature.use-case.js', () => ({
  ArchiveFeatureUseCase: class {
    execute = mockArchiveExecute;
  },
}));

import { createArchiveCommand } from '../../../../../../src/presentation/cli/commands/feat/archive.command.js';

const mockFeature = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
  lifecycle: 'Maintain',
};

const mockArchivedFeature = {
  ...mockFeature,
  lifecycle: 'Archived',
  previousLifecycle: 'Maintain',
};

describe('createArchiveCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;

    mockShowExecute.mockResolvedValue(mockFeature);
    mockArchiveExecute.mockResolvedValue(mockArchivedFeature);

    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ShowFeatureUseCase') return { execute: mockShowExecute };
      if (key === 'ArchiveFeatureUseCase') return { execute: mockArchiveExecute };
      return {};
    });
  });

  it('should create a command named "archive"', () => {
    const cmd = createArchiveCommand();
    expect(cmd.name()).toBe('archive');
  });

  it('should archive a feature after confirmation', async () => {
    mockConfirm.mockResolvedValueOnce(true);

    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockShowExecute).toHaveBeenCalledWith('feat-001');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Archive feature'),
      })
    );
    expect(mockArchiveExecute).toHaveBeenCalledWith('feat-001');
  });

  it('should not archive when user declines confirmation', async () => {
    mockConfirm.mockResolvedValueOnce(false);

    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockConfirm).toHaveBeenCalledOnce();
    expect(mockArchiveExecute).not.toHaveBeenCalled();
  });

  it('should skip confirmation with --force flag', async () => {
    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockArchiveExecute).toHaveBeenCalledWith('feat-001');
  });

  it('should skip confirmation with -f flag', async () => {
    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-001', '-f'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockArchiveExecute).toHaveBeenCalledWith('feat-001');
  });

  it('should display success message with feature name', async () => {
    mockConfirm.mockResolvedValueOnce(true);

    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    const allLogCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat();
    const hasFeatureName = allLogCalls.some(
      (arg: unknown) => typeof arg === 'string' && arg.includes('Test Feature')
    );
    expect(hasFeatureName).toBe(true);
  });

  it('should set exit code 1 on failure', async () => {
    mockArchiveExecute.mockRejectedValue(
      new Error('Cannot archive feature: lifecycle is Implementation')
    );
    mockConfirm.mockResolvedValueOnce(true);

    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should set exit code 1 when feature not found', async () => {
    mockShowExecute.mockRejectedValue(new Error('Feature not found: "feat-999"'));

    const cmd = createArchiveCommand();
    await cmd.parseAsync(['feat-999'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });
});
