/**
 * Feature Show Command Unit Tests (Phase Timing & Approval Context)
 *
 * Tests for the timing breakdown and approval context additions.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';
import type { Feature, AgentRun, PhaseTiming } from '@/domain/generated/output.js';

const { mockResolve, mockShowExecute, mockFindById, mockFindByRunId } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockShowExecute: vi.fn(),
  mockFindById: vi.fn(),
  mockFindByRunId: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class {
    execute = mockShowExecute;
  },
}));

vi.mock('@/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  getShepHomeDir: () => '/home/test/.shep',
}));

import { createShowCommand } from '../../../../../../src/presentation/cli/commands/feat/show.command.js';

function makeFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-001',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'I want to add a test feature',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    lifecycle: 'Requirements' as any,
    messages: [],
    relatedArtifacts: [],
    agentRunId: 'run-001',
    push: false,
    openPr: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-001',
    agentType: 'claude-code' as any,
    agentName: 'feature-agent',
    status: AgentRunStatus.running,
    prompt: 'Test prompt',
    threadId: 'thread-001',
    featureId: 'feat-001',
    repositoryPath: '/repo',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTiming(overrides?: Partial<PhaseTiming>): PhaseTiming {
  return {
    id: 'timing-001',
    agentRunId: 'run-001',
    phase: 'analyze',
    startedAt: new Date('2025-01-01T10:00:00Z'),
    completedAt: new Date('2025-01-01T10:00:05Z'),
    durationMs: BigInt(5000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('createShowCommand - phase timing & approval', () => {
  let logOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    logOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logOutput.push(args.map(String).join(' '));
    });
    process.exitCode = undefined as any;

    mockResolve.mockImplementation((token: unknown) => {
      if (typeof token === 'string') {
        if (token === 'IAgentRunRepository') return { findById: mockFindById };
        if (token === 'IPhaseTimingRepository') return { findByRunId: mockFindByRunId };
        return {};
      }
      // Class token (ShowFeatureUseCase)
      return { execute: mockShowExecute };
    });
  });

  describe('phase timing breakdown', () => {
    it('should display timing breakdown when timings exist', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.completed });
      const timings: PhaseTiming[] = [
        makeTiming({ phase: 'analyze', durationMs: BigInt(3000) }),
        makeTiming({ phase: 'requirements', durationMs: BigInt(12000) }),
      ];
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue(timings);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/phase|timing/i);
      expect(output).toMatch(/analyz/i);
      expect(output).toMatch(/requirements/i);
    });

    it('should show duration for completed phases', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.completed });
      const timings: PhaseTiming[] = [
        makeTiming({ phase: 'analyze', durationMs: BigInt(5000), completedAt: new Date() }),
      ];
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue(timings);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/5\.0s|5s|5000/);
    });

    it('should show awaiting review indicator for interrupted phase', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.waitingApproval, result: 'node:plan' });
      const timings: PhaseTiming[] = [
        makeTiming({ phase: 'analyze', durationMs: BigInt(3000), completedAt: new Date() }),
        makeTiming({ phase: 'plan', durationMs: undefined, completedAt: undefined }),
      ];
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue(timings);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/awaiting|review|waiting/i);
    });

    it('should show running indicator with elapsed time for in-progress phase', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.running });
      const timings: PhaseTiming[] = [
        makeTiming({ phase: 'analyze', durationMs: BigInt(3000), completedAt: new Date() }),
        makeTiming({
          phase: 'implement',
          durationMs: undefined,
          completedAt: undefined,
          startedAt: new Date(Date.now() - 5000), // Started 5 seconds ago
        }),
      ];
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue(timings);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/running/i);
      expect(output).toMatch(/\d+\.\d+s/); // Should show elapsed time like "5.0s"
    });

    it('should not show timing section when no timings exist', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.running });
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue([]);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/phase timing/i);
    });
  });

  describe('approval context', () => {
    it('should show approval instructions when waiting for approval', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.waitingApproval, result: 'node:plan' });
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue([]);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).toMatch(/approve/i);
      expect(output).toMatch(/reject/i);
    });

    it('should not show approval instructions when not waiting', async () => {
      const feature = makeFeature();
      const run = makeRun({ status: AgentRunStatus.running });
      mockShowExecute.mockResolvedValue(feature);
      mockFindById.mockResolvedValue(run);
      mockFindByRunId.mockResolvedValue([]);

      const cmd = createShowCommand();
      await cmd.parseAsync(['feat-001'], { from: 'user' });

      const output = logOutput.join('\n');
      expect(output).not.toMatch(/shep feat approve/);
    });
  });
});
