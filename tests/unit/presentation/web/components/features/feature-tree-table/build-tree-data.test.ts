import { describe, it, expect } from 'vitest';
import { buildTreeData } from '@/components/features/feature-tree-table';
import type { FeatureTreeRow } from '@/components/features/feature-tree-table';

function makeRow(overrides: Partial<FeatureTreeRow> & { id: string }): FeatureTreeRow {
  return {
    name: `Feature ${overrides.id}`,
    status: 'pending',
    lifecycle: 'Planning',
    branch: `feat/${overrides.id}`,
    repositoryName: 'test-repo',
    ...overrides,
  };
}

describe('buildTreeData', () => {
  it('returns empty array for empty input', () => {
    const tree = buildTreeData([]);
    expect(tree).toEqual([]);
  });

  it('wraps single-repo features in a repo group', () => {
    const data = [
      makeRow({ id: 'a', repositoryName: 'my-app' }),
      makeRow({ id: 'b', repositoryName: 'my-app' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    expect(tree[0]._isRepoGroup).toBe(true);
    expect(tree[0].name).toBe('my-app');
    expect(tree[0]._children).toHaveLength(2);
    expect(tree[0]._children![0].id).toBe('a');
    expect(tree[0]._children![1].id).toBe('b');
  });

  it('groups features by repository when multiple repos exist', () => {
    const data = [
      makeRow({ id: 'feat-1', repositoryName: 'app-a' }),
      makeRow({ id: 'feat-2', repositoryName: 'app-b' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(2);
    expect(tree[0]._isRepoGroup).toBe(true);
    expect(tree[0].name).toBe('app-a');
    expect(tree[0]._children).toHaveLength(1);
    expect(tree[0]._children![0].id).toBe('feat-1');

    expect(tree[1]._isRepoGroup).toBe(true);
    expect(tree[1].name).toBe('app-b');
    expect(tree[1]._children).toHaveLength(1);
    expect(tree[1]._children![0].id).toBe('feat-2');
  });

  it('nests child under parent within a repo group', () => {
    const data = [
      makeRow({ id: 'parent', repositoryName: 'my-app' }),
      makeRow({ id: 'child', parentId: 'parent', repositoryName: 'my-app' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    expect(tree[0]._isRepoGroup).toBe(true);
    expect(tree[0]._children).toHaveLength(1);
    expect(tree[0]._children![0].id).toBe('parent');
    expect(tree[0]._children![0]._children).toHaveLength(1);
    expect(tree[0]._children![0]._children![0].id).toBe('child');
  });

  it('supports multi-level nesting within a repo', () => {
    const data = [
      makeRow({ id: 'root', repositoryName: 'my-app' }),
      makeRow({ id: 'child', parentId: 'root', repositoryName: 'my-app' }),
      makeRow({ id: 'grandchild', parentId: 'child', repositoryName: 'my-app' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    const repoGroup = tree[0];
    expect(repoGroup._children).toHaveLength(1);
    expect(repoGroup._children![0]._children).toHaveLength(1);
    expect(repoGroup._children![0]._children![0]._children).toHaveLength(1);
    expect(repoGroup._children![0]._children![0]._children![0].id).toBe('grandchild');
  });

  it('treats orphaned children as roots when parent is missing', () => {
    const data = [
      makeRow({ id: 'orphan', parentId: 'nonexistent', repositoryName: 'my-app' }),
      makeRow({ id: 'root', repositoryName: 'my-app' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    expect(tree[0]._isRepoGroup).toBe(true);
    expect(tree[0]._children).toHaveLength(2);
  });

  it('handles multiple children under one parent', () => {
    const data = [
      makeRow({ id: 'parent', repositoryName: 'my-app' }),
      makeRow({ id: 'child-1', parentId: 'parent', repositoryName: 'my-app' }),
      makeRow({ id: 'child-2', parentId: 'parent', repositoryName: 'my-app' }),
      makeRow({ id: 'child-3', parentId: 'parent', repositoryName: 'my-app' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    const repoGroup = tree[0];
    expect(repoGroup._children).toHaveLength(1);
    expect(repoGroup._children![0]._children).toHaveLength(3);
  });

  it('preserves parent-child nesting within multi-repo groups', () => {
    const data = [
      makeRow({ id: 'parent-a', repositoryName: 'app-a' }),
      makeRow({ id: 'child-a', parentId: 'parent-a', repositoryName: 'app-a' }),
      makeRow({ id: 'feat-b', repositoryName: 'app-b' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(2);
    // First repo group
    expect(tree[0]._isRepoGroup).toBe(true);
    expect(tree[0].name).toBe('app-a');
    expect(tree[0]._children).toHaveLength(1);
    expect(tree[0]._children![0].id).toBe('parent-a');
    expect(tree[0]._children![0]._children).toHaveLength(1);
    expect(tree[0]._children![0]._children![0].id).toBe('child-a');
    // Second repo group
    expect(tree[1]._isRepoGroup).toBe(true);
    expect(tree[1]._children).toHaveLength(1);
    expect(tree[1]._children![0].id).toBe('feat-b');
  });
});
