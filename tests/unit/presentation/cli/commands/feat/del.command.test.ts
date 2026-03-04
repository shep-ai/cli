/**
 * Feature Delete Command Unit Tests
 *
 * Tests for the cleanup option flag and prompt behavior.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockShowExecute, mockDeleteExecute, mockConfirm } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockShowExecute: vi.fn(),
  mockDeleteExecute: vi.fn(),
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

vi.mock('@/application/use-cases/features/delete-feature.use-case.js', () => ({
  DeleteFeatureUseCase: class {
    execute = mockDeleteExecute;
  },
}));

import { createDelCommand } from '../../../../../../src/presentation/cli/commands/feat/del.command.js';

const mockFeature = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
};

describe('createDelCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;

    mockShowExecute.mockResolvedValue(mockFeature);
    mockDeleteExecute.mockResolvedValue(mockFeature);

    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ShowFeatureUseCase') return { execute: mockShowExecute };
      if (key === 'DeleteFeatureUseCase') return { execute: mockDeleteExecute };
      return {};
    });
  });

  it('should create a command named "del"', () => {
    const cmd = createDelCommand();
    expect(cmd.name()).toBe('del');
  });

  it('should pass cleanup=true when user confirms cleanup (default)', async () => {
    // First confirm = delete, second confirm = cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should pass cleanup=false when user declines cleanup prompt', async () => {
    // First confirm = delete, second confirm = decline cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });

  it('should pass cleanup=true with --force (skips all prompts)', async () => {
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should pass cleanup=false with --force --no-cleanup', async () => {
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force', '--no-cleanup'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });

  it('should pass cleanup=false with --no-cleanup (skips cleanup prompt)', async () => {
    // Only one confirm prompt (delete) since cleanup prompt is skipped
    mockConfirm.mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--no-cleanup'], { from: 'user' });

    // Only one confirm call (delete), no cleanup prompt
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });
});
