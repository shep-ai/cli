import { describe, it, expect } from 'vitest';
import { buildGraphNodes } from '@/app/build-graph-nodes';
import { SdlcLifecycle } from '@shepai/core/domain/generated/output';
import type { Feature, Repository } from '@shepai/core/domain/generated/output';

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

const makeRepo = (overrides: Partial<Repository> = {}): Repository =>
  ({
    id: 'repo-1',
    name: 'my-repo',
    path: '/my/repo',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Repository;

describe('buildGraphNodes', () => {
  describe('orphan-fallback: features with no matching repository row', () => {
    it('creates a virtual repository node when repositories is empty but features exist', () => {
      const feature = makeFeature({ repositoryPath: '/my/repo' });
      const { nodes } = buildGraphNodes([], [{ feature, run: null }]);

      const virtualNode = nodes.find((n) => n.id === 'virtual-repo-/my/repo');
      expect(virtualNode).toBeDefined();
      expect(virtualNode?.type).toBe('repositoryNode');
    });

    it('creates a feature node under the virtual repository', () => {
      const feature = makeFeature({ repositoryPath: '/my/repo' });
      const { nodes, edges } = buildGraphNodes([], [{ feature, run: null }]);

      expect(nodes.find((n) => n.id === 'feat-feat-1')).toBeDefined();
      // Edge connects virtual repo to feature
      const edge = edges.find(
        (e) => e.source === 'virtual-repo-/my/repo' && e.target === 'feat-feat-1'
      );
      expect(edge).toBeDefined();
    });

    it('derives virtual repository name from the last path segment', () => {
      const feature = makeFeature({ repositoryPath: '/home/user/my-project' });
      const { nodes } = buildGraphNodes([], [{ feature, run: null }]);

      const virtualNode = nodes.find((n) => n.id === 'virtual-repo-/home/user/my-project');
      expect(virtualNode).toBeDefined();
      expect((virtualNode?.data as { name: string }).name).toBe('my-project');
    });

    it('creates separate virtual nodes for features with different repository paths', () => {
      const feat1 = makeFeature({ id: 'feat-1', repositoryPath: '/repo/a' });
      const feat2 = makeFeature({ id: 'feat-2', repositoryPath: '/repo/b' });
      const { nodes } = buildGraphNodes(
        [],
        [
          { feature: feat1, run: null },
          { feature: feat2, run: null },
        ]
      );

      expect(nodes.find((n) => n.id === 'virtual-repo-/repo/a')).toBeDefined();
      expect(nodes.find((n) => n.id === 'virtual-repo-/repo/b')).toBeDefined();
    });

    it('groups multiple features under one virtual node when they share a repository path', () => {
      const feat1 = makeFeature({ id: 'feat-1', repositoryPath: '/my/repo' });
      const feat2 = makeFeature({ id: 'feat-2', repositoryPath: '/my/repo' });
      const { nodes } = buildGraphNodes(
        [],
        [
          { feature: feat1, run: null },
          { feature: feat2, run: null },
        ]
      );

      const virtualNodes = nodes.filter((n) => n.id === 'virtual-repo-/my/repo');
      expect(virtualNodes).toHaveLength(1);
    });
  });

  describe('real repository nodes: no duplicates when repository row exists', () => {
    it('does NOT create a virtual node when a real repository row covers the feature path', () => {
      const repo = makeRepo({ path: '/my/repo' });
      const feature = makeFeature({ repositoryPath: '/my/repo' });
      const { nodes } = buildGraphNodes([repo], [{ feature, run: null }]);

      expect(nodes.find((n) => n.id === 'virtual-repo-/my/repo')).toBeUndefined();
    });

    it('does NOT duplicate the feature node when covered by a real repo', () => {
      const repo = makeRepo({ path: '/my/repo' });
      const feature = makeFeature({ repositoryPath: '/my/repo' });
      const { nodes } = buildGraphNodes([repo], [{ feature, run: null }]);

      const featureNodes = nodes.filter((n) => n.id === 'feat-feat-1');
      expect(featureNodes).toHaveLength(1);
    });

    it('renders a real repository node even when it has no features', () => {
      const repo = makeRepo({ path: '/empty/repo' });
      const { nodes } = buildGraphNodes([repo], []);

      expect(nodes.find((n) => n.id === 'repo-repo-1')).toBeDefined();
    });
  });

  describe('mixed: some features covered, some orphaned', () => {
    it('renders real repo for covered path and virtual repo for orphaned path', () => {
      const repo = makeRepo({ id: 'repo-1', path: '/real/repo' });
      const coveredFeature = makeFeature({ id: 'feat-1', repositoryPath: '/real/repo' });
      const orphanFeature = makeFeature({ id: 'feat-2', repositoryPath: '/orphan/repo' });

      const { nodes } = buildGraphNodes(
        [repo],
        [
          { feature: coveredFeature, run: null },
          { feature: orphanFeature, run: null },
        ]
      );

      expect(nodes.find((n) => n.id === 'repo-repo-1')).toBeDefined();
      expect(nodes.find((n) => n.id === 'virtual-repo-/orphan/repo')).toBeDefined();
      expect(nodes.find((n) => n.id === 'virtual-repo-/real/repo')).toBeUndefined();
    });
  });

  describe('empty inputs', () => {
    it('returns empty nodes and edges when both inputs are empty', () => {
      const { nodes, edges } = buildGraphNodes([], []);
      expect(nodes).toHaveLength(0);
      expect(edges).toHaveLength(0);
    });
  });
});
