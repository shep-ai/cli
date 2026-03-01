import { describe, it, expect } from 'vitest';
import { buildBoardData, BOARD_COLUMNS, lifecycleToColumnId } from '@/lib/build-board-data';
import { SdlcLifecycle, PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import type { Feature } from '@shepai/core/domain/generated/output';
import type { FeatureWithRun } from '@/app/build-graph-nodes';
import type { BoardColumnId } from '@/lib/build-board-data';

const makeFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    id: 'feat-1',
    name: 'My Feature',
    userQuery: 'add a feature',
    slug: 'my-feature',
    description: 'A test feature',
    repositoryPath: '/my/repo',
    branch: 'feat/my-feature',
    lifecycle: SdlcLifecycle.Requirements,
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Feature;

const wrap = (feature: Feature, run: FeatureWithRun['run'] = null): FeatureWithRun => ({
  feature,
  run,
});

describe('BOARD_COLUMNS', () => {
  it('defines exactly 5 columns', () => {
    expect(BOARD_COLUMNS).toHaveLength(5);
  });

  it('has the correct column ids in order', () => {
    const ids = BOARD_COLUMNS.map((c) => c.id);
    expect(ids).toEqual(['backlog', 'requirements', 'implementation', 'review', 'done']);
  });

  it('maps Started to backlog', () => {
    const backlog = BOARD_COLUMNS.find((c) => c.id === 'backlog');
    expect(backlog?.lifecycles).toContain(SdlcLifecycle.Started);
  });

  it('maps Analyze, Requirements, Research to requirements', () => {
    const requirements = BOARD_COLUMNS.find((c) => c.id === 'requirements');
    expect(requirements?.lifecycles).toContain(SdlcLifecycle.Analyze);
    expect(requirements?.lifecycles).toContain(SdlcLifecycle.Requirements);
    expect(requirements?.lifecycles).toContain(SdlcLifecycle.Research);
  });

  it('maps Planning, Implementation to implementation', () => {
    const implementation = BOARD_COLUMNS.find((c) => c.id === 'implementation');
    expect(implementation?.lifecycles).toContain(SdlcLifecycle.Planning);
    expect(implementation?.lifecycles).toContain(SdlcLifecycle.Implementation);
  });

  it('maps Review to review', () => {
    const review = BOARD_COLUMNS.find((c) => c.id === 'review');
    expect(review?.lifecycles).toContain(SdlcLifecycle.Review);
  });

  it('maps Maintain to done', () => {
    const done = BOARD_COLUMNS.find((c) => c.id === 'done');
    expect(done?.lifecycles).toContain(SdlcLifecycle.Maintain);
  });
});

describe('lifecycleToColumnId', () => {
  it('maps Started to backlog', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Started)).toBe('backlog');
  });

  it('maps Analyze to requirements', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Analyze)).toBe('requirements');
  });

  it('maps Requirements to requirements', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Requirements)).toBe('requirements');
  });

  it('maps Research to requirements', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Research)).toBe('requirements');
  });

  it('maps Planning to implementation', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Planning)).toBe('implementation');
  });

  it('maps Implementation to implementation', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Implementation)).toBe('implementation');
  });

  it('maps Review to review', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Review)).toBe('review');
  });

  it('maps Maintain to done', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Maintain)).toBe('done');
  });

  it('maps Blocked to backlog as fallback', () => {
    expect(lifecycleToColumnId(SdlcLifecycle.Blocked)).toBe('backlog');
  });
});

