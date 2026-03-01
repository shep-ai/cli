import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBoardState } from '@/components/features/board-view/use-board-state';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { BoardColumnId } from '@/lib/build-board-data';
import { BOARD_COLUMNS } from '@/lib/build-board-data';
import type { FilterState } from '@/hooks/use-filter-state';

// Mock next/image for agent type icons
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => props,
}));

function createFeatureData(overrides: Partial<FeatureNodeData> = {}): FeatureNodeData {
  return {
    name: 'Test Feature',
    featureId: 'feat-1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 40,
    repositoryPath: '/repo',
    branch: 'feat/test',
    ...overrides,
  };
}

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

describe('useBoardState', () => {
  it('returns 5 columns with no filters applied', () => {
    const features = [
      createFeatureData({ featureId: 'f1', lifecycle: 'requirements', name: 'Req Feature' }),
      createFeatureData({ featureId: 'f2', lifecycle: 'implementation', name: 'Impl Feature' }),
      createFeatureData({ featureId: 'f3', lifecycle: 'review', name: 'Review Feature' }),
    ];

    const { result } = renderHook(() => useBoardState({ features, filters: emptyFilters }));

    expect(result.current.columns.size).toBe(5);
    for (const col of BOARD_COLUMNS) {
      expect(result.current.columns.has(col.id)).toBe(true);
    }
  });

  it('groups features into correct columns', () => {
    const features = [
      createFeatureData({ featureId: 'f1', lifecycle: 'requirements' }),
      createFeatureData({ featureId: 'f2', lifecycle: 'implementation' }),
      createFeatureData({ featureId: 'f3', lifecycle: 'maintain' }),
    ];

    const { result } = renderHook(() => useBoardState({ features, filters: emptyFilters }));

    expect(result.current.columns.get('requirements')!.length).toBe(1);
    expect(result.current.columns.get('implementation')!.length).toBe(1);
    expect(result.current.columns.get('done')!.length).toBe(1);
    expect(result.current.columns.get('backlog')!.length).toBe(0);
    expect(result.current.columns.get('review')!.length).toBe(0);
  });

  it('applies status filter (only matching states appear)', () => {
    const features = [
      createFeatureData({ featureId: 'f1', state: 'running', lifecycle: 'implementation' }),
      createFeatureData({ featureId: 'f2', state: 'done', lifecycle: 'maintain' }),
      createFeatureData({ featureId: 'f3', state: 'error', lifecycle: 'implementation' }),
    ];

    const filters: FilterState = {
      ...emptyFilters,
      status: new Set(['running']),
    };

    const { result } = renderHook(() => useBoardState({ features, filters }));

    expect(result.current.totalCount).toBe(1);
    expect(result.current.columns.get('implementation')!.length).toBe(1);
    expect(result.current.columns.get('implementation')![0].featureId).toBe('f1');
  });

  it('applies lifecycle filter (only matching lifecycles appear)', () => {
    const features = [
      createFeatureData({ featureId: 'f1', lifecycle: 'requirements' }),
      createFeatureData({ featureId: 'f2', lifecycle: 'implementation' }),
      createFeatureData({ featureId: 'f3', lifecycle: 'review' }),
    ];

    const filters: FilterState = {
      ...emptyFilters,
      lifecycle: new Set(['implementation']),
    };

    const { result } = renderHook(() => useBoardState({ features, filters }));

    expect(result.current.totalCount).toBe(1);
    expect(result.current.columns.get('implementation')!.length).toBe(1);
  });

  it('applies combined filters (AND logic)', () => {
    const features = [
      createFeatureData({
        featureId: 'f1',
        state: 'running',
        lifecycle: 'implementation',
        agentType: 'claude-code',
      }),
      createFeatureData({
        featureId: 'f2',
        state: 'running',
        lifecycle: 'implementation',
        agentType: 'cursor',
      }),
      createFeatureData({
        featureId: 'f3',
        state: 'done',
        lifecycle: 'maintain',
        agentType: 'claude-code',
      }),
    ];

    const filters: FilterState = {
      ...emptyFilters,
      status: new Set(['running']),
      agentType: new Set(['claude-code']),
    };

    const { result } = renderHook(() => useBoardState({ features, filters }));

    expect(result.current.totalCount).toBe(1);
    expect(result.current.columns.get('implementation')![0].featureId).toBe('f1');
  });

  it('returns empty columns when all features are filtered out', () => {
    const features = [
      createFeatureData({ featureId: 'f1', state: 'running' }),
      createFeatureData({ featureId: 'f2', state: 'done' }),
    ];

    const filters: FilterState = {
      ...emptyFilters,
      status: new Set(['error']),
    };

    const { result } = renderHook(() => useBoardState({ features, filters }));

    expect(result.current.totalCount).toBe(0);
    for (const col of BOARD_COLUMNS) {
      expect(result.current.columns.get(col.id as BoardColumnId)!.length).toBe(0);
    }
  });

  it('totalCount reflects filtered count, not total', () => {
    const features = [
      createFeatureData({ featureId: 'f1', state: 'running' }),
      createFeatureData({ featureId: 'f2', state: 'done' }),
      createFeatureData({ featureId: 'f3', state: 'running' }),
    ];

    const filters: FilterState = {
      ...emptyFilters,
      status: new Set(['running']),
    };

    const { result } = renderHook(() => useBoardState({ features, filters }));

    expect(result.current.totalCount).toBe(2);
  });

  it('works with empty features array (returns 5 empty columns)', () => {
    const { result } = renderHook(() => useBoardState({ features: [], filters: emptyFilters }));

    expect(result.current.columns.size).toBe(5);
    expect(result.current.totalCount).toBe(0);
    for (const col of BOARD_COLUMNS) {
      expect(result.current.columns.get(col.id as BoardColumnId)!.length).toBe(0);
    }
  });

  it('applies repository filter', () => {
    const features = [
      createFeatureData({ featureId: 'f1', repositoryPath: '/repo/a' }),
      createFeatureData({ featureId: 'f2', repositoryPath: '/repo/b' }),
    ];

    const filters: FilterState = {
      ...emptyFilters,
      repository: new Set(['/repo/a']),
    };

    const { result } = renderHook(() => useBoardState({ features, filters }));

    expect(result.current.totalCount).toBe(1);
  });
});
