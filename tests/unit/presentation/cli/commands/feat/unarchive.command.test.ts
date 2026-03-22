/**
 * Feature Unarchive Command Unit Tests
 *
 * Tests for the unarchive command which restores an archived feature
 * to its previous lifecycle state.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockShowExecute, mockUnarchiveExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockShowExecute: vi.fn(),
  mockUnarchiveExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class {
    execute = mockShowExecute;
  },
}));

vi.mock('@/application/use-cases/features/unarchive-feature.use-case.js', () => ({
  UnarchiveFeatureUseCase: class {
    execute = mockUnarchiveExecute;
  },
}));

import { createUnarchiveCommand } from '../../../../../../src/presentation/cli/commands/feat/unarchive.command.js';

const mockArchivedFeature = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
  lifecycle: 'Archived',
  previousLifecycle: 'Maintain',
};

const mockRestoredFeature = {
  ...mockArchivedFeature,
  lifecycle: 'Maintain',
  previousLifecycle: undefined,
};

describe('createUnarchiveCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;

    mockShowExecute.mockResolvedValue(mockArchivedFeature);
    mockUnarchiveExecute.mockResolvedValue(mockRestoredFeature);

    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ShowFeatureUseCase') return { execute: mockShowExecute };
      if (key === 'UnarchiveFeatureUseCase') return { execute: mockUnarchiveExecute };
      return {};
    });
  });

  it('should create a command named "unarchive"', () => {
    const cmd = createUnarchiveCommand();
    expect(cmd.name()).toBe('unarchive');
  });

  it('should unarchive a feature without confirmation', async () => {
    const cmd = createUnarchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockShowExecute).toHaveBeenCalledWith('feat-001');
    expect(mockUnarchiveExecute).toHaveBeenCalledWith('feat-001');
  });

  it('should display success message with feature name and restored lifecycle', async () => {
    const cmd = createUnarchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    const allLogCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat();
    const hasFeatureName = allLogCalls.some(
      (arg: unknown) => typeof arg === 'string' && arg.includes('Test Feature')
    );
    const hasRestoredLifecycle = allLogCalls.some(
      (arg: unknown) => typeof arg === 'string' && arg.includes('Maintain')
    );
    expect(hasFeatureName).toBe(true);
    expect(hasRestoredLifecycle).toBe(true);
  });

  it('should set exit code 1 on failure for non-archived feature', async () => {
    mockUnarchiveExecute.mockRejectedValue(
      new Error('Cannot unarchive feature: lifecycle is Implementation')
    );

    const cmd = createUnarchiveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should set exit code 1 when feature not found', async () => {
    mockShowExecute.mockRejectedValue(new Error('Feature not found: "feat-999"'));

    const cmd = createUnarchiveCommand();
    await cmd.parseAsync(['feat-999'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });
});
