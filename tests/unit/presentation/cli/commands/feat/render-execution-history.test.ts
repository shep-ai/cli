/**
 * Render Execution History Tests
 *
 * Tests the new hierarchical execution history rendering
 * that replaces the flat PhaseTiming rendering.
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import { describe, it, expect } from 'vitest';
import { renderExecutionHistory } from '@/presentation/cli/commands/feat/show.command.js';
import { ExecutionStepStatus, ExecutionStepType } from '@/domain/generated/output.js';
import type {
  ExecutionHistoryDTO,
  ExecutionStepDTO,
} from '@/application/dtos/execution-history.dto.js';

function makeStep(overrides: Partial<ExecutionStepDTO> = {}): ExecutionStepDTO {
  return {
    id: 'step-1',
    name: 'analyze',
    type: ExecutionStepType.phase,
    status: ExecutionStepStatus.completed,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:00:55.9Z'),
    durationMs: 55900,
    children: [],
    ...overrides,
  };
}

function makeDTO(overrides: Partial<ExecutionHistoryDTO> = {}): ExecutionHistoryDTO {
  return {
    agentRunId: 'run-001',
    steps: [],
    totalDurationMs: 0,
    totalWaitMs: 0,
    ...overrides,
  };
}

describe('renderExecutionHistory', () => {
  it('should render a simple phase with bar chart', () => {
    const dto = makeDTO({
      steps: [makeStep({ name: 'analyze', durationMs: 55900 })],
      totalDurationMs: 55900,
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('Analyzing'))).toBe(true);
    expect(lines.some((l) => l.includes('55.9s'))).toBe(true);
  });

  it('should render sub-steps with indentation', () => {
    const dto = makeDTO({
      steps: [
        makeStep({
          name: 'merge',
          durationMs: 186300,
          children: [
            makeStep({
              id: 'c1',
              name: 'commit',
              type: ExecutionStepType.subStep,
              durationMs: 2100,
            }),
            makeStep({
              id: 'c2',
              name: 'push',
              type: ExecutionStepType.subStep,
              durationMs: 3400,
            }),
          ],
        }),
      ],
      totalDurationMs: 186300,
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('Merging'))).toBe(true);
    expect(lines.some((l) => l.includes('\u21b3 commit'))).toBe(true);
    expect(lines.some((l) => l.includes('\u21b3 push'))).toBe(true);
  });

  it('should render approval wait with input metadata', () => {
    const dto = makeDTO({
      steps: [
        makeStep({
          name: 'requirements',
          durationMs: 78000,
          children: [
            makeStep({
              id: 'w1',
              name: 'approval',
              type: ExecutionStepType.approvalWait,
              durationMs: 32100,
              outcome: 'rejected',
              metadata: { input: 'add more detail on auth flow' },
            }),
          ],
        }),
      ],
      totalDurationMs: 78000,
      totalWaitMs: 32100,
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('\u21b3 approval'))).toBe(true);
    expect(lines.some((l) => l.includes('rejected'))).toBe(true);
  });

  it('should render running step with elapsed time', () => {
    const startTime = new Date(Date.now() - 5000);
    const dto = makeDTO({
      steps: [
        makeStep({
          name: 'implement',
          status: ExecutionStepStatus.running,
          startedAt: startTime,
          completedAt: undefined,
          durationMs: 5000,
        }),
      ],
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('(running)'))).toBe(true);
  });

  it('should render lifecycle events as markers', () => {
    const dto = makeDTO({
      steps: [
        makeStep({
          name: 'run:started',
          type: ExecutionStepType.lifecycleEvent,
          durationMs: 0,
        }),
        makeStep({
          id: 's2',
          name: 'analyze',
          durationMs: 55900,
        }),
      ],
      totalDurationMs: 55900,
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('started'))).toBe(true);
    expect(lines.some((l) => l.includes('Analyzing'))).toBe(true);
  });

  it('should render total summary', () => {
    const dto = makeDTO({
      steps: [
        makeStep({ name: 'analyze', durationMs: 55900 }),
        makeStep({ id: 's2', name: 'requirements', durationMs: 78000 }),
      ],
      totalDurationMs: 133900,
      totalWaitMs: 32100,
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('Total execution'))).toBe(true);
    expect(lines.some((l) => l.includes('Total wait'))).toBe(true);
  });

  it('should render CI fix sub-steps with outcome', () => {
    const dto = makeDTO({
      steps: [
        makeStep({
          name: 'merge',
          durationMs: 186300,
          children: [
            makeStep({
              id: 'w1',
              name: 'watch-ci',
              type: ExecutionStepType.subStep,
              durationMs: 45000,
              outcome: 'failed',
            }),
            makeStep({
              id: 'f1',
              name: 'fix-attempt-1',
              type: ExecutionStepType.subStep,
              durationMs: 32100,
              outcome: 'fixed',
            }),
          ],
        }),
      ],
      totalDurationMs: 186300,
    });

    const lines = renderExecutionHistory(dto);

    expect(lines.some((l) => l.includes('watch-ci'))).toBe(true);
    expect(lines.some((l) => l.includes('fix-attempt-1'))).toBe(true);
  });

  it('should return empty array for empty DTO', () => {
    const dto = makeDTO();
    const lines = renderExecutionHistory(dto);
    expect(lines).toEqual([]);
  });
});
