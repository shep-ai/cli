import { describe, it, expect } from 'vitest';
import { SdlcLifecycle, TaskState, AgentRunStatus, AgentType } from '@shepai/core/domain/generated';
import type { Feature, AgentRun } from '@shepai/core/domain/generated';
import {
  deriveNodeState,
  deriveProgress,
} from '@/components/common/feature-node/derive-feature-state';

function createMinimalFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'test-id',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    repositoryPath: '/test/repo',
    branch: 'feat/test',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    relatedArtifacts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMinimalAgentRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: 'run-1',
    agentType: AgentType.ClaudeCode,
    agentName: 'feature-agent',
    status: AgentRunStatus.running,
    prompt: 'test prompt',
    threadId: 'thread-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('deriveNodeState', () => {
  describe('with agent run (primary signal)', () => {
    it('returns action-required when agent is waiting_approval', () => {
      const feature = createMinimalFeature({ lifecycle: SdlcLifecycle.Requirements });
      const run = createMinimalAgentRun({ status: AgentRunStatus.waitingApproval });
      expect(deriveNodeState(feature, run)).toBe('action-required');
    });

    it('returns error when agent failed', () => {
      const feature = createMinimalFeature();
      const run = createMinimalAgentRun({ status: AgentRunStatus.failed });
      expect(deriveNodeState(feature, run)).toBe('error');
    });

    it('returns blocked when agent interrupted', () => {
      const feature = createMinimalFeature();
      const run = createMinimalAgentRun({ status: AgentRunStatus.interrupted });
      expect(deriveNodeState(feature, run)).toBe('blocked');
    });

    it('returns blocked when agent cancelled', () => {
      const feature = createMinimalFeature();
      const run = createMinimalAgentRun({ status: AgentRunStatus.cancelled });
      expect(deriveNodeState(feature, run)).toBe('blocked');
    });

    it('returns done when agent completed', () => {
      const feature = createMinimalFeature();
      const run = createMinimalAgentRun({ status: AgentRunStatus.completed });
      expect(deriveNodeState(feature, run)).toBe('done');
    });

    it('returns running when agent is running', () => {
      const feature = createMinimalFeature();
      const run = createMinimalAgentRun({ status: AgentRunStatus.running });
      expect(deriveNodeState(feature, run)).toBe('running');
    });

    it('returns running when agent is pending', () => {
      const feature = createMinimalFeature();
      const run = createMinimalAgentRun({ status: AgentRunStatus.pending });
      expect(deriveNodeState(feature, run)).toBe('running');
    });
  });

  describe('without agent run (fallback to plan tasks)', () => {
    it('returns done for Maintain lifecycle', () => {
      const feature = createMinimalFeature({ lifecycle: SdlcLifecycle.Maintain });
      expect(deriveNodeState(feature)).toBe('done');
    });

    it('returns running when no plan exists', () => {
      const feature = createMinimalFeature();
      expect(deriveNodeState(feature)).toBe('running');
    });

    it('returns action-required when tasks have Review state', () => {
      const feature = createMinimalFeature({
        plan: {
          id: 'plan-1',
          overview: 'Test plan',
          requirements: [],
          artifacts: [],
          tasks: [
            {
              id: 't1',
              state: TaskState.Review,
              dependsOn: [],
              actionItems: [],
              baseBranch: 'main',
              branch: 'feat/t1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          state: 'Ready' as never,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      expect(deriveNodeState(feature)).toBe('action-required');
    });

    it('returns running when tasks have WIP state', () => {
      const feature = createMinimalFeature({
        plan: {
          id: 'plan-1',
          overview: 'Test plan',
          requirements: [],
          artifacts: [],
          tasks: [
            {
              id: 't1',
              state: TaskState.WIP,
              dependsOn: [],
              actionItems: [],
              baseBranch: 'main',
              branch: 'feat/t1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          state: 'Ready' as never,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      expect(deriveNodeState(feature)).toBe('running');
    });

    it('returns done when all tasks are Done', () => {
      const feature = createMinimalFeature({
        plan: {
          id: 'plan-1',
          overview: 'Test plan',
          requirements: [],
          artifacts: [],
          tasks: [
            {
              id: 't1',
              state: TaskState.Done,
              dependsOn: [],
              actionItems: [],
              baseBranch: 'main',
              branch: 'feat/t1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 't2',
              state: TaskState.Done,
              dependsOn: [],
              actionItems: [],
              baseBranch: 'main',
              branch: 'feat/t2',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          state: 'Ready' as never,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      expect(deriveNodeState(feature)).toBe('done');
    });
  });
});

describe('deriveProgress', () => {
  it('returns 0 when no plan', () => {
    const feature = createMinimalFeature();
    expect(deriveProgress(feature)).toBe(0);
  });

  it('returns 0 when plan has no tasks', () => {
    const feature = createMinimalFeature({
      plan: {
        id: 'plan-1',
        overview: 'Test plan',
        requirements: [],
        artifacts: [],
        tasks: [],
        state: 'Ready' as never,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    expect(deriveProgress(feature)).toBe(0);
  });

  it('returns correct percentage from plan tasks', () => {
    const feature = createMinimalFeature({
      plan: {
        id: 'plan-1',
        overview: 'Test plan',
        requirements: [],
        artifacts: [],
        tasks: [
          {
            id: 't1',
            state: TaskState.Done,
            dependsOn: [],
            actionItems: [],
            baseBranch: 'main',
            branch: 'feat/t1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 't2',
            state: TaskState.WIP,
            dependsOn: [],
            actionItems: [],
            baseBranch: 'main',
            branch: 'feat/t2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 't3',
            state: TaskState.Todo,
            dependsOn: [],
            actionItems: [],
            baseBranch: 'main',
            branch: 'feat/t3',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        state: 'Ready' as never,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    // 1 done out of 3 = 33%
    expect(deriveProgress(feature)).toBe(33);
  });

  it('returns 100 for Maintain lifecycle', () => {
    const feature = createMinimalFeature({ lifecycle: SdlcLifecycle.Maintain });
    expect(deriveProgress(feature)).toBe(100);
  });
});
