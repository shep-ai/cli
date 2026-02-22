/**
 * Feature Review Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';
import { ReviewFeatureUseCase } from '@/application/use-cases/agents/review-feature.use-case.js';
import { ApproveAgentRunUseCase } from '@/application/use-cases/agents/approve-agent-run.use-case.js';
import { RejectAgentRunUseCase } from '@/application/use-cases/agents/reject-agent-run.use-case.js';

const mockReviewExecute = vi.fn();
const mockApproveExecute = vi.fn();
const mockRejectExecute = vi.fn();

const { mockResolve } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js', () => ({
  resolveWaitingFeature: vi.fn(),
}));

vi.mock('../../../../../../src/presentation/tui/wizards/prd-review.wizard.js', () => ({
  prdReviewWizard: vi.fn(),
}));

import { createReviewCommand } from '../../../../../../src/presentation/cli/commands/feat/review.command.js';
import { resolveWaitingFeature } from '../../../../../../src/presentation/cli/commands/feat/resolve-waiting-feature.js';
import { prdReviewWizard } from '../../../../../../src/presentation/tui/wizards/prd-review.wizard.js';

const mockResolveWaiting = resolveWaitingFeature as ReturnType<typeof vi.fn>;
const mockWizard = prdReviewWizard as ReturnType<typeof vi.fn>;

const feature = {
  id: 'feat-001-full-uuid',
  name: 'Test Feature',
  branch: 'feat/test-feature',
};

const run = {
  id: 'run-001',
  status: AgentRunStatus.waitingApproval,
  result: 'node:requirements',
};

function setupResolve() {
  mockResolve.mockImplementation((token: unknown) => {
    if (token === 'IFeatureRepository') return {};
    if (token === 'IAgentRunRepository') return {};
    if (token === ReviewFeatureUseCase) return { execute: mockReviewExecute };
    if (token === ApproveAgentRunUseCase) return { execute: mockApproveExecute };
    if (token === RejectAgentRunUseCase) return { execute: mockRejectExecute };
    return {};
  });
}

describe('createReviewCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;
    setupResolve();
  });

  it('should create a command named "review"', () => {
    const cmd = createReviewCommand();
    expect(cmd.name()).toBe('review');
  });

  it('should set exitCode 1 on error', async () => {
    mockResolveWaiting.mockRejectedValue(new Error('No features waiting'));

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should pass explicit feature ID to resolver', async () => {
    mockResolveWaiting.mockResolvedValue({ feature, run });
    mockReviewExecute.mockResolvedValue({ success: false, reason: 'No questions' });

    const cmd = createReviewCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockResolveWaiting).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'feat-001' })
    );
  });

  it('should set exitCode 1 and skip wizard when review returns no questions', async () => {
    mockResolveWaiting.mockResolvedValue({ feature, run });
    mockReviewExecute.mockResolvedValue({ success: false, reason: 'No questions' });

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockWizard).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('should launch wizard and approve on success', async () => {
    mockResolveWaiting.mockResolvedValue({ feature, run });
    mockReviewExecute.mockResolvedValue({
      success: true,
      questions: [{ question: 'Q1', options: [], selectedOption: 'A' }],
      featureName: 'Test Feature',
      phase: 'requirements',
      runId: 'run-001',
      repoPath: '/repo',
    });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'OK' });
    mockWizard.mockResolvedValue({
      action: 'approve',
      changedSelections: [],
    });

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockWizard).toHaveBeenCalled();
    expect(mockApproveExecute).toHaveBeenCalledWith('run-001', undefined);
    expect(process.exitCode).toBeUndefined();
  });

  it('should launch wizard and reject with feedback', async () => {
    mockResolveWaiting.mockResolvedValue({ feature, run });
    mockReviewExecute.mockResolvedValue({
      success: true,
      questions: [{ question: 'Q1', options: [], selectedOption: 'A' }],
      featureName: 'Test Feature',
      phase: 'requirements',
      runId: 'run-001',
      repoPath: '/repo',
    });
    mockRejectExecute.mockResolvedValue({
      rejected: true,
      reason: 'Rejected',
      iteration: 2,
      iterationWarning: false,
    });
    mockWizard.mockResolvedValue({
      action: 'reject',
      changedSelections: [],
      feedback: 'Need caching strategy',
    });

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockRejectExecute).toHaveBeenCalledWith('run-001', 'Need caching strategy');
    expect(process.exitCode).toBeUndefined();
  });

  it('should pass changedSelections as payload when approving with changes', async () => {
    mockResolveWaiting.mockResolvedValue({ feature, run });
    mockReviewExecute.mockResolvedValue({
      success: true,
      questions: [{ question: 'Q1', options: [], selectedOption: 'A' }],
      featureName: 'Test Feature',
      phase: 'requirements',
      runId: 'run-001',
      repoPath: '/repo',
    });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'OK' });

    const changes = [{ questionId: 'Q1', selectedOption: 'B' }];
    mockWizard.mockResolvedValue({
      action: 'approve',
      changedSelections: changes,
    });

    const cmd = createReviewCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockApproveExecute).toHaveBeenCalledWith('run-001', {
      approved: true,
      changedSelections: changes,
    });
  });
});
