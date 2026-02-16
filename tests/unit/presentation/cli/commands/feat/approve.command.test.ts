/**
 * Feature Approve Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';

const { mockResolve, mockApproveExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockApproveExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js', () => ({
  resolveWaitingFeature: vi.fn(),
}));

vi.mock('@/application/use-cases/agents/approve-agent-run.use-case.js', () => ({
  ApproveAgentRunUseCase: class {
    execute = mockApproveExecute;
  },
}));

import { createApproveCommand } from '../../../../../../src/presentation/cli/commands/feat/approve.command.js';
import { resolveWaitingFeature } from '../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js';

describe('createApproveCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;
    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ApproveAgentRunUseCase') return { execute: mockApproveExecute };
      return {};
    });
  });

  it('should create a command named "approve"', () => {
    const cmd = createApproveCommand();
    expect(cmd.name()).toBe('approve');
  });

  it('should approve a waiting feature and show success', async () => {
    const feature = { id: 'feat-001', name: 'Test Feature', branch: 'feat/test' };
    const run = {
      id: 'run-001',
      status: AgentRunStatus.waitingApproval,
      result: 'node:requirements',
    };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const cmd = createApproveCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockApproveExecute).toHaveBeenCalledWith('run-001');
    expect(process.exitCode).toBeUndefined();
  });

  it('should set exitCode 1 when approval fails', async () => {
    const feature = { id: 'feat-001', name: 'F', branch: 'feat/f' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockApproveExecute.mockResolvedValue({ approved: false, reason: 'Already running' });

    const cmd = createApproveCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should pass explicit feature ID to resolver', async () => {
    const feature = { id: 'feat-001', name: 'F', branch: 'feat/f' };
    const run = { id: 'run-001', status: AgentRunStatus.waitingApproval, result: 'node:plan' };
    (resolveWaitingFeature as ReturnType<typeof vi.fn>).mockResolvedValue({ feature, run });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'OK' });

    const cmd = createApproveCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(resolveWaitingFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'feat-001' })
    );
  });
});
