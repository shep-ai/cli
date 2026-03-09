import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useState } from 'react';
import { parseMaps, useGraphDerivedState, type GraphCallbacks } from '@/hooks/use-graph-state';
import type { GraphDerivedState } from '@/hooks/use-graph-state';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { FeatureEntry } from '@/lib/derive-graph';
import type { Edge } from '@xyflow/react';

// --- Test fixtures ---

const makeFeatureNode = (
  id: string,
  repositoryPath = '/repo',
  overrides: Partial<FeatureNodeData> = {}
): FeatureNodeType => ({
  id,
  type: 'featureNode',
  position: { x: 0, y: 0 },
  data: {
    name: 'Test Feature',
    featureId: id,
    lifecycle: 'requirements',
    state: 'running',
    progress: 0,
    repositoryPath,
    branch: 'feat/test',
    ...overrides,
  },
});

const makeRepoNode = (id: string, repositoryPath = '/repo'): RepositoryNodeType => ({
  id,
  type: 'repositoryNode',
  position: { x: 0, y: 0 },
  data: { name: 'my-repo', repositoryPath, id: id.replace('repo-', '') },
});

// --- Test harness for useGraphDerivedState ---

function DerivedHarness({
  serverNodes,
  serverEdges,
  initialPending,
  onState,
}: {
  serverNodes: CanvasNodeType[];
  serverEdges: Edge[];
  initialPending?: Map<string, FeatureEntry>;
  onState?: (
    s: GraphDerivedState & {
      setPendingMap: React.Dispatch<React.SetStateAction<Map<string, FeatureEntry>>>;
    }
  ) => void;
}) {
  const { featureMap, repoMap } = parseMaps(serverNodes, serverEdges);
  const [pendingMap, setPendingMap] = useState<Map<string, FeatureEntry>>(
    initialPending ?? new Map()
  );
  const callbacks: GraphCallbacks = {};
  const state = useGraphDerivedState(featureMap, repoMap, pendingMap, callbacks);
  if (onState) onState({ ...state, setPendingMap });
  return (
    <>
      <div data-testid="node-count">{state.nodes.length}</div>
      <div data-testid="edge-count">{state.edges.length}</div>
    </>
  );
}

function renderDerived(
  serverNodes: CanvasNodeType[] = [],
  serverEdges: Edge[] = [],
  initialPending?: Map<string, FeatureEntry>,
  onState?: (
    s: GraphDerivedState & {
      setPendingMap: React.Dispatch<React.SetStateAction<Map<string, FeatureEntry>>>;
    }
  ) => void
) {
  return render(
    <DerivedHarness
      serverNodes={serverNodes}
      serverEdges={serverEdges}
      initialPending={initialPending}
      onState={onState}
    />
  );
}

describe('parseMaps', () => {
  it('parses feature and repo nodes into separate Maps', () => {
    const repoNode = makeRepoNode('repo-1');
    const featureNode = makeFeatureNode('feat-abc', '/repo');

    const { featureMap, repoMap } = parseMaps([repoNode, featureNode], []);

    expect(featureMap.size).toBe(1);
    expect(featureMap.has('feat-abc')).toBe(true);
    expect(repoMap.size).toBe(1);
    expect(repoMap.has('repo-1')).toBe(true);
  });

  it('extracts parentNodeId from dependency edges', () => {
    const parent = makeFeatureNode('feat-parent', '/repo');
    const child = makeFeatureNode('feat-child', '/repo');
    const depEdge: Edge = {
      id: 'dep-feat-parent-feat-child',
      source: 'feat-parent',
      target: 'feat-child',
      type: 'dependencyEdge',
    };

    const { featureMap } = parseMaps([parent, child], [depEdge]);

    expect(featureMap.get('feat-child')?.parentNodeId).toBe('feat-parent');
    expect(featureMap.get('feat-parent')?.parentNodeId).toBeUndefined();
  });
});