describe('buildBoardData', () => {
  it('returns all 5 columns when given empty input', () => {
    const result = buildBoardData([]);
    expect(result.size).toBe(5);

    const expectedColumns: BoardColumnId[] = [
      'backlog',
      'requirements',
      'implementation',
      'review',
      'done',
    ];
    for (const col of expectedColumns) {
      expect(result.has(col)).toBe(true);
      expect(result.get(col)).toEqual([]);
    }
  });

  it('places a feature with SdlcLifecycle.Started in backlog column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Started });
    const result = buildBoardData([wrap(feature)]);

    const backlog = result.get('backlog')!;
    expect(backlog).toHaveLength(1);
    expect(backlog[0].featureId).toBe('feat-1');
    expect(backlog[0].name).toBe('My Feature');
  });

  it('places a feature with SdlcLifecycle.Analyze in requirements column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Analyze });
    const result = buildBoardData([wrap(feature)]);

    const requirements = result.get('requirements')!;
    expect(requirements).toHaveLength(1);
    expect(requirements[0].featureId).toBe('feat-1');
  });

  it('places a feature with SdlcLifecycle.Requirements in requirements column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Requirements });
    const result = buildBoardData([wrap(feature)]);

    expect(result.get('requirements')!).toHaveLength(1);
  });

  it('places a feature with SdlcLifecycle.Research in requirements column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Research });
    const result = buildBoardData([wrap(feature)]);

    expect(result.get('requirements')!).toHaveLength(1);
  });

  it('places a feature with SdlcLifecycle.Planning in implementation column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Planning });
    const result = buildBoardData([wrap(feature)]);

    expect(result.get('implementation')!).toHaveLength(1);
  });

  it('places a feature with SdlcLifecycle.Implementation in implementation column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Implementation });
    const result = buildBoardData([wrap(feature)]);

    expect(result.get('implementation')!).toHaveLength(1);
  });

  it('places a feature with SdlcLifecycle.Review in review column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Review });
    const result = buildBoardData([wrap(feature)]);

    expect(result.get('review')!).toHaveLength(1);
  });

  it('places a feature with SdlcLifecycle.Maintain in done column', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Maintain });
    const result = buildBoardData([wrap(feature)]);

    expect(result.get('done')!).toHaveLength(1);
  });

  it('places a blocked feature in backlog (fallback) with blockedBy populated', () => {
    const parent = makeFeature({
      id: 'parent-1',
      name: 'Parent Feature',
      lifecycle: SdlcLifecycle.Implementation,
    });
    const blocked = makeFeature({
      id: 'blocked-1',
      name: 'Blocked Feature',
      lifecycle: SdlcLifecycle.Blocked,
      parentId: 'parent-1',
    });
    const result = buildBoardData([wrap(parent), wrap(blocked)]);

    // Blocked feature goes to backlog (fallback for Blocked lifecycle)
    const backlog = result.get('backlog')!;
    expect(backlog).toHaveLength(1);
    expect(backlog[0].featureId).toBe('blocked-1');
    expect(backlog[0].blockedBy).toBe('Parent Feature');
    expect(backlog[0].state).toBe('blocked');
  });

  it('groups features correctly across all 5 columns with mixed lifecycles', () => {
    const features: FeatureWithRun[] = [
      wrap(makeFeature({ id: 'f1', lifecycle: SdlcLifecycle.Started })),
      wrap(makeFeature({ id: 'f2', lifecycle: SdlcLifecycle.Analyze })),
      wrap(makeFeature({ id: 'f3', lifecycle: SdlcLifecycle.Requirements })),
      wrap(makeFeature({ id: 'f4', lifecycle: SdlcLifecycle.Research })),
      wrap(makeFeature({ id: 'f5', lifecycle: SdlcLifecycle.Planning })),
      wrap(makeFeature({ id: 'f6', lifecycle: SdlcLifecycle.Implementation })),
      wrap(makeFeature({ id: 'f7', lifecycle: SdlcLifecycle.Review })),
      wrap(makeFeature({ id: 'f8', lifecycle: SdlcLifecycle.Maintain })),
    ];
    const result = buildBoardData(features);

    expect(result.get('backlog')!).toHaveLength(1);
    expect(result.get('requirements')!).toHaveLength(3);
    expect(result.get('implementation')!).toHaveLength(2);
    expect(result.get('review')!).toHaveLength(1);
    expect(result.get('done')!).toHaveLength(1);
  });

  it('derives correct state and progress for each feature', () => {
    const feature = makeFeature({
      lifecycle: SdlcLifecycle.Maintain,
    });
    const result = buildBoardData([wrap(feature)]);

    const done = result.get('done')!;
    expect(done[0].state).toBe('done');
    expect(done[0].progress).toBe(100);
  });

  it('includes agentType from agent run when present', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Implementation });
    const run = {
      agentType: 'claude-code',
      status: 'running',
    } as FeatureWithRun['run'];
    const result = buildBoardData([{ feature, run }]);

    const impl = result.get('implementation')!;
    expect(impl[0].agentType).toBe('claude-code');
  });

  it('includes error message from agent run when present', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Implementation });
    const run = {
      agentType: 'claude-code',
      status: 'failed',
      error: 'Something went wrong',
    } as FeatureWithRun['run'];
    const result = buildBoardData([{ feature, run }]);

    const impl = result.get('implementation')!;
    expect(impl[0].errorMessage).toBe('Something went wrong');
  });

  it('includes PR data when feature has a pull request', () => {
    const feature = makeFeature({
      lifecycle: SdlcLifecycle.Review,
      pr: {
        url: 'https://github.com/repo/pull/1',
        number: 1,
        status: PrStatus.Open,
        ciStatus: CiStatus.Success,
        commitHash: 'abc123',
      },
    });
    const result = buildBoardData([wrap(feature)]);

    const review = result.get('review')!;
    expect(review[0].pr).toEqual({
      url: 'https://github.com/repo/pull/1',
      number: 1,
      status: PrStatus.Open,
      ciStatus: CiStatus.Success,
      commitHash: 'abc123',
    });
  });

  it('populates lifecycle phase correctly from build-graph-nodes lifecycle mapping', () => {
    const feature = makeFeature({ lifecycle: SdlcLifecycle.Research });
    const result = buildBoardData([wrap(feature)]);

    const requirements = result.get('requirements')!;
    expect(requirements[0].lifecycle).toBe('research');
  });

  it('handles multiple features in the same column', () => {
    const features: FeatureWithRun[] = [
      wrap(makeFeature({ id: 'f1', name: 'Feature A', lifecycle: SdlcLifecycle.Requirements })),
      wrap(makeFeature({ id: 'f2', name: 'Feature B', lifecycle: SdlcLifecycle.Requirements })),
      wrap(makeFeature({ id: 'f3', name: 'Feature C', lifecycle: SdlcLifecycle.Research })),
    ];
    const result = buildBoardData(features);

    const requirements = result.get('requirements')!;
    expect(requirements).toHaveLength(3);
    expect(requirements.map((r) => r.name)).toEqual(['Feature A', 'Feature B', 'Feature C']);
  });
});
