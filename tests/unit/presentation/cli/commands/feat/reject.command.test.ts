/**
 * Feature Reject Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';

const { mockResolve, mockRejectExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockRejectExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js', () => ({
  resolveWaitingFeature: vi.fn(),
}));

vi.mock('@/application/use-cases/agents/reject-agent-run.use-case.js', () => ({
  RejectAgentRunUseCase: class {
    execute = mockRejectExecute;
  },
}));

import { createRejectCommand } from '../../../../../../src/presentation/cli/commands/feat/reject.command.js';
import { resolveWaitingFeature } from '../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js';

describe('createRejectCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;
    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'RejectAgentRunUseCase') return { execute: mockRejectExecute };
      return {};
    });
  });

  it('should create a command named "reject"', () => {
    const cmd = createRejectCommand();
    expect(cmd.name()).toBe('reject');
  });

  it('should reject a waiting feature with --reason and show iterating message', async () => {
    const feature = { id: 'feat-001', name: 'Test Feature', branch: 'feat/test' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockRejectExecute.mockResolvedValue({
      rejected: true,
      reason: 'Rejected and iterating',
      iteration: 1,
      iterationWarning: false,
    });

    const cmd = createRejectCommand();
    await cmd.parseAsync(['--reason', 'Needs more detail'], { from: 'user' });

    expect(mockRejectExecute).toHaveBeenCalledWith('run-001', 'Needs more detail');
    expect(process.exitCode).toBeUndefined();
  });

  it('should pass --reason option to use case', async () => {
    const feature = { id: 'feat-001', name: 'F', branch: 'feat/f' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockRejectExecute.mockResolvedValue({
      rejected: true,
      reason: 'OK',
      iteration: 2,
      iterationWarning: false,
    });

    const cmd = createRejectCommand();
    await cmd.parseAsync(['--reason', 'Plan needs more detail'], { from: 'user' });

    expect(mockRejectExecute).toHaveBeenCalledWith('run-001', 'Plan needs more detail');
  });

  it('should set exitCode 1 when rejection fails', async () => {
    const feature = { id: 'feat-001', name: 'F', branch: 'feat/f' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockRejectExecute.mockResolvedValue({ rejected: false, reason: 'Not waiting' });

    const cmd = createRejectCommand();
    await cmd.parseAsync(['--reason', 'some reason'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should pass explicit feature ID to resolver', async () => {
    const feature = { id: 'feat-001', name: 'F', branch: 'feat/f' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockRejectExecute.mockResolvedValue({
      rejected: true,
      reason: 'OK',
      iteration: 1,
      iterationWarning: false,
    });

    const cmd = createRejectCommand();
    await cmd.parseAsync(['feat-001', '--reason', 'fix it'], { from: 'user' });

    expect(resolveWaitingFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'feat-001' })
    );
  });

  it('should require --reason flag (Commander requiredOption)', () => {
    const cmd = createRejectCommand();
    const reasonOpt = cmd.options.find((o) => o.long === '--reason');
    expect(reasonOpt).toBeDefined();
    expect(reasonOpt!.mandatory).toBe(true);
  });
});