describe('useGraphDerivedState', () => {
  describe('initialization', () => {
    it('initializes with features/repos and returns correct nodes/edges', () => {
      const repoNode = makeRepoNode('repo-1');
      const featureNode = makeFeatureNode('feat-abc', '/repo');
      const edge: Edge = { id: 'edge-repo-1-feat-abc', source: 'repo-1', target: 'feat-abc' };

      renderDerived([repoNode, featureNode], [edge]);

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
    });

    it('derives edges from repositoryPath matching (repo→feature)', () => {
      const repoNode = makeRepoNode('repo-1', '/my-repo');
      const featureNode = makeFeatureNode('feat-abc', '/my-repo');

      let capturedState: GraphDerivedState | null = null;
      renderDerived([repoNode, featureNode], [], undefined, (s) => {
        capturedState = s;
      });

      const edge = capturedState!.edges.find(
        (e) => e.source === 'repo-1' && e.target === 'feat-abc'
      );
      expect(edge).toBeDefined();
    });

    it('derives dependency edge from dep- prefixed initialEdge', () => {
      const parentFeature = makeFeatureNode('feat-parent', '/repo');
      const childFeature = makeFeatureNode('feat-child', '/repo');
      const repoNode = makeRepoNode('repo-1', '/repo');
      const depEdge: Edge = {
        id: 'dep-feat-parent-feat-child',
        source: 'feat-parent',
        target: 'feat-child',
        type: 'dependencyEdge',
      };

      let capturedState: GraphDerivedState | null = null;
      renderDerived([repoNode, parentFeature, childFeature], [depEdge], undefined, (s) => {
        capturedState = s;
      });

      // Child has dependency edge, no repo→child edge
      const dep = capturedState!.edges.find((e) => e.type === 'dependencyEdge');
      expect(dep).toBeDefined();
      expect(dep?.source).toBe('feat-parent');
      expect(dep?.target).toBe('feat-child');

      const repoToChild = capturedState!.edges.find(
        (e) => e.source === 'repo-1' && e.target === 'feat-child'
      );
      expect(repoToChild).toBeUndefined();
    });
  });

  describe('pending features', () => {
    it('adds pending feature → creating node with edge to repo appears', () => {
      const repoNode = makeRepoNode('repo-1', '/repo');
      const pendingMap = new Map<string, FeatureEntry>([
        [
          'feature-temp-123',
          {
            nodeId: 'feature-temp-123',
            data: {
              name: 'New Feature',
              featureId: 'feature-temp-123',
              lifecycle: 'requirements',
              state: 'creating',
              progress: 0,
              repositoryPath: '/repo',
              branch: '',
            } as FeatureNodeData,
          },
        ],
      ]);

      let capturedState: GraphDerivedState | null = null;
      renderDerived([repoNode], [], pendingMap, (s) => {
        capturedState = s;
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      const pendingNode = capturedState!.nodes.find((n) => n.id === 'feature-temp-123');
      expect(pendingNode).toBeDefined();
      expect((pendingNode?.data as FeatureNodeData).state).toBe('creating');

      const edge = capturedState!.edges.find((e) => e.target === 'feature-temp-123');
      expect(edge).toBeDefined();
      expect(edge?.source).toBe('repo-1');
    });

    it('removePendingFeature → creating node disappears', () => {
      const repoNode = makeRepoNode('repo-1', '/repo');
      const pendingMap = new Map<string, FeatureEntry>([
        [
          'feature-temp-123',
          {
            nodeId: 'feature-temp-123',
            data: {
              name: 'New Feature',
              featureId: 'feature-temp-123',
              lifecycle: 'requirements',
              state: 'creating',
              progress: 0,
              repositoryPath: '/repo',
              branch: '',
            } as FeatureNodeData,
          },
        ],
      ]);

      type CapturedState = GraphDerivedState & {
        setPendingMap: React.Dispatch<React.SetStateAction<Map<string, FeatureEntry>>>;
      };
      let capturedState: CapturedState | null = null;
      renderDerived([repoNode], [], pendingMap, (s) => {
        capturedState = s;
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      act(() => {
        capturedState!.setPendingMap(new Map());
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
    });
  });

  describe('server data update replaces pending with real feature', () => {
    it('re-render with server feature removes pending node', () => {
      const repoNode = makeRepoNode('repo-1', '/repo');
      const pendingMap = new Map<string, FeatureEntry>([
        [
          'feat-uuid-123',
          {
            nodeId: 'feat-uuid-123',
            data: {
              name: 'sdg',
              featureId: 'uuid-123',
              lifecycle: 'requirements',
              state: 'creating',
              progress: 0,
              repositoryPath: '/repo',
              branch: '',
            } as FeatureNodeData,
          },
        ],
      ]);

      let capturedState: GraphDerivedState | null = null;
      const { rerender } = render(
        <DerivedHarness
          serverNodes={[repoNode]}
          serverEdges={[]}
          initialPending={pendingMap}
          onState={(s) => {
            capturedState = s;
          }}
        />
      );

      // Pending node exists
      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      // Server now has the real feature (same ID)
      const serverFeature = makeFeatureNode('feat-uuid-123', '/repo', {
        state: 'running',
        name: 'Fractal Dispatcher',
        featureId: 'uuid-123',
      });

      rerender(
        <DerivedHarness
          serverNodes={[repoNode, serverFeature]}
          serverEdges={[]}
          initialPending={pendingMap}
          onState={(s) => {
            capturedState = s;
          }}
        />
      );

      // Real feature from server takes precedence (pendingMap entry skipped for same ID)
      const featureNodes = capturedState!.nodes.filter((n) => n.id === 'feat-uuid-123');
      expect(featureNodes).toHaveLength(1);

      const data = featureNodes[0].data as FeatureNodeData;
      expect(data.name).toBe('Fractal Dispatcher');
      expect(data.state).toBe('running');
    });
  });

  describe('stable references', () => {
    it('nodes/edges have stable references when Maps do not change', () => {
      // Pre-parse Maps so they remain referentially stable across renders
      const repoNode = makeRepoNode('repo-1');
      const { featureMap, repoMap } = parseMaps([repoNode], []);

      function StableHarness({ onState }: { onState: (s: GraphDerivedState) => void }) {
        const callbacks = React.useMemo<GraphCallbacks>(() => ({}), []);
        const pendingMap = React.useMemo(() => new Map<string, FeatureEntry>(), []);
        const state = useGraphDerivedState(featureMap, repoMap, pendingMap, callbacks);
        onState(state);
        return null;
      }

      let prevNodes: CanvasNodeType[] | null = null;
      let currentNodes: CanvasNodeType[] | null = null;

      const { rerender } = render(
        <StableHarness
          onState={(s) => {
            prevNodes = currentNodes;
            currentNodes = s.nodes;
          }}
        />
      );

      rerender(
        <StableHarness
          onState={(s) => {
            prevNodes = currentNodes;
            currentNodes = s.nodes;
          }}
        />
      );

      // nodes should be the same reference (useMemo not re-ran)
      expect(currentNodes).toBe(prevNodes);
    });
  });
});
