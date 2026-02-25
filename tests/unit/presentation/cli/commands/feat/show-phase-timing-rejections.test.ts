/**
 * Phase Timing Rejection Display Tests
 *
 * Tests that renderPhaseTimings correctly associates rejection feedback
 * with the phase that was rejected, not just the sequential position.
 *
 * This validates Bug 2: plan iterations should appear under Planning,
 * not under Requirements.
 */

import { describe, it, expect, vi } from 'vitest';
import type { PhaseTiming, AgentRun, RejectionFeedbackEntry } from '@/domain/generated/output.js';
import { AgentRunStatus } from '@/domain/generated/output.js';

// Mock chalk to return raw strings for easier assertion
vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const fn = Object.assign(passthrough, {
    hex: () => passthrough,
    rgb: () => passthrough,
    bold: Object.assign(passthrough, { hex: () => passthrough }),
    dim: passthrough,
    red: passthrough,
    green: passthrough,
    yellow: passthrough,
    blue: passthrough,
    cyan: passthrough,
    gray: passthrough,
    white: passthrough,
    magenta: passthrough,
    bgRed: passthrough,
    bgGreen: passthrough,
  });
  return { default: fn };
});

vi.mock('@/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  getShepHomeDir: () => '/home/test/.shep',
}));

vi.mock('@/infrastructure/services/ide-launchers/compute-worktree-path.js', () => ({
  computeWorktreePath: (repo: string, branch: string) => `${repo}/.shep/wt/${branch}`,
}));

import { renderPhaseTimings } from '../../../../../../src/presentation/cli/commands/feat/show.command.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const RUN_ID = 'run-001';

