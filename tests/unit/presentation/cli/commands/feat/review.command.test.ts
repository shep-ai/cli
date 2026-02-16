/**
 * Feature Review Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';

const { mockResolve } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js', () => ({
  resolveWaitingFeature: vi.fn(),
}));

import { createReviewCommand } from '../../../../../../src/presentation/cli/commands/feat/review.command.js';
import { resolveWaitingFeature } from '../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js';

describe('createReviewCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;
  });

  it('should create a command named "review"', () => {
    const cmd = createReviewCommand();
    expect(cmd.name()).toBe('review');
  });

  it('should display waiting feature info on success', async () => {
    const feature = {
      id: 'feat-001-full-uuid',
      name: 'Test Feature',
      branch: 'feat/test-feature',
      specPath: '/specs/001-test',
    };
    const run = {
      id: 'run-001',
      status: AgentRunStatus.waitingApproval,
      result: 'node:plan',
    };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(resolveWaitingFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: undefined })
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('should set exitCode 1 on error', async () => {
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('No features waiting')
    );

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should pass explicit feature ID to resolver', async () => {
    const feature = { id: 'feat-001', name: 'F', branch: 'feat/f' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });

    const cmd = createReviewCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(resolveWaitingFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'feat-001' })
    );
  });
});
