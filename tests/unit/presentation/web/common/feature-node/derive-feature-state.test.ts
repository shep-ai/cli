import { describe, it, expect } from 'vitest';
import { SdlcLifecycle, TaskState } from '@shepai/core/domain/generated';
import type { Feature } from '@shepai/core/domain/generated';
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

describe('deriveNodeState', () => {
  it('returns done for Maintain lifecycle', () => {
    const feature = createMinimalFeature({ lifecycle: SdlcLifecycle.Maintain });
    expect(deriveNodeState(feature)).toBe('done');
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

  it('returns running when no plan exists', () => {
    const feature = createMinimalFeature();
    expect(deriveNodeState(feature)).toBe('running');
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