function makeTiming(overrides: Partial<PhaseTiming> & { phase: string }): PhaseTiming {
  const now = new Date();
  return {
    id: `timing-${overrides.phase}`,
    agentRunId: RUN_ID,
    startedAt: now,
    completedAt: new Date(now.getTime() + 5000),
    durationMs: BigInt(5000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: RUN_ID,
    agentType: 'claude-code' as any,
    agentName: 'feature-agent',
    status: AgentRunStatus.completed,
    prompt: '',
    threadId: 'thread-001',
    featureId: 'feat-001',
    repositoryPath: '/repo',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRejection(iteration: number, message: string, phase?: string): RejectionFeedbackEntry {
  return {
    iteration,
    message,
    phase,
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('renderPhaseTimings - rejection display under correct phase', () => {
  it('should show PRD rejection after requirements approval wait', () => {
    const timings: PhaseTiming[] = [
      makeTiming({ phase: 'analyze' }),
      makeTiming({ phase: 'requirements', approvalWaitMs: BigInt(10000) }),
      makeTiming({ phase: 'requirements:2', approvalWaitMs: BigInt(5000) }),
      makeTiming({ phase: 'research' }),
      makeTiming({ phase: 'plan' }),
    ];

    const rejections: RejectionFeedbackEntry[] = [
      makeRejection(1, 'add more requirements', 'requirements'),
    ];

    const lines = renderPhaseTimings(timings, makeRun(), rejections);
    const output = lines.join('\n');

    // Rejection should appear after requirements approval wait
    const reqIdx = output.indexOf('Requirements');
    const rejIdx = output.indexOf('rejected: "add more requirements"');
    const researchIdx = output.indexOf('Researching');

    expect(rejIdx).toBeGreaterThan(reqIdx);
    expect(rejIdx).toBeLessThan(researchIdx);
  });

  it('should show plan rejection after planning approval wait, not under requirements', () => {
    const timings: PhaseTiming[] = [
      makeTiming({ phase: 'analyze' }),
      makeTiming({ phase: 'requirements', approvalWaitMs: BigInt(10000) }),
      makeTiming({ phase: 'research' }),
      makeTiming({ phase: 'plan', approvalWaitMs: BigInt(20000) }),
      makeTiming({ phase: 'plan:2' }),
    ];

    const rejections: RejectionFeedbackEntry[] = [
      makeRejection(1, 'fix the plan architecture', 'plan'),
    ];

    const lines = renderPhaseTimings(timings, makeRun(), rejections);
    const output = lines.join('\n');

    // Plan rejection should NOT appear under requirements
    const reqIdx = output.indexOf('Requirements');
    const researchIdx = output.indexOf('Researching');
    const planIdx = output.indexOf('Planning');
    const rejIdx = output.indexOf('rejected: "fix the plan architecture"');

    expect(rejIdx).toBeGreaterThan(planIdx);
    expect(rejIdx).toBeGreaterThan(researchIdx);
    // Should not be between requirements and research
    expect(!(rejIdx > reqIdx && rejIdx < researchIdx)).toBe(true);
  });

  it('should correctly separate PRD and plan rejections in mixed scenario', () => {
    // Scenario: 2 PRD rejections, then 2 plan rejections
    const timings: PhaseTiming[] = [
      makeTiming({ phase: 'analyze' }),
      makeTiming({ phase: 'requirements', approvalWaitMs: BigInt(10000) }),
      makeTiming({ phase: 'requirements:2', approvalWaitMs: BigInt(8000) }),
      makeTiming({ phase: 'requirements:3' }), // final approved version
      makeTiming({ phase: 'research' }),
      makeTiming({ phase: 'plan', approvalWaitMs: BigInt(15000) }),
      makeTiming({ phase: 'plan:2', approvalWaitMs: BigInt(12000) }),
      makeTiming({ phase: 'plan:3' }), // final approved version
    ];

    const rejections: RejectionFeedbackEntry[] = [
      makeRejection(1, 'add functional reqs', 'requirements'),
      makeRejection(2, 'add NFRs', 'requirements'),
      makeRejection(3, 'break tasks smaller', 'plan'),
      makeRejection(4, 'add TDD cycles', 'plan'),
    ];

    const lines = renderPhaseTimings(timings, makeRun(), rejections);
    const output = lines.join('\n');

    // PRD rejections should appear under requirements section
    const prdRej1Idx = output.indexOf('rejected: "add functional reqs"');
    const prdRej2Idx = output.indexOf('rejected: "add NFRs"');
    const researchIdx = output.indexOf('Researching');
    const planRej1Idx = output.indexOf('rejected: "break tasks smaller"');
    const planRej2Idx = output.indexOf('rejected: "add TDD cycles"');

    // PRD rejections before research
    expect(prdRej1Idx).toBeLessThan(researchIdx);
    expect(prdRej2Idx).toBeLessThan(researchIdx);

    // Plan rejections after research
    expect(planRej1Idx).toBeGreaterThan(researchIdx);
    expect(planRej2Idx).toBeGreaterThan(researchIdx);
  });

  it('should handle 10 rejections per phase with correct placement', () => {
    const timings: PhaseTiming[] = [makeTiming({ phase: 'analyze' })];

    // 10 PRD iterations (first has approval wait = rejected, last is approved)
    for (let i = 1; i <= 10; i++) {
      const phase = i === 1 ? 'requirements' : `requirements:${i}`;
      timings.push(
        makeTiming({
          phase,
          approvalWaitMs: i < 10 ? BigInt(5000) : undefined, // last one not rejected
        })
      );
    }

    timings.push(makeTiming({ phase: 'research' }));

    // 10 plan iterations
    for (let i = 1; i <= 10; i++) {
      const phase = i === 1 ? 'plan' : `plan:${i}`;
      timings.push(
        makeTiming({
          phase,
          approvalWaitMs: i < 10 ? BigInt(5000) : undefined,
        })
      );
    }

    // 9 PRD rejections + 9 plan rejections
    const rejections: RejectionFeedbackEntry[] = [];
    for (let i = 1; i <= 9; i++) {
      rejections.push(makeRejection(i, `PRD rejection ${i}`, 'requirements'));
    }
    for (let i = 1; i <= 9; i++) {
      rejections.push(makeRejection(9 + i, `Plan rejection ${i}`, 'plan'));
    }

    const lines = renderPhaseTimings(timings, makeRun(), rejections);
    const output = lines.join('\n');

    // All PRD rejections should appear before research
    const researchIdx = output.indexOf('Researching');
    for (let i = 1; i <= 9; i++) {
      const rejIdx = output.indexOf(`PRD rejection ${i}`);
      expect(rejIdx).toBeGreaterThan(-1);
      expect(rejIdx).toBeLessThan(researchIdx);
    }

    // All plan rejections should appear after research
    for (let i = 1; i <= 9; i++) {
      const rejIdx = output.indexOf(`Plan rejection ${i}`);
      expect(rejIdx).toBeGreaterThan(-1);
      expect(rejIdx).toBeGreaterThan(researchIdx);
    }
  });

  it('should handle legacy rejections without phase field (backward compatibility)', () => {
    const timings: PhaseTiming[] = [
      makeTiming({ phase: 'analyze' }),
      makeTiming({ phase: 'requirements', approvalWaitMs: BigInt(10000) }),
      makeTiming({ phase: 'requirements:2' }),
    ];

    // Legacy rejection entry (no phase field)
    const rejections: RejectionFeedbackEntry[] = [
      makeRejection(1, 'old style feedback', undefined),
    ];

    const lines = renderPhaseTimings(timings, makeRun(), rejections);
    const output = lines.join('\n');

    // Legacy feedback should still appear (falls back to sequential matching)
    expect(output).toContain('rejected: "old style feedback"');
  });

  it('should not show rejection for phases without approvalWaitMs', () => {
    const timings: PhaseTiming[] = [
      makeTiming({ phase: 'analyze' }), // no approval wait
      makeTiming({ phase: 'requirements' }), // no approval wait
    ];

    const rejections: RejectionFeedbackEntry[] = [
      makeRejection(1, 'orphan feedback', 'requirements'),
    ];

    const lines = renderPhaseTimings(timings, makeRun(), rejections);
    const output = lines.join('\n');

    // No rejection should appear since no phase has approvalWaitMs
    expect(output).not.toContain('rejected');
  });
});
